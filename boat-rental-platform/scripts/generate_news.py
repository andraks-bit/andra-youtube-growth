#!/usr/bin/env python3
"""
generate_news.py — daily newsroom publisher for boathire24.com/news

Two tracks, tried in order:

  Track 1 (sourced)  Discover candidate stories via Google News RSS across six
                     language markets, resolve to the PUBLISHER's URL, fetch that
                     page, and write a report grounded only in its text.
                     Measured supply 2026-07-22: ~25 stories/30d.

  Track 2 (data)     Compute fleet/supply figures from Supabase in Python and
                     report a material week-on-week change. Figures come from
                     code; the model only writes prose around them.

If neither yields a publishable item, the run SKIPS the day and says so. It
never pads. A thin newsroom recovers; one caught inventing stories does not.

Usage:
    python3 scripts/generate_news.py                # publish today's item
    python3 scripts/generate_news.py --dry-run      # write nothing, print draft
    python3 scripts/generate_news.py --track data   # force the data track
"""
from __future__ import annotations

import argparse
import datetime
import email.utils
import html
import importlib.util
import json
import os
import pathlib
import re
import sys
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

from news_verify import Rejected, strip_tags, verify_data, verify_sourced  # noqa: E402

# Reuse the content pipeline's model plumbing, env loading and git helpers
# rather than maintaining a second copy of them.
_spec = importlib.util.spec_from_file_location("gc", ROOT / "scripts" / "generate_content.py")
gc = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(gc)

NEWS_STORE = ROOT / "lib" / "news" / "auto-news.json"
SOURCES_CFG = ROOT / "config" / "news_sources.json"
STATE_PATH = ROOT / "config" / "news_state.json"
LOG = ROOT / "logs" / "generate_news.log"

# Publishers routinely 403 non-browser agents, and Google's batchexecute
# handshake expects a browser too. One article fetch per day is well within
# normal reader behaviour.
UA = {
    "User-Agent": ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
                   "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"),
    "Accept-Language": "en-GB,en;q=0.9,es;q=0.8",
}

AUTHORS = [
    ("Mardo Soo", "Founder & CEO, BoatHire24"),
    ("Andra Kiirkivi", "Co-Founder, BoatHire24"),
]

HOUSE_STYLE = (
    "British English. Plain, factual newsroom register — you are reporting, not selling. "
    "Second person is banned. No marketing adjectives (stunning, unforgettable, breathtaking), "
    "no exclamation marks, no em dashes, no rhetorical questions. Short paragraphs. "
    "Never invent a fact, figure, quote, date or name."
)


def log(msg: str) -> None:
    line = f"[{datetime.datetime.now():%Y-%m-%d %H:%M:%S}] {msg}"
    print(line, flush=True)
    LOG.parent.mkdir(parents=True, exist_ok=True)
    with LOG.open("a") as fh:
        fh.write(line + "\n")


# ───────────────────────────── state ──────────────────────────────
def load_state() -> dict:
    try:
        return json.loads(STATE_PATH.read_text())
    except Exception:
        return {"covered_urls": [], "published": [], "skipped": [], "snapshots": []}


def save_state(state: dict) -> None:
    # Unbounded growth would eventually make every run read a huge file.
    state["covered_urls"] = state["covered_urls"][-800:]
    state["snapshots"] = state["snapshots"][-60:]
    STATE_PATH.write_text(json.dumps(state, ensure_ascii=False, indent=2) + "\n")


def load_store() -> list:
    try:
        return json.loads(NEWS_STORE.read_text())
    except Exception:
        return []


def slugify(text: str, maxlen: int = 70) -> str:
    import unicodedata
    t = "".join(c for c in unicodedata.normalize("NFD", text) if unicodedata.category(c) != "Mn")
    t = re.sub(r"[^a-zA-Z0-9]+", "-", t.lower()).strip("-")
    return t[:maxlen].rstrip("-")


def pick_author(slug: str) -> tuple[str, str]:
    import hashlib
    return AUTHORS[int(hashlib.sha1(slug.encode()).hexdigest(), 16) % len(AUTHORS)]


# ─────────────────────── Track 1: sourced news ────────────────────
def fetch(url: str, timeout: int = 30) -> tuple[str, str]:
    """Return (final_url, body_text). Follows redirects."""
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        raw = resp.read()
        final = resp.geturl()
    charset = "utf-8"
    m = re.search(rb'charset=["\']?([\w-]+)', raw[:3000], re.I)
    if m:
        charset = m.group(1).decode("ascii", "ignore")
    return final, raw.decode(charset, errors="replace")


