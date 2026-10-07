#!/usr/bin/env python3
"""
Marbella fleet seed — runs directly against Supabase REST API.
Usage: python3 supabase/seed/run_seed.py
"""
import json, sys, urllib.request, urllib.error
import os
if not os.environ.get("SUPABASE_SERVICE_ROLE_KEY"):
    try:
        for _l in open(os.path.join(os.path.dirname(__file__), "..", "..", ".env.local")):
            if _l.startswith("SUPABASE_SERVICE_ROLE_KEY"):
                os.environ["SUPABASE_SERVICE_ROLE_KEY"] = _l.split("=", 1)[1].strip().strip(chr(34)).strip(chr(39)); break
    except Exception:
        pass

SUPABASE_URL = "https://xluprzxpuoryiwvxhfgw.supabase.co"
SERVICE_KEY  = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

HEADERS = {
    "apikey":        SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type":  "application/json",
    "Prefer":        "return=representation",
}

def req(method, path, body=None):
    url  = f"{SUPABASE_URL}/rest/v1/{path}"
    data = json.dumps(body).encode() if body else None
    r    = urllib.request.Request(url, data=data, headers=HEADERS, method=method)
    try:
        with urllib.request.urlopen(r) as res:
            return json.loads(res.read())
    except urllib.error.HTTPError as e:
        msg = e.read().decode()
        print(f"  ERROR {e.code} {method} {path}: {msg[:200]}")
        return None

def auth_req(method, path, body=None):
    url  = f"{SUPABASE_URL}/auth/v1/{path}"
    data = json.dumps(body).encode() if body else None
    r    = urllib.request.Request(url, data=data, headers=HEADERS, method=method)
    try:
        with urllib.request.urlopen(r) as res:
            return json.loads(res.read())
    except urllib.error.HTTPError as e:
        msg = e.read().decode()
        # If user already exists, that's fine
        if "already" in msg.lower() or "exists" in msg.lower():
            return {"exists": True}
        print(f"  AUTH ERROR {e.code}: {msg[:200]}")
        return None

# ── Load source data ────────────────────────────────────────────────────────
with open("/Users/master/boat-rental-marbella/config/boats.json") as f:
    source = json.load(f)

boats_json   = source["boats"]
tiers        = source["hourly_price_tiers"]
shared_feats = source["shared_inclusions"]

TIER_PRICES = {
    "tier_a": [
        {"duration_hours": 2, "price": 749},
        {"duration_hours": 3, "price": 1049},
        {"duration_hours": 4, "price": 1299},
        {"duration_hours": 5, "price": 1549},
        {"duration_hours": 6, "price": 1799},
        {"duration_hours": 7, "price": 2099},
        {"duration_hours": 8, "price": 2299},
    ],
    "tier_b":     [{"duration_hours": 8, "price": 4719}],
    "entry":      [
        {"duration_hours": 2, "price": 230},
        {"duration_hours": 3, "price": 280},
        {"duration_hours": 4, "price": 350},
    ],
    "on_request": [],
}

TYPE_MAP = {
    "Motor yacht":   "motor_yacht",
    "Catamaran":     "catamaran",
    "Sailing yacht": "sailing",
    "Speedboat":     "speedboat",
    "Sport-fishing": "fishing",
    "RIB":           "rib",
    "Luxury":        "luxury",
}

def pexels_url(pid, w=1200):
    return f"https://images.pexels.com/photos/{pid}/pexels-photo-{pid}.jpeg?auto=compress&cs=tinysrgb&w={w}"

# ── 1. Create operator auth user ────────────────────────────────────────────
print("1. Creating operator account…")
OPERATOR_EMAIL = "hello@boatrentalinmarbella.com"
user_res = auth_req("POST", "admin/users", {
    "email":            OPERATOR_EMAIL,
    "password":         "BoatAway2026!",
    "email_confirm":    True,
    "user_metadata":    {"full_name": "BoatAway Marbella"},
})

if user_res and not user_res.get("exists"):
    HOST_ID = user_res["id"]
    print(f"   Created user {HOST_ID}")
else:
    # User already exists — fetch by email
    users_res = auth_req("GET", f"admin/users?email={OPERATOR_EMAIL}")
    if users_res and isinstance(users_res, dict) and "users" in users_res:
        HOST_ID = users_res["users"][0]["id"]
    else:
        # Try fetching from profiles table
        p = req("GET", f"profiles?select=id&limit=1")
        HOST_ID = p[0]["id"] if p else None
    print(f"   Using existing user {HOST_ID}")

