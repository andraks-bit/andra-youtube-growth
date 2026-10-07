#!/usr/bin/env python3
"""Fill the content queue with REAL boat-rental keywords from DataForSEO.

Replaces LLM topic-invention (which drifted off-topic) with keywords that have
actual search volume. Seeds DataForSEO Labs "keyword ideas" with boat/yacht
rental terms, filters to on-topic + min volume, dedupes against existing slugs,
and appends queue items to config/content_queue.json.

Auth (Basic) in .env.local:
  DATAFORSEO_LOGIN=you@example.com
  DATAFORSEO_PASSWORD=your_api_password

Usage:
  python3 scripts/dataforseo_keywords.py --check
  python3 scripts/dataforseo_keywords.py --limit 120        # add up to N queue items
  python3 scripts/dataforseo_keywords.py --limit 120 --min-volume 50
"""
from __future__ import annotations
import argparse, base64, datetime, json, os, pathlib, re, sys, urllib.request, urllib.error

ROOT = pathlib.Path(__file__).resolve().parents[1]
QUEUE = ROOT / "config" / "content_queue.json"
BLOG = ROOT / "lib" / "blog" / "auto-posts.json"
LAND = ROOT / "lib" / "landing" / "auto-landing.json"
QUAR = ROOT / "lib" / "landing" / "quarantine-landing.json"
LOG = ROOT / "logs" / "dataforseo.log"
LOG.parent.mkdir(exist_ok=True)

# Seed terms (global boat-rental intent). DataForSEO expands each into ideas.
_BASE = [
    "boat rental", "yacht charter", "boat hire", "catamaran charter",
    "yacht rental", "sailboat rental", "speedboat hire", "boat rental near me",
    "luxury yacht charter", "fishing charter", "party boat rental",
    "pontoon boat rental", "jet ski rental", "sunset boat trip",
]
# Top global charter destinations — seed "boat rental <place>" / "yacht charter <place>"
_PLACES = [
    "marbella", "ibiza", "mallorca", "barcelona", "miami", "cancun", "dubai",
    "mykonos", "santorini", "athens", "split", "dubrovnik", "cannes", "nice",
    "amalfi", "naples", "capri", "sardinia", "malta", "tenerife", "phuket",
    "bali", "maldives", "tulum", "key west", "fort lauderdale", "san diego",
    "lake como", "amsterdam", "lisbon", "algarve", "corfu", "bodrum", "monaco",
]
SEEDS = _BASE + [f"boat rental {p}" for p in _PLACES] + [f"yacht charter {p}" for p in _PLACES]

# RENTAL-INTENT gate: must express renting/chartering/hiring a vessel.
# (Just "contains boat" let in cruises, sales, games, news — too loose.)
RENT = re.compile(r"\b(rent|rental|rentals|hire|charter|chartering)\b", re.I)
VESSEL = re.compile(r"\b(boat|boats|yacht|yachts|catamaran|catamarans|sailboat|"
                    r"sailing boat|speedboat|speed boat|pontoon|jet ?ski|dinghy|"
                    r"motorboat|motor yacht|gulet|houseboat)\b", re.I)
# Reject off-intent even if RENT+VESSEL present.
BLOCK = re.compile(r"\b(cruise|royal caribbean|carnival|norwegian|trader|for sale|"
                   r"used|buy|sell|loan|finance|insurance|repair|paint|parts|"
                   r"job|jobs|salary|game|games|tiny fishing|fresh off the boat|"
                   r"sunken|ramp|license test|licence test|toy|rc|remote control|"
                   r"show|episode|movie|song|lyrics|stardew|simulator)\b", re.I)

def is_rental_kw(kw: str) -> bool:
    if BLOCK.search(kw):
        return False
    # must mention a vessel AND rental intent (e.g. "yacht charter marbella",
    # "boat rental miami", "catamaran hire ibiza")
    return bool(VESSEL.search(kw) and RENT.search(kw))

# All matched keywords are commercial rental intent -> landing pages.
COMMERCIAL = re.compile(r".", re.I)


def log(m: str):
    line = f"[{datetime.datetime.now():%Y-%m-%d %H:%M:%S}] {m}"
    print(line, flush=True)
    with LOG.open("a") as f:
        f.write(line + "\n")


def load_env():
    for p in (ROOT / ".env.local", ROOT / ".env"):
        if p.exists():
            for line in p.read_text().splitlines():
                for k in ("DATAFORSEO_LOGIN", "DATAFORSEO_PASSWORD"):
                    if line.startswith(k + "=") and not os.environ.get(k):
                        os.environ[k] = line.split("=", 1)[1].strip().strip('"').strip("'")


def auth() -> str:
    u, p = os.environ.get("DATAFORSEO_LOGIN", ""), os.environ.get("DATAFORSEO_PASSWORD", "")
    return "Basic " + base64.b64encode(f"{u}:{p}".encode()).decode()