def resolve_publisher_url(item_link: str, description_html: str) -> str | None:
    """
    Recover the publisher's own URL from a Google News RSS link.

    Google no longer redirects these and no longer encodes the target in the
    article id — the destination is only obtainable by replaying the page's
    signed request against the DotsSplashUi batchexecute endpoint. Cheaper
    routes are tried first, and the whole thing is best-effort: if Google
    changes the handshake, resolution fails, Track 1 yields nothing, and the
    run falls through to the data track rather than publishing something
    unverified.
    """
    # 1. Occasionally the description carries a direct publisher link.
    m = re.search(r'href="(https?://(?!news\.google\.com)[^"]+)"', description_html or "")
    if m:
        return html.unescape(m.group(1))

    # 2. Plain redirect, for any legacy-format items still in the feed.
    try:
        final, page = fetch(item_link, timeout=25)
        if "news.google.com" not in final:
            return final
    except Exception:
        return None

    # 3. Signed batchexecute handshake.
    try:
        sig = re.search(r'data-n-a-sg="([^"]+)"', page)
        ts = re.search(r'data-n-a-ts="([^"]+)"', page)
        if not (sig and ts):
            return None
        aid = item_link.rsplit("/", 1)[-1].split("?")[0]
        inner = json.dumps(["garturlreq",
                            [["X", "X", ["X", "X"], None, None, 1, 1, "US:en", None, 1,
                              None, None, None, None, None, 0, 1],
                             "X", "X", 1, [1, 1, 1], 1, 1, None, 0, 0, None, 0],
                            aid, int(ts.group(1)), sig.group(1)])
        body = urllib.parse.urlencode(
            {"f.req": json.dumps([[["Fbv4je", inner, None, "1"]]])}).encode()
        req = urllib.request.Request(
            "https://news.google.com/_/DotsSplashUi/data/batchexecute", data=body,
            headers={**UA, "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"})
        raw = urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "replace")
        hit = re.search(r'"(https?://(?!news\.google)[^"\\]+)', raw)
        if not hit:
            return None
        # The response is JSON-encoded, so slashes arrive escaped and the match
        # can run up to a stray backslash. Left in place it produces a citation
        # URL with a trailing "\" that looks broken to a reader.
        return hit.group(1).replace("\\/", "/").rstrip("\\").rstrip("/") or None
    except Exception:
        return None


def article_text(page_html: str) -> str:
    """Extract body prose. Paragraph tags are a good enough signal for news pages."""
    paras = re.findall(r"<p\b[^>]*>(.*?)</p>", page_html, flags=re.S | re.I)
    text = " ".join(strip_tags(html.unescape(p)) for p in paras)
    return re.sub(r"\s+", " ", text).strip()


TOPIC_STOP = {
    "the", "and", "for", "with", "from", "that", "this", "has", "have", "its", "are", "was",
    "new", "after", "over", "into", "amid", "says", "will", "more", "than", "como", "los",
    "las", "por", "para", "que", "del", "una", "uno", "con", "como", "mas", "spain", "spanish",
    "marina", "marinas", "port", "ports", "puerto", "puertos", "deportivo", "deportivos",
    "boat", "boats", "yacht", "yachts", "charter",
}


def _topic_tokens(text: str) -> set[str]:
    return {w for w in re.findall(r"[a-zA-ZÀ-ÿ]{4,}", (text or "").lower()) if w not in TOPIC_STOP}


