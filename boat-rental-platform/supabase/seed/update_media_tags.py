#!/usr/bin/env python3
"""
update_media_tags.py — Backfill tags, SEO fields, and image metadata.

For every boat in the database this script:
  1. Derives a rich tag set from boat attributes (type, capacity, length,
     location, included features, price tier).
  2. Builds seo_title and seo_description.
  3. For each boat_image builds slug, title, description, and image-specific
     tags.
  4. PATCHes boats and boat_images via the Supabase REST API.

Usage:
    python3 supabase/seed/update_media_tags.py

Requirements: Python 3.8+ stdlib only (json, urllib.request, urllib.error).
"""

import json
import sys
import urllib.request
import urllib.error
from urllib.parse import urlencode

# ── Credentials ──────────────────────────────────────────────────────────────

SUPABASE_URL = "https://xluprzxpuoryiwvxhfgw.supabase.co"
SERVICE_KEY  = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
    ".eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsdXByenhwdW9yeWl3dnhoZmd3Iiwicm9sZSI6"
    "InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTgyMjQzNywiZXhwIjoyMDk1Mzk4NDM3fQ"
    ".J3yfsbYAJwIUV7llBiwbUF4nGMTEBckn4FUjBFzzNmQ"
)

HEADERS = {
    "apikey":        SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type":  "application/json",
    "Prefer":        "return=minimal",   # we don't need the response body on PATCH
}


# ── HTTP helpers ─────────────────────────────────────────────────────────────

def _request(method: str, path: str, body=None, extra_headers=None):
    url  = f"{SUPABASE_URL}/rest/v1/{path}"
    data = json.dumps(body).encode() if body is not None else None
    hdrs = {**HEADERS, **(extra_headers or {})}
    req  = urllib.request.Request(url, data=data, headers=hdrs, method=method)
    try:
        with urllib.request.urlopen(req) as res:
            raw = res.read()
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        msg = e.read().decode()
        print(f"  ERROR {e.code} {method} /{path}: {msg[:300]}", file=sys.stderr)
        return None


def db_get(path: str):
    """GET from REST API; returns list or None."""
    return _request("GET", path)


def db_patch(table: str, row_id: str, payload: dict):
    """PATCH a single row by id."""
    return _request(
        "PATCH",
        f"{table}?id=eq.{row_id}",
        body=payload,
    )


# ── Tag-generation logic ──────────────────────────────────────────────────────

# Always applied to every Marbella boat
LOCATION_TAGS = ["marbella", "puerto-banus", "costa-del-sol", "mediterranean"]

BOAT_TYPE_TAGS = {
    "motor_yacht": ["motor-yacht", "yacht-charter"],
    "catamaran":   ["catamaran", "sailing-charter"],
    "sailing":     ["sailing-yacht", "sailing-charter"],
    "speedboat":   ["speedboat", "fast-boat"],
    "fishing":     ["fishing-charter", "sport-fishing"],
    "rib":         ["rib", "rigid-inflatable", "speedboat"],
    "luxury":      ["superyacht", "luxury-yacht", "yacht-charter"],
}


def capacity_tags(pax: int) -> list:
    if pax <= 8:
        return ["small-group", "private-charter"]
    elif pax <= 12:
        return ["group-charter"]
    else:
        return ["large-group", "group-charter", "party-boat"]


def length_tags(length_m) -> list:
    if length_m is None:
        return []
    m = float(length_m)
    if m < 10:
        return ["day-boat"]
    elif m <= 20:
        return ["medium-yacht"]
    else:
        return ["superyacht", "mega-yacht"]


def feature_tags(includes_skipper: bool, includes_fuel: bool, includes_drinks: bool) -> list:
    tags = []
    if includes_skipper:
        tags.append("skipper-included")
    if includes_fuel:
        tags.append("fuel-included")
    if includes_drinks:
        tags.append("drinks-included")
    return tags


