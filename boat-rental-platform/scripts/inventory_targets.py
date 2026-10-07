#!/usr/bin/env python3
"""inventory_targets.py — rank destinations by REAL boat inventory vs current
landing-page coverage, so the content generator targets where we actually have
supply instead of over-saturating Marbella.

Read-only: queries Supabase with the anon key and reads the landing JSON. Writes
a ranked target list to config/brain/inventory_targets.json for generate_content.py
to consume. Run standalone to inspect:  python3 scripts/inventory_targets.py
"""
import json, os, re, pathlib, urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent

def load_env():
    env = {}
    for p in (ROOT / ".env.local", ROOT / ".env", pathlib.Path.home() / "boat-rental-marbella" / ".env"):
        if p.exists():
            for line in p.read_text().splitlines():
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    env.setdefault(k, v.strip().strip('"').strip("'"))
    return env

ENV = load_env()
URL = ENV["NEXT_PUBLIC_SUPABASE_URL"]
KEY = ENV["NEXT_PUBLIC_SUPABASE_ANON_KEY"]

def db(q):
    req = urllib.request.Request(f"{URL}/rest/v1/{q}", headers={"apikey": KEY, "Authorization": f"Bearer {KEY}"})
    return json.load(urllib.request.urlopen(req, timeout=40))

def deaccent(s):
    import unicodedata
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")

def norm(s):
    return re.sub(r"[^a-z0-9]+", " ", deaccent((s or "").lower())).strip()

def pretty_city(c):
    return (c or "").split(",")[0].strip() or (c or "").strip()

# ── real inventory: boats grouped by cleaned city ────────────────────────────
boats = db("boats?select=location_id,locations(slug,city,country)&status=eq.active&limit=5000")
cities = {}  # key: normed city token -> {display, country, boats, slugs:set}
for b in boats:
    loc = b.get("locations") or {}
    city = pretty_city(loc.get("city"))
    tok = norm(city)
    if len(tok) < 4:
        continue
    e = cities.setdefault(tok, {"display": city, "country": loc.get("country", ""), "boats": 0, "loc_slugs": set()})
    e["boats"] += 1
    if loc.get("slug"):
        e["loc_slugs"].add(loc["slug"])

# ── current landing coverage: count landing pages targeting each city ─────────
landing_slugs = []
for f in ("lib/landing/auto-landing.json", "lib/landing/auto-landing-es.json"):
    p = ROOT / f
    if p.exists():
        try:
            for row in json.loads(p.read_text()):
                landing_slugs.append(norm(f"{row.get('slug','')} {row.get('keyword','')}"))
        except Exception:
            pass
# curated pages.ts slugs (rough grep — enough for a coverage estimate)
pt = ROOT / "lib/landing/pages.ts"
if pt.exists():
    for m in re.finditer(r"slug:\s*'([a-z0-9-]+)'", pt.read_text()):
        landing_slugs.append(norm(m.group(1)))

def coverage(tok):
    needle = f" {tok} "
    return sum(1 for h in landing_slugs if needle in f" {h} ")

# A city name is "generatable" only if it reads like a real place — not a leftover
# geocoded address fragment. The junk ones are pending the location normalizer
# (scripts/normalize-locations.mjs --apply); after it runs they reappear clean.
JUNK = {"marina", "harbour", "harbor", "port", "deportivo", "departure", "club",
        "point", "international", "boat", "no", "obala", "puerto", "via", "parc"}
def generatable(name, country=""):
    if not re.fullmatch(r"[A-Za-zÀ-ÿ' .\-]{3,22}", name or ""):
        return False
    toks = norm(name).split()
    if set(toks) & JUNK or any(ch.isdigit() for ch in name):
        return False
    if "and" in toks:                                   # "mykonos and Chios"
        return False
    ctoks = norm(country).split()
    if ctoks and toks and toks[-1] == ctoks[-1]:        # "Hvr Croatia" (name + country)
        return False
    return True

# ── rank: high boats + low coverage = highest opportunity ─────────────────────
rows = []
for tok, e in cities.items():
    cov = coverage(tok)
    # opportunity: boats carry the weight; coverage discounts it.
    opportunity = round(e["boats"] / (cov + 1), 2)
    rows.append({
        "city": e["display"], "country": e["country"], "token": tok,
        "boats": e["boats"], "landing_pages": cov, "opportunity": opportunity,
        "generatable": generatable(e["display"], e["country"]),
        "location_slugs": sorted(e["loc_slugs"]),
    })
rows.sort(key=lambda r: (-r["opportunity"], -r["boats"]))

out_dir = ROOT / "config" / "brain"
out_dir.mkdir(parents=True, exist_ok=True)
(out_dir / "inventory_targets.json").write_text(json.dumps(rows, ensure_ascii=False, indent=2) + "\n")

print(f"{'CITY':22} {'COUNTRY':16} {'BOATS':>5} {'PAGES':>5} {'OPP':>7} GEN")
print("-" * 64)
for r in rows[:25]:
    print(f"{r['city'][:22]:22} {r['country'][:16]:16} {r['boats']:5d} {r['landing_pages']:5d} {r['opportunity']:7.1f}  {'✓' if r['generatable'] else '·'}")

gen_now = [r for r in rows if r["generatable"] and r["boats"] >= 4 and r["landing_pages"] <= 2]
pending = [r for r in rows if not r["generatable"] and r["boats"] >= 5 and r["landing_pages"] <= 2]
print(f"\n→ {len(rows)} inventory cities.")
print(f"GENERATABLE NOW (clean name, >=4 boats, <=2 pages): {len(gen_now)}")
for r in gen_now:
    print(f"   ✓ {r['city']} ({r['country']}) — {r['boats']} boats, {r['landing_pages']} pages")
print(f"\nPENDING NORMALIZER (garbage city name, >=5 boats): {len(pending)} — run normalize-locations.mjs --apply first")
for r in pending:
    print(f"   · {r['city'][:44]} — {r['boats']} boats")
print(f"\nwrote {out_dir / 'inventory_targets.json'}")