def api(path: str, payload: list) -> dict:
    req = urllib.request.Request(
        f"https://api.dataforseo.com/v3/{path}",
        data=json.dumps(payload).encode(),
        headers={"Authorization": auth(), "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=90) as r:
        return json.loads(r.read())


def fetch_ideas(seed: str, limit: int, min_vol: int) -> list[dict]:
    """DataForSEO Labs Google 'keyword ideas' for a seed term (worldwide-ish:
    location_code 2840=US as a broad proxy; volume is a relative signal)."""
    payload = [{
        "keywords": [seed],
        "location_code": 2840,
        "language_code": "en",
        "limit": limit,
        "order_by": ["keyword_info.search_volume,desc"],
    }]
    out = []
    try:
        data = api("dataforseo_labs/google/keyword_ideas/live", payload)
        tasks = data.get("tasks") or []
        for t in tasks:
            for res in (t.get("result") or []):
                for it in (res.get("items") or []):
                    kw = it.get("keyword", "")
                    vol = ((it.get("keyword_info") or {}).get("search_volume")) or 0
                    if vol < min_vol:
                        continue
                    if not is_rental_kw(kw):
                        continue
                    out.append({"keyword": kw, "volume": vol})
    except urllib.error.HTTPError as e:
        log(f"  seed '{seed}': HTTP {e.code} {e.read().decode()[:120]}")
    except Exception as e:
        log(f"  seed '{seed}': {type(e).__name__}: {str(e)[:120]}")
    return out


def fetch_volumes(keywords: list, min_vol: int) -> list[dict]:
    """Exact search volume for a constructed keyword list (geo combos).
    Guarantees on-topic geo coverage instead of relying on 'ideas' expansion."""
    out = []
    # Google Ads search_volume accepts up to 1000 keywords per task.
    for i in range(0, len(keywords), 700):
        chunk = keywords[i:i + 700]
        payload = [{"keywords": chunk, "language_code": "en", "location_code": 2840}]
        try:
            data = api("keywords_data/google_ads/search_volume/live", payload)
            for t in (data.get("tasks") or []):
                for it in (t.get("result") or []):
                    kw = it.get("keyword", "")
                    vol = it.get("search_volume") or 0
                    if vol >= min_vol and is_rental_kw(kw):
                        out.append({"keyword": kw, "volume": vol})
        except urllib.error.HTTPError as e:
            log(f"  volume chunk: HTTP {e.code} {e.read().decode()[:120]}")
        except Exception as e:
            log(f"  volume chunk: {type(e).__name__}: {str(e)[:120]}")
    return out


def geo_keyword_candidates() -> list:
    patterns = ["boat rental {p}", "yacht charter {p}", "boat hire {p}",
                "catamaran charter {p}", "yacht rental {p}", "boat rental in {p}"]
    return [pat.format(p=p) for p in _PLACES for pat in patterns]


def slugify(kw: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", kw.lower()).strip("-")
    return re.sub(r"-{2,}", "-", s)[:70]


def titleize(kw: str) -> str:
    return " ".join(w.capitalize() if w.islower() else w for w in kw.split())[:65]


def existing_slugs() -> set:
    s = set()
    for f in (BLOG, LAND, QUAR):
        try:
            for it in json.loads(f.read_text()):
                s.add(it.get("slug"))
        except Exception:
            pass
    try:
        cfg = json.loads(QUEUE.read_text())
        for src in (cfg.get("queue", []), cfg.get("consumed", [])):
            for it in src:
                s.add(it.get("slug"))
    except Exception:
        pass
    return s


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=120, help="max queue items to add")
    ap.add_argument("--min-volume", type=int, default=30)
    ap.add_argument("--check", action="store_true")
    args = ap.parse_args()
    load_env()

    if not os.environ.get("DATAFORSEO_LOGIN") or not os.environ.get("DATAFORSEO_PASSWORD"):
        log("DataForSEO: DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD not set in .env.local — skipped.")
        return 0

    if args.check:
        try:
            d = api("appendix/user_data", [])
            bal = (((d.get("tasks") or [{}])[0].get("result") or [{}])[0].get("money") or {}).get("balance")
            log(f"DataForSEO: connected. balance={bal}")
        except Exception as e:
            log(f"DataForSEO: connection FAILED: {str(e)[:160]}")
        return 0

    seen = existing_slugs()
    pool: dict[str, dict] = {}

    # (A) Direct geo volume lookup — guarantees on-topic global coverage.
    geo = geo_keyword_candidates()
    log(f"DataForSEO: looking up volume for {len(geo)} geo keyword candidates (min_vol={args.min_volume})")
    for row in fetch_volumes(geo, args.min_volume):
        slug = slugify(row["keyword"])
        if slug and slug not in seen and slug not in pool:
            pool[slug] = row

    # (B) Idea expansion from base seeds — catches phrasing we didn't construct.
    per_seed = 40
    log(f"DataForSEO: expanding ideas from {len(_BASE)} base seeds")
    for seed in _BASE:
        for row in fetch_ideas(seed, per_seed, args.min_volume):
            slug = slugify(row["keyword"])
            if slug and slug not in seen and slug not in pool:
                pool[slug] = row

    # rank by volume, take top N
    ranked = sorted(pool.items(), key=lambda kv: kv[1]["volume"], reverse=True)[:args.limit]

    # Informational rental queries -> blog; pure transactional -> landing.
    INFO = re.compile(r"\b(how|what|best|guide|tips|vs|cost|price|worth|need|"
                      r"licen[sc]e|when|where|cheap)\b", re.I)
    items = []
    for slug, row in ranked:
        kw = row["keyword"]
        kind = "blog" if INFO.search(kw) else "landing"
        items.append({
            "kind": kind, "slug": slug,
            "primary_keyword": kw,
            "title": titleize(kw) + (" | BoatHire24" if kind == "landing" else ""),
            "target_words": 2200,
            "search_volume": row["volume"],
        })

    cfg = json.loads(QUEUE.read_text())
    cfg.setdefault("queue", []).extend(items)
    QUEUE.write_text(json.dumps(cfg, ensure_ascii=False, indent=2) + "\n")
    nb = sum(1 for i in items if i["kind"] == "blog")
    nl = sum(1 for i in items if i["kind"] == "landing")
    log(f"DataForSEO: added {len(items)} queue items ({nl} landing, {nb} blog). Queue now {len(cfg['queue'])}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