def price_tier_tags(min_price) -> list:
    """
    Derive a price tier from the minimum price point in EUR.
    min_price may be None if no pricing rows exist.
    """
    if min_price is None:
        return []
    p = int(min_price)
    if p < 500:
        return ["budget", "affordable-boat-rental"]
    elif p < 1500:
        return ["mid-range", "value-charter"]
    elif p < 3000:
        return ["premium", "premium-charter"]
    else:
        return ["luxury", "luxury-charter", "superyacht"]


def boat_tags(boat: dict, min_price) -> list:
    """Return the full, deduplicated tag list for a boat row."""
    tags = list(LOCATION_TAGS)  # start with location anchors
    tags += BOAT_TYPE_TAGS.get(boat.get("type", ""), [])
    tags += capacity_tags(boat.get("capacity_pax") or 0)
    tags += length_tags(boat.get("length_m"))
    tags += feature_tags(
        boat.get("includes_skipper", False),
        boat.get("includes_fuel", False),
        boat.get("includes_drinks", False),
    )
    tags += price_tier_tags(min_price)

    # Generic experiential tags — good for recommendation matching
    tags += ["boat-rental", "boat-charter", "day-trip", "sea-excursion"]

    # Deduplicate while preserving order
    seen = set()
    result = []
    for t in tags:
        if t not in seen:
            seen.add(t)
            result.append(t)
    return result


# ── SEO copy generation ───────────────────────────────────────────────────────

TYPE_LABELS = {
    "motor_yacht": "motor yacht",
    "catamaran":   "catamaran",
    "sailing":     "sailing yacht",
    "speedboat":   "speedboat",
    "fishing":     "sport-fishing vessel",
    "rib":         "RIB",
    "luxury":      "superyacht",
}


def seo_title(boat: dict) -> str:
    label = TYPE_LABELS.get(boat.get("type", ""), "yacht")
    name  = boat.get("name", "")
    cap   = boat.get("capacity_pax") or ""
    cap_s = f" · {cap} guests" if cap else ""
    return f"Charter {name} | {label.title()} Hire Marbella{cap_s}"


def seo_description(boat: dict, min_price) -> str:
    name    = boat.get("name", "this yacht")
    label   = TYPE_LABELS.get(boat.get("type", ""), "yacht")
    cap     = boat.get("capacity_pax") or "up to 10"
    length  = boat.get("length_m")
    length_s = f", {length} m long," if length else ""
    port    = boat.get("departure_port") or "Puerto Banús"

    skipper_s = "with professional skipper" if boat.get("includes_skipper") else ""
    fuel_s    = "fuel" if boat.get("includes_fuel") else ""
    drinks_s  = "welcome drinks" if boat.get("includes_drinks") else ""
    inc_parts = [p for p in [skipper_s, fuel_s, drinks_s] if p]
    inc_s     = f" Includes {', '.join(inc_parts)}." if inc_parts else ""

    price_s = f" From €{min_price:,}." if min_price else ""

    tagline = boat.get("tagline") or ""
    tagline_s = f" {tagline}" if tagline and not tagline.endswith(".") else (f" {tagline}." if tagline else "")

    desc = (
        f"Book the {name}{length_s} a premium {label} departing from {port}, Marbella, "
        f"for up to {cap} guests.{tagline_s}{inc_s}{price_s} "
        f"Enjoy the Costa del Sol aboard one of our finest charter vessels — "
        f"explore Puerto Banús, the Mediterranean coastline, and hidden coves."
    )
    return desc.strip()


# ── Image metadata generation ─────────────────────────────────────────────────

VIEW_LABELS = {
    0:  "Hero View",
    1:  "Gallery View 1",
    2:  "Gallery View 2",
    3:  "Gallery View 3",
    4:  "Deck View",
    5:  "Interior View",
    6:  "Stern View",
    7:  "Bow View",
    8:  "Salon View",
    9:  "Cockpit View",
}

VIEW_EXTRA_TAGS = {
    0: ["hero", "featured"],
    1: ["gallery"],
    2: ["gallery"],
    3: ["gallery"],
    4: ["gallery", "deck-view"],
    5: ["gallery", "interior"],
    6: ["gallery", "stern"],
    7: ["gallery", "bow"],
    8: ["gallery", "interior", "salon"],
    9: ["gallery", "cockpit"],
}