def is_topical_duplicate(title: str, published: list[dict], threshold: float = 0.34) -> str | None:
    """
    Reject a candidate that retells a story already in the newsroom.

    Source-URL dedupe is not enough: the same event gets covered by several
    outlets, so the same story arrives via different links on consecutive days
    and would otherwise be republished under a new slug.

    Overlap is measured by CONTAINMENT (against the smaller token set), not
    against the candidate alone — a prior article's standfirst inflates its
    token count and would otherwise dilute a genuine match below any threshold.
    A shared distinctive entity (a place name appearing in few other articles)
    is treated as a match on its own, since that is what actually identifies a
    repeated story.
    """
    cand = _topic_tokens(title)
    if len(cand) < 3:
        return None

    # Tokens appearing across many articles are beat vocabulary, not identity.
    corpus = [_topic_tokens(f"{a.get('title','')} {a.get('standfirst','')}") for a in published]
    common = {t for t in set().union(*corpus) if sum(t in c for c in corpus) > max(1, len(corpus) // 3)} if corpus else set()

    today = datetime.date.today()
    for art, prior in zip(published, corpus):
        if not prior:
            continue
        shared = cand & prior
        if not shared:
            continue
        if len(shared) / min(len(cand), len(prior)) >= threshold:
            return art.get("slug")
        distinctive = shared - common
        if len(distinctive) >= 2:
            return art.get("slug")
        # A single shared distinctive entity (usually a marina or town name) is
        # only evidence of duplication while the story is live. The same event
        # reaches us via several outlets within days, whereas a genuine
        # follow-up about the same marina months later is a different story and
        # must not be blocked.
        if distinctive:
            try:
                age = (today - datetime.date.fromisoformat(art["datePublished"][:10])).days
            except Exception:
                age = 999
            if age <= 14:
                return art.get("slug")
    return None


def section_for(title: str, cfg: dict) -> str:
    for rule in cfg.get("section_rules", []):
        if re.search(rule["match"], title, re.I):
            return rule["section"]
    return cfg.get("default_section", "Charter market")


def discover(cfg: dict, state: dict) -> list[dict]:
    """Candidate stories, freshest first, excluding anything already covered."""
    keep = re.compile(cfg["relevance_terms"], re.I)
    covered = set(state["covered_urls"])
    now = datetime.datetime.now(datetime.timezone.utc)
    out, seen = [], set()

    for mkt in cfg["markets"]:
        for q in mkt["queries"]:
            url = (f"https://news.google.com/rss/search?q={urllib.parse.quote(q)}"
                   f"&hl={mkt['hl']}&gl={mkt['gl']}&ceid={mkt['ceid']}")
            try:
                root = ET.fromstring(urllib.request.urlopen(
                    urllib.request.Request(url, headers=UA), timeout=30).read())
            except Exception as e:
                log(f"  discovery failed [{mkt['lang']}] {q[:30]}: {type(e).__name__}")
                continue

            for it in root.findall(".//item"):
                title = (it.findtext("title") or "").strip()
                link = (it.findtext("link") or "").strip()
                if not title or not link or link in seen or link in covered:
                    continue
                if not keep.search(title):
                    continue
                try:
                    age = (now - email.utils.parsedate_to_datetime(it.findtext("pubDate"))).days
                except Exception:
                    continue
                if age > cfg["max_age_days"]:
                    continue
                seen.add(link)
                out.append({
                    "title": title, "link": link, "age": age, "lang": mkt["lang"],
                    "description": it.findtext("description") or "",
                    "publisher": (it.findtext("source") or "").strip(),
                })

    out.sort(key=lambda c: c["age"])
    # NB: blocked_domains is applied to the RESOLVED publisher URL in
    # track_sourced(), not here — every RSS link is a news.google.com redirect,
    # so filtering on it at this stage discards the entire feed.
    return out


def write_sourced(cand: dict, source_url: str, source_text: str, cfg: dict) -> dict:
    publisher = cand["publisher"] or urllib.parse.urlparse(source_url).netloc.replace("www.", "")
    system = (
        "You are a news reporter for BoatHire24's newsroom, covering boat charter, marinas and "
        "maritime regulation for a professional audience.\n\n"
        "ABSOLUTE RULE: the SOURCE TEXT below is your ONLY factual basis. Every fact, figure, name, "
        "date and place in your article must be present in it. If the source does not say something, "
        "you do not write it. Do not add background from your own knowledge. Do not estimate. "
        "Do not invent quotes. If the source is too thin to support a report, return "
        '{"insufficient": true}.\n\n'
        "Do not copy sentences from the source; report the facts in your own words.\n\n"
        f"STYLE: {HOUSE_STYLE}"
    )
    user = (
        f"SOURCE ({publisher}, {source_url}):\n\"\"\"\n{source_text[:9000]}\n\"\"\"\n\n"
        "Write a news report as STRICT JSON:\n"
        '{"title":"<=100 chars, factual headline, no clickbait",'
        '"standfirst":"one sentence, <=200 chars, what happened and why it matters",'
        '"metaDescription":"<=155 chars",'
        '"content":"<p>…</p> HTML body, 300-450 words, 2-3 <h2> subheads, no images, no links",'
        '"why_it_matters":"one sentence on the charter-market relevance"}\n\n'
        f"Attribute claims to {publisher} in the prose where natural. Return JSON only."
    )

    data = gc.extract_json(gc.call_model(system, user, timeout_s=300))
    if data.get("insufficient"):
        raise Rejected("model judged the source too thin to report")

    title = data["title"].strip()
    slug = slugify(title)
    now = datetime.datetime.now(datetime.timezone.utc).astimezone()
    author, _role = pick_author(slug)

    content = gc.clean_html(data["content"])
    if data.get("why_it_matters"):
        content += (f'\n<h2>Why it matters for charter</h2>\n<p>'
                    f'{html.escape(data["why_it_matters"].strip())}</p>')

    return {
        "slug": slug,
        "title": title,
        "standfirst": data["standfirst"].strip(),
        "metaDescription": (data.get("metaDescription") or data["standfirst"]).strip()[:155],
        "section": section_for(cand["title"], cfg),
        "datePublished": now.isoformat(timespec="seconds"),
        "dateModified": now.isoformat(timespec="seconds"),
        "author": author,
        "heroImage": gc.pick_hero(cand["title"]),
        "content": content,
        "sources": [{"title": cand["title"], "url": source_url, "publisher": publisher}],
    }


def track_sourced(cfg: dict, state: dict, existing_slugs: set, dry: bool,
                  published: list[dict] | None = None) -> dict | None:
    published = published or []
    cands = discover(cfg, state)
    log(f"Track 1: {len(cands)} fresh candidate(s) within {cfg['max_age_days']}d")

    # Gate rejections are normal, not exceptional — a fair number of candidates
    # get discarded for thin sources or ungrounded figures, so try a decent
    # spread before conceding the day to the data track.
    for cand in cands[:12]:
        log(f"  trying [{cand['lang']}, {cand['age']}d] {cand['title'][:70]}")
        dupe = is_topical_duplicate(cand["title"], published)
        if dupe:
            log(f"    ✗ already covered by /news/{dupe[:50]}")
            state["covered_urls"].append(cand["link"])
            continue
        src_url = resolve_publisher_url(cand["link"], cand["description"])
        if not src_url:
            log("    ✗ could not resolve publisher URL")
            continue
        if any(b in src_url for b in cfg.get("blocked_domains", [])):
            log(f"    ✗ blocked domain: {urllib.parse.urlparse(src_url).netloc}")
            state["covered_urls"].append(cand["link"])
            continue
        try:
            src_url, page = fetch(src_url)
            text = article_text(page)
        except Exception as e:
            log(f"    ✗ fetch failed: {type(e).__name__}")
            continue
        if len(text) < cfg["min_source_chars"]:
            log(f"    ✗ source too thin ({len(text)} chars)")
            continue

        try:
            article = write_sourced(cand, src_url, text, cfg)
            verify_sourced(article, text, existing_slugs)
        except Rejected as e:
            log(f"    ✗ rejected: {e}")
            state["covered_urls"].append(cand["link"])  # don't retry a bad candidate daily
            continue
        except Exception as e:
            log(f"    ✗ generation error: {type(e).__name__}: {str(e)[:140]}")
            continue

        log(f"    ✓ passed all gates: {article['slug']}")
        if not dry:
            state["covered_urls"].append(cand["link"])
        return article

    return None


# ─────────────────────── Track 2: first-party data ────────────────
def _supabase_env() -> tuple[str, str]:
    """
    generate_content.load_env() only promotes an allowlist of keys, and the
    Supabase pair isn't on it — so read .env.local directly rather than relying
    on os.environ being populated.
    """
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
    key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")
    if url and key:
        return url, key
    for p in (ROOT / ".env.local", ROOT / ".env"):
        if not p.exists():
            continue
        for line in p.read_text().splitlines():
            if "=" not in line or line.strip().startswith("#"):
                continue
            k, v = line.split("=", 1)
            v = v.strip().strip('"').strip("'")
            if k.strip() == "NEXT_PUBLIC_SUPABASE_URL" and not url:
                url = v
            elif k.strip() == "NEXT_PUBLIC_SUPABASE_ANON_KEY" and not key:
                key = v
    if not url or not key:
        raise RuntimeError("Supabase credentials not found in environment or .env.local")
    return url.rstrip("/"), key


def db(query: str):
    url, key = _supabase_env()
    req = urllib.request.Request(f"{url}/rest/v1/{query}",
                                 headers={"apikey": key, "Authorization": f"Bearer {key}"})
    return json.load(urllib.request.urlopen(req, timeout=45))


def snapshot() -> dict:
    """Live fleet metrics, computed here in Python so the figures are ours."""
    boats = db("boats?select=id,length_m,type,includes_skipper,instant_book,"
               "locations(city,country)&status=eq.active&limit=5000")
    # Day rates live in boat_pricing, not on the boat row. Take full-day entries
    # so the median compares like with like rather than mixing 2h and 8h prices.
    pricing = db("boat_pricing?select=boat_id,price,duration_days,duration_hours,currency&limit=20000")
    active_ids = {b["id"] for b in boats}
    prices = [
        float(p["price"]) for p in pricing
        if p.get("boat_id") in active_ids
        and isinstance(p.get("price"), (int, float)) and p["price"] > 0
        and (p.get("duration_days") == 1 or p.get("duration_hours") in (8, 9, 10))
        and (p.get("currency") or "EUR").upper() == "EUR"
    ]

    countries, types = {}, {}
    lengths = []
    skipper = instant = 0
    for b in boats:
        loc = b.get("locations") or {}
        c = (loc.get("country") or "").strip()
        if c:
            countries[c] = countries.get(c, 0) + 1
        t = (b.get("type") or "").strip().lower()
        if t:
            types[t] = types.get(t, 0) + 1
        if isinstance(b.get("length_m"), (int, float)) and b["length_m"] > 0:
            lengths.append(float(b["length_m"]))
        skipper += 1 if b.get("includes_skipper") else 0
        instant += 1 if b.get("instant_book") else 0

    def median(xs):
        return round(sorted(xs)[len(xs) // 2], 1) if xs else 0

    total = len(boats)
    return {
        "date": datetime.date.today().isoformat(),
        "boats": total,
        "countries": len(countries),
        "by_country": dict(sorted(countries.items(), key=lambda kv: -kv[1])[:12]),
        "by_type": dict(sorted(types.items(), key=lambda kv: -kv[1])[:8]),
        "median_price": median(prices),
        "median_length": median(lengths),
        "skipper_pct": round(100 * skipper / total) if total else 0,
        "instant_pct": round(100 * instant / total) if total else 0,
    }


def material_change(now: dict, prev: dict) -> list[str]:
    """
    What actually moved. If nothing did, there is no story and we skip — this is
    the check that stops the data track becoming the same article every week.
    """
    changes = []
    if abs(now["boats"] - prev["boats"]) >= 5:
        changes.append(f"fleet {prev['boats']} -> {now['boats']} listings")
    if now["countries"] != prev["countries"]:
        changes.append(f"countries {prev['countries']} -> {now['countries']}")
    for c, n in now["by_country"].items():
        p = prev["by_country"].get(c, 0)
        if n - p >= 4:
            changes.append(f"{c} supply {p} -> {n}")
    if abs(now["median_price"] - prev["median_price"]) >= 25:
        changes.append(f"median day rate {prev['median_price']} -> {now['median_price']} EUR")
    for k, label in (("skipper_pct", "skippered share"), ("instant_pct", "instant-book share")):
        if abs(now[k] - prev[k]) >= 2:
            changes.append(f"{label} {prev[k]}% -> {now[k]}%")
    return changes


def track_data(state: dict, existing_slugs: set, dry: bool) -> dict | None:
    try:
        now = snapshot()
    except Exception as e:
        log(f"Track 2: snapshot failed: {type(e).__name__}: {str(e)[:140]}")
        return None

    snaps = state.get("snapshots", [])
    prior = [s for s in snaps if (datetime.date.fromisoformat(now["date"])
                                  - datetime.date.fromisoformat(s["date"])).days >= 7]
    if not prior:
        log("Track 2: no baseline snapshot 7+ days old — recording one, nothing to report yet")
        if not dry:
            state.setdefault("snapshots", []).append(now)
        return None

    prev = prior[-1]
    changes = material_change(now, prev)
    if not changes:
        log("Track 2: nothing moved materially since the last snapshot — no story")
        if not dry:
            state["snapshots"].append(now)
        return None

    log(f"Track 2: {len(changes)} material change(s): {'; '.join(changes[:3])}")
    period = f"{prev['date']} to {now['date']}"
    figures = {
        "boats_now": now["boats"], "boats_prev": prev["boats"],
        "countries_now": now["countries"], "countries_prev": prev["countries"],
        "median_price_now": now["median_price"], "median_price_prev": prev["median_price"],
        "median_length": now["median_length"],
        "skipper_pct_now": now["skipper_pct"], "skipper_pct_prev": prev["skipper_pct"],
        "instant_pct_now": now["instant_pct"], "instant_pct_prev": prev["instant_pct"],
    }

    system = (
        "You are a data reporter for BoatHire24's newsroom. You are given figures computed from "
        "BoatHire24's own live marketplace database.\n\n"
        "ABSOLUTE RULE: use ONLY the figures provided. Do not compute new percentages, do not "
        "estimate, do not add industry context or comparisons from your own knowledge, do not "
        "speculate about causes as if they were established. You may say a change is consistent "
        "with seasonality, clearly framed as interpretation.\n\n"
        "Be explicit that this describes BoatHire24's own listings, not the whole market.\n\n"
        f"STYLE: {HOUSE_STYLE}"
    )
    user = (
        f"PERIOD: {period}\nFIGURES: {json.dumps(figures)}\n"
        f"SUPPLY BY COUNTRY (now): {json.dumps(now['by_country'])}\n"
        f"BY BOAT TYPE (now): {json.dumps(now['by_type'])}\n"
        f"NOTABLE CHANGES: {'; '.join(changes)}\n\n"
        "Write a short data report as STRICT JSON:\n"
        '{"title":"<=100 chars, states the finding",'
        '"standfirst":"one sentence, <=200 chars",'
        '"metaDescription":"<=155 chars",'
        '"content":"<p>…</p> HTML, 300-420 words, 2 <h2> subheads, no images, no links"}\n\n'
        "Return JSON only."
    )

    data = gc.extract_json(gc.call_model(system, user, timeout_s=300))
    title = data["title"].strip()
    slug = slugify(f"{title}-{now['date']}")
    ts = datetime.datetime.now(datetime.timezone.utc).astimezone().isoformat(timespec="seconds")
    author, _ = pick_author(slug)

    content = gc.clean_html(data["content"]) + (
        '\n<h2>How these figures were produced</h2>\n<p>Figures are counted directly from '
        f'BoatHire24 active listings on {now["date"]} and compared with {prev["date"]}. They '
        'describe listings on this platform only and are not a measure of the wider charter '
        'market.</p>')

    article = {
        "slug": slug,
        "title": title,
        "standfirst": data["standfirst"].strip(),
        "metaDescription": (data.get("metaDescription") or data["standfirst"]).strip()[:155],
        "section": "Charter market",
        "datePublished": ts,
        "dateModified": ts,
        "author": author,
        "heroImage": gc.pick_hero("yacht marina fleet"),
        "content": content,
        "sources": [{
            "title": f"BoatHire24 live listings data, {period}",
            "url": "https://boathire24.com/search",
            "publisher": "BoatHire24",
        }],
    }
    verify_data(article, figures, existing_slugs)
    if not dry:
        state["snapshots"].append(now)
    return article


# ───────────────────────────── main ───────────────────────────────
def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--track", choices=["sourced", "data", "auto"], default="auto")
    ap.add_argument("--no-push", action="store_true")
    args = ap.parse_args()

    log(f"=== Newsroom run (track={args.track}{', dry-run' if args.dry_run else ''}) ===")
    cfg = json.loads(SOURCES_CFG.read_text())
    state = load_state()
    store = load_store()
    existing = {a["slug"] for a in store}

    article = None
    if args.track in ("auto", "sourced"):
        article = track_sourced(cfg, state, existing, args.dry_run, published=store)
    if article is None and args.track in ("auto", "data"):
        try:
            article = track_data(state, existing, args.dry_run)
        except Rejected as e:
            log(f"Track 2 rejected: {e}")

    if article is None:
        # The designed outcome on a dry day. Padding here is what would sink the section.
        log("NO STORY TODAY — skipping rather than padding")
        if not args.dry_run:
            state.setdefault("skipped", []).append(datetime.date.today().isoformat())
            save_state(state)
        log("=== Done: 0 published ===\n")
        return 0

    if args.dry_run:
        log("--- DRY RUN DRAFT ---")
        print(json.dumps({k: v for k, v in article.items() if k != "content"}, indent=2))
        print(article["content"][:1200])
        return 0

    store.insert(0, article)
    NEWS_STORE.write_text(json.dumps(store, ensure_ascii=False, indent=2) + "\n")
    state.setdefault("published", []).append(
        {"slug": article["slug"], "date": article["datePublished"], "section": article["section"]})
    save_state(state)
    log(f"PUBLISHED: /news/{article['slug']} ({article['section']}, by {article['author']})")

    if not args.no_push:
        if gc.git_push(f"Newsroom: {article['title'][:60]}"):
            gc.ping_reindex()

    log("=== Done: 1 published ===\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