if not HOST_ID:
    print("ERROR: Could not get host user ID")
    sys.exit(1)

# ── 2. Upsert location ──────────────────────────────────────────────────────
print("2. Upserting Marbella location…")
loc_res = req("POST", "locations?on_conflict=slug", [{
    "slug":         "marbella",
    "name":         "Marbella",
    "city":         "Marbella",
    "country":      "Spain",
    "country_code": "ES",
    "lat":          36.5108,
    "lng":          -4.8850,
    "description":  "Puerto Banús — the heart of the Costa del Sol charter scene. Year-round sunshine, flat Mediterranean waters, and a backdrop of the Sierra Blanca mountains.",
    "image_url":    pexels_url("1001682"),
    "is_featured":  True,
}])
LOCATION_ID = loc_res[0]["id"] if loc_res else None
print(f"   Location ID: {LOCATION_ID}")

# ── 3. Ensure host profile exists ───────────────────────────────────────────
print("3. Upserting host profile…")
req("POST", "profiles?on_conflict=id", [{
    "id":        HOST_ID,
    "full_name": "BoatAway Marbella",
    "bio":       "Official BoatAway fleet operator in Marbella. 17 vessels, all departing Puerto Banús.",
    "host_since": "2020-01-01T00:00:00Z",
}])

# ── 4. Seed boats ───────────────────────────────────────────────────────────
print(f"4. Seeding {len(boats_json)} boats…")
ok = 0
for b in boats_json:
    slug      = b["slug"]
    boat_type = TYPE_MAP.get(b.get("type", "Motor yacht"), "motor_yacht")
    tier      = b.get("tier", "tier_a")
    pexels_id = b.get("hero_pexels_id", "1001682")

    print(f"   → {b['name']} ({tier})", end="", flush=True)

    # Insert boat
    boat_row = req("POST", "boats?on_conflict=slug", [{
        "host_id":             HOST_ID,
        "location_id":         LOCATION_ID,
        "slug":                slug,
        "name":                b["name"],
        "tagline":             b.get("tagline", ""),
        "description":         b.get("summary", ""),
        "type":                boat_type,
        "length_m":            b.get("length_m"),
        "capacity_pax":        b.get("capacity_pax", 10),
        "builder":             b.get("builder"),
        "model_year":          b.get("model_year"),
        "departure_port":      b.get("departure_port", "Puerto Banús"),
        "marina_lat":          36.4878,
        "marina_lng":          -4.9442,
        "includes_skipper":    True,
        "includes_fuel":       True,
        "includes_drinks":     True,
        "min_hours":           2,
        "pricing_type":        "hourly" if tier != "tier_b" else "hourly",
        "instant_book":        True,
        "cancellation_policy": "flexible",
        "status":              "active",
    }])

    if not boat_row:
        print(" ✗ failed")
        continue

    BOAT_ID = boat_row[0]["id"]

    # Pricing rows
    prices = TIER_PRICES.get(tier, TIER_PRICES["tier_a"])
    if prices:
        price_rows = [{"boat_id": BOAT_ID, "duration_hours": p["duration_hours"], "price": p["price"], "currency": "EUR"} for p in prices]
        req("POST", "boat_pricing", price_rows)

    # Hero image
    req("POST", "boat_images", [{
        "boat_id":    BOAT_ID,
        "storage_url": pexels_url(pexels_id, 1200),
        "alt":        b.get("hero_local_alt", b["name"]),
        "sort_order": 0,
        "is_hero":    True,
    }])

    # Gallery images
    gallery_ids = b.get("gallery_pexels", [])
    for i, gid in enumerate(gallery_ids[:3], start=1):
        req("POST", "boat_images", [{
            "boat_id":    BOAT_ID,
            "storage_url": pexels_url(gid, 1200),
            "alt":        f"{b['name']} — view {i}",
            "sort_order": i,
            "is_hero":    False,
        }])

    # Features — shared inclusions + highlights
    features = shared_feats + b.get("highlights", [])
    feat_rows = [{"boat_id": BOAT_ID, "feature": f} for f in features]
    req("POST", "boat_features", feat_rows)

    ok += 1
    print(f" ✓")

# ── 5. Summary ──────────────────────────────────────────────────────────────
print(f"\n✅ Done — {ok}/{len(boats_json)} boats seeded into Marbella fleet")
boats_check = req("GET", "boats?select=id,name,status&location_id=eq." + LOCATION_ID + "&order=name")
if boats_check:
    print(f"   Verified {len(boats_check)} active listings in DB")