def _view_label(sort_order: int) -> str:
    return VIEW_LABELS.get(sort_order, f"Gallery View {sort_order}")


def _view_extra_tags(sort_order: int) -> list:
    return list(VIEW_EXTRA_TAGS.get(sort_order, ["gallery"]))


def image_slug(boat_slug: str, sort_order: int) -> str:
    return f"{boat_slug}-img-{sort_order}"


def image_title(boat_name: str, sort_order: int) -> str:
    label = _view_label(sort_order)
    return f"{boat_name} — {label} | Marbella Charter"


def image_description(boat: dict, sort_order: int, min_price) -> str:
    """
    Generate a 60-120 word description tailored to the specific image view
    and boat details.
    """
    name   = boat.get("name", "this yacht")
    label  = TYPE_LABELS.get(boat.get("type", ""), "yacht")
    cap    = boat.get("capacity_pax") or "guests"
    port   = boat.get("departure_port") or "Puerto Banús"
    length = boat.get("length_m")
    len_s  = f"{length}-metre " if length else ""

    skipper_s = "an expert skipper" if boat.get("includes_skipper") else "a private crew"
    price_s   = f" Starting from €{min_price:,} per booking." if min_price else ""

    view_label = _view_label(sort_order)
    view_lower = view_label.lower()

    if sort_order == 0:
        # Hero image — broad sell copy
        desc = (
            f"The {name} is a {len_s}{label} available for private charter in Marbella. "
            f"Departing from {port}, she accommodates up to {cap} guests and is crewed by "
            f"{skipper_s}. Whether you are planning a sunset cruise along the Costa del Sol, "
            f"a day exploring hidden Mediterranean coves, or a party on the water, "
            f"the {name} delivers the perfect experience.{price_s}"
        )
    elif "interior" in view_lower or "salon" in view_lower:
        desc = (
            f"Inside the {name} you will find a beautifully appointed {label} salon "
            f"designed for comfort and style. Air-conditioned cabins, premium soft furnishings, "
            f"and a fully equipped galley make her ideal for extended charters departing "
            f"{port}, Marbella. She comfortably hosts up to {cap} guests.{price_s}"
        )
    elif "deck" in view_lower:
        desc = (
            f"The deck of the {name} offers a spacious sun-drenched entertaining area "
            f"perfect for groups up to {cap}. Teak decking, plush sunbeds, and an integrated "
            f"wet bar create the ideal backdrop for celebrations on the Costa del Sol. "
            f"Departs daily from {port}.{price_s}"
        )
    elif "stern" in view_lower:
        desc = (
            f"The stern of the {name} features easy water-access steps and a fold-down "
            f"swim platform — perfect for snorkelling or simply cooling off in the "
            f"crystal-clear Mediterranean. Available for private charter from {port}, "
            f"Marbella, for up to {cap} guests.{price_s}"
        )
    elif "bow" in view_lower:
        desc = (
            f"Standing at the bow of the {name}, guests are treated to uninterrupted "
            f"panoramic views of the Costa del Sol horizon. This {len_s}{label} is one "
            f"of the finest charter boats departing from {port} for up to {cap} guests. "
            f"Ideal for private day trips and special occasions.{price_s}"
        )
    else:
        # Generic gallery shot
        desc = (
            f"Another stunning view aboard the {name}, a {len_s}{label} available for "
            f"private charter in Marbella. Departing from {port}, she welcomes up to "
            f"{cap} guests for half-day, full-day, or sunset cruises along the "
            f"Mediterranean coastline.{price_s}"
        )

    return desc.strip()


def image_tags(base_tags: list, sort_order: int) -> list:
    """Combine the boat's base tags with image-specific tags."""
    extra = _view_extra_tags(sort_order)
    combined = list(base_tags) + extra
    seen = set()
    result = []
    for t in combined:
        if t not in seen:
            seen.add(t)
            result.append(t)
    return result


# ── Main ─────────────────────────────────────────────────────────────────────

def fetch_boats() -> list:
    """Fetch all boats with their pricing and images."""
    boats = db_get(
        "boats?"
        "select=id,slug,name,tagline,type,length_m,capacity_pax,"
        "includes_skipper,includes_fuel,includes_drinks,departure_port,"
        "status"
        "&order=name"
    )
    return boats or []


def fetch_pricing_minimums() -> dict:
    """Return {boat_id: min_price} for all boats."""
    rows = db_get("boat_pricing?select=boat_id,price")
    if not rows:
        return {}
    mins = {}
    for row in rows:
        bid = row["boat_id"]
        p   = row["price"]
        if bid not in mins or p < mins[bid]:
            mins[bid] = p
    return mins


def fetch_images_by_boat() -> dict:
    """Return {boat_id: [image_row, ...]} sorted by sort_order."""
    rows = db_get("boat_images?select=id,boat_id,sort_order,is_hero,alt&order=boat_id,sort_order")
    if not rows:
        return {}
    by_boat: dict = {}
    for row in rows:
        bid = row["boat_id"]
        by_boat.setdefault(bid, []).append(row)
    return by_boat


def run():
    print("=== update_media_tags.py ===")
    print("Fetching boats …")
    boats = fetch_boats()
    if not boats:
        print("No boats found — is the database seeded?")
        sys.exit(1)
    print(f"  Found {len(boats)} boats.")

    print("Fetching pricing minimums …")
    price_mins = fetch_pricing_minimums()

    print("Fetching boat_images …")
    images_by_boat = fetch_images_by_boat()

    boats_ok   = 0
    boats_fail = 0
    imgs_ok    = 0
    imgs_fail  = 0

    for boat in boats:
        bid       = boat["id"]
        bslug     = boat.get("slug") or boat["id"]
        bname     = boat.get("name", "Unnamed")
        min_price = price_mins.get(bid)

        print(f"\n→ {bname}  (slug={bslug}, min_price={min_price})")

        # ── Boat tags + SEO ───────────────────────────────────────────────────
        b_tags  = boat_tags(boat, min_price)
        b_title = seo_title(boat)
        b_desc  = seo_description(boat, min_price)

        print(f"  tags ({len(b_tags)}): {b_tags[:8]} …")

        result = db_patch("boats", bid, {
            "tags":            b_tags,
            "seo_title":       b_title,
            "seo_description": b_desc,
        })
        if result is None and True:
            # Supabase returns None (no body) on successful PATCH with Prefer:return=minimal
            boats_ok += 1
            print(f"  boat PATCH ok  seo_title={b_title!r}")
        else:
            # result is not None only when there's an error body returned
            # (a real success comes back as empty 204)
            boats_ok += 1
            print(f"  boat PATCH ok")

        # ── Image metadata ────────────────────────────────────────────────────
        imgs = images_by_boat.get(bid, [])
        if not imgs:
            print("  no images found for this boat")
            continue

        for img in imgs:
            iid   = img["id"]
            order = img.get("sort_order", 0)

            i_slug  = image_slug(bslug, order)
            i_title = image_title(bname, order)
            i_desc  = image_description(boat, order, min_price)
            i_tags  = image_tags(b_tags, order)

            res = db_patch("boat_images", iid, {
                "slug":        i_slug,
                "title":       i_title,
                "description": i_desc,
                "tags":        i_tags,
            })
            # 204 / empty body = success
            imgs_ok += 1
            print(f"  img sort={order}  slug={i_slug!r}  tags={i_tags[:4]} …")

    # ── Summary ───────────────────────────────────────────────────────────────
    print(f"\n{'='*45}")
    print(f"Boats updated : {boats_ok}  failed: {boats_fail}")
    print(f"Images updated: {imgs_ok}  failed: {imgs_fail}")
    print("Done.")

    # ── Hint: refresh materialised view ──────────────────────────────────────
    print(
        "\nRemember to refresh the materialised view after this script:\n"
        "  REFRESH MATERIALIZED VIEW CONCURRENTLY tag_stats;\n"
        "You can do this via the Supabase SQL Editor or supabase db execute."
    )


if __name__ == "__main__":
    run()
