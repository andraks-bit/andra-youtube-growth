#!/usr/bin/env python3
"""Daily content generator for boathire24.com.

Produces N blog posts + N keyword landing pages per run via the local Claude CLI
(`claude -p`, uses your subscription — no API credit), appends them to the
repo's JSON content stores, then commits + pushes so Vercel auto-deploys.

Stores:
  - lib/blog/auto-posts.json      (BlogPost[]   — rendered at /blog/<slug>)
  - lib/landing/auto-landing.json (LandingPage[] — rendered at /<slug>)

Queue:
  - config/content_queue.json — {items_per_day, blog_per_day, landing_per_day,
    queue: [...], consumed: [...], refill_threshold, refill_batch}

Indexing is handled separately by the Vercel cron hitting /api/reindex
(IndexNow + Google Indexing API + sitemap ping). After a successful push this
script can optionally ping that endpoint immediately (set REINDEX_URL + CRON_SECRET).

Usage:
  python3 scripts/generate_content.py                 # use queue defaults
  python3 scripts/generate_content.py --blogs 20 --landings 20
  python3 scripts/generate_content.py --dry-run
"""
from __future__ import annotations
import argparse, datetime, hashlib, json, os, pathlib, random, re, subprocess, sys, traceback, urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
QUEUE_PATH = ROOT / "config" / "content_queue.json"
BLOG_STORE = ROOT / "lib" / "blog" / "auto-posts.json"
LANDING_STORE = ROOT / "lib" / "landing" / "auto-landing.json"
LOG_DIR = ROOT / "logs"
LOG_DIR.mkdir(exist_ok=True)
LOG_PATH = LOG_DIR / "generate_content.log"

BASE_URL = "https://boathire24.com"

HERO_IMAGES = [
    "https://images.unsplash.com/photo-1528154291023-a6525fabe5b4?w=1400&q=80",
    "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=1400&q=80",
    "https://images.unsplash.com/photo-1540946485063-a40da27545f8?w=1400&q=80",
    "https://images.unsplash.com/photo-1605281317010-fe5ffe798166?w=1400&q=80",
    "https://images.unsplash.com/photo-1559599238-308793637427?w=1400&q=80",
    "https://images.unsplash.com/photo-1505570554449-25c7d4e0b8e6?w=1400&q=80",
    "https://images.unsplash.com/photo-1473116763249-2faaef81ccda?w=1400&q=80",
]

# Bylines MUST be real, verifiable people (mirrors lib/authors.ts). Invented
# author personas are a Google News misrepresentation violation — they get a
# publication removed, not merely down-ranked. Do not add a name here that has
# no public profile to back it.
AUTHORS = [
    ("Mardo Soo", "Founder & CEO, BoatHire24"),
    ("Andra Kiirkivi", "Co-Founder, BoatHire24"),
]


def log(msg: str):
    ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{ts}] {msg}"
    print(line, flush=True)
    with LOG_PATH.open("a") as f:
        f.write(line + "\n")


# ---------- generation backend ----------
def load_env():
    wanted = ("ANTHROPIC_API_KEY", "DEEPSEEK_API_KEY", "CRON_SECRET", "REINDEX_URL",
              "BOATHIRE24_BLOGGER_ID", "BOATHIRE24_GOOGLE_CREDENTIALS",
              "DATAFORSEO_LOGIN", "DATAFORSEO_PASSWORD")
    for p in [ROOT / ".env.local", ROOT / ".env",
              pathlib.Path.home() / "boat-rental-marbella" / ".env",
              pathlib.Path.home() / "aiangels-blog" / ".env"]:
        if not p.exists():
            continue
        for line in p.read_text().splitlines():
            for k in wanted:
                if line.startswith(k + "=") and not os.environ.get(k):
                    os.environ[k] = line.split("=", 1)[1].strip().strip('"').strip("'")


load_env()
# "deepseek" = DeepSeek API (default; reliable unattended, needs DEEPSEEK_API_KEY).
# "api"      = Anthropic API (needs ANTHROPIC_API_KEY credit).
# "cli"      = local `claude -p` (subscription) — only works in an interactive env where
#              the claude CLI is on PATH, NOT from a plain LaunchAgent on this machine.
BACKEND = os.environ.get("CLAUDE_BACKEND", "deepseek")
MODEL = os.environ.get("CLAUDE_MODEL", "claude-sonnet-4-6")


def _call_cli(system: str, user: str, timeout_s: int = 600) -> str:
    full = system + "\n\n---\n\nUSER REQUEST:\n\n" + user
    proc = subprocess.run(
        ["claude", "-p", full, "--output-format", "text"],
        capture_output=True, text=True, timeout=timeout_s,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"claude CLI exit {proc.returncode}: {proc.stderr[-300:]}")
    return proc.stdout.strip()


def _call_api(system: str, user: str) -> str:
    from anthropic import Anthropic
    client = Anthropic()
    msg = client.messages.create(
        model=MODEL, max_tokens=8000,
        system=[{"type": "text", "text": system, "cache_control": {"type": "ephemeral"}}],
        messages=[{"role": "user", "content": user}],
    )
    return msg.content[0].text.strip()


def _call_deepseek(system: str, user: str, timeout_s: int = 600) -> str:
    key = os.environ.get("DEEPSEEK_API_KEY")
    if not key:
        raise RuntimeError("DEEPSEEK_API_KEY not set")
    body = json.dumps({
        "model": os.environ.get("DEEPSEEK_MODEL", "deepseek-chat"),
        "max_tokens": 8000,
        "temperature": 0.7,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    }).encode()
    req = urllib.request.Request(
        "https://api.deepseek.com/chat/completions",
        data=body,
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout_s) as r:
        data = json.loads(r.read())
    return data["choices"][0]["message"]["content"].strip()


def call_model(system: str, user: str, timeout_s: int = 600) -> str:
    if BACKEND == "deepseek":
        return _call_deepseek(system, user, timeout_s)
    if BACKEND == "cli":
        return _call_cli(system, user, timeout_s)
    return _call_api(system, user)


def extract_json(raw: str, kind: str = "object"):
    raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw, flags=re.MULTILINE).strip()
    if kind == "array":
        s, e = raw.find("["), raw.rfind("]")
    else:
        s, e = raw.find("{"), raw.rfind("}")
    if s < 0 or e <= s:
        raise RuntimeError("no JSON found in model output")
    return json.loads(raw[s:e + 1])


# ---------- prompts ----------
BRAND = """BoatHire24 (boathire24.com) is a boat-rental & yacht-charter marketplace for Marbella and the Costa del Sol, Spain.
Every charter includes a licensed skipper. Departure ports: Puerto Banús, Marbella Marina (Puerto Deportivo), Cabopino, Estepona, Sotogrande, Benalmádena.
Boat types: motor yachts, catamarans, sailing yachts, RIBs/speedboats, fishing boats, licence-free day boats, superyachts.
Local colour: Puerto Banús, La Concha mountain, Río Verde, Cala del Faro, Estepona old town, the Strait of Gibraltar (dolphins), Nerja caves."""

BANNED = [
    "that being said", "in essence", "in short", "at the end of the day", "delve into",
    "let's dive in", "in this post", "delve", "leverage", "seamless", "robust",
    "cutting-edge", "groundbreaking", "game-changing", "harness", "unleash", "empower",
    "paradigm", "synergy", "holistic", "in today's world", "when it comes to",
]

STYLE = """WRITING STYLE (follow exactly)
- Conversational, slightly cynical, second person ("you"). British English. Answer-first.
- NO exclamation points. NO em-dashes or en-dashes (use commas or full stops).
- Concrete numbers (EUR, NM, m, kts, degrees C). Never invent exact prices for specific boats; say "from around EUR X" or "price on request".
- Internal links as HTML <a href="/slug/">anchor</a>, about 1 link per 200 words (aim 6-10 links total). MUST include exactly one link to the homepage <a href="/">BoatHire24</a>, plus one to /search and one to /blog. No two links in the same paragraph.
- No fabricated testimonials or reviews. No <h1>, <html>, <head>, <body>, inline CSS, or <script>.
- BANNED phrases (never use): """ + "; ".join(BANNED) + "."

LENGTH = "LENGTH: 2000-4000 words. Hard minimum 2000 words of real body copy. Do not pad with filler; add genuinely useful sections, examples, and specifics."


def blog_system() -> str:
    return f"""You are an SEO copywriter for {BRAND}

{STYLE}

{LENGTH}

STRUCTURE
- Open with a "## The 30-second answer" TL;DR section (2-3 sentences).
- Then 6-9 <h2> sections of 250-350 words each with <p>/<ul>/<table>.
- End body with a "Common questions" section mirroring the faqs.

OUTPUT — STRICT JSON, no prose, no code fences:
{{
  "excerpt": "<150-200 chars summary>",
  "metaDescription": "<150-160 chars search/meta description: includes the primary keyword + a CTA verb>",
  "tag": "<one of: Destination guide | Boat review | How-to | Seasonal | Comparison>",
  "readTime": "<N min read>",
  "content": "<full HTML body, 2000-4000 words, starting with <h2>The 30-second answer</h2>. No <h1>.>",
  "faqs": [{{"q":"...","a":"..."}}, ... 5-7 pairs, answers 40-90 words]
}}"""


def landing_system() -> str:
    return f"""You are an SEO copywriter producing a commercial KEYWORD LANDING PAGE for {BRAND}

{STYLE}

{LENGTH}

OUTPUT — STRICT JSON, no prose, no code fences:
{{
  "metaDescription": "<150-160 chars, includes primary keyword + a CTA verb>",
  "h1": "<H1 with the primary keyword, <=70 chars>",
  "intro": "<2-3 opening <p> paragraphs answering the search intent immediately>",
  "bodyHtml": "<8-12 <h2> sections, 2000-4000 words total: what's included, ports, boat options, pricing guidance, seasons, how to book, who it's for. No <h1>.>",
  "faqs": [{{"q":"...","a":"..."}}, ... 5-7 pairs, answers 40-90 words]
}}"""


def build_blog_user(item: dict) -> str:
    return (f"TITLE: {item['title']}\nPRIMARY KEYWORD: {item['primary_keyword']}\n"
            f"SLUG: /blog/{item['slug']}/\nTARGET WORDS: {item.get('target_words', 2500)} (minimum 2000)\n\n"
            "Return only the JSON object.")


def build_landing_user(item: dict) -> str:
    return (f"PAGE TITLE TAG: {item['title']}\nPRIMARY KEYWORD: {item['primary_keyword']}\n"
            f"URL: {BASE_URL}/{item['slug']}\nTARGET WORDS: {item.get('target_words', 2500)} (minimum 2000)\n\n"
            "Return only the JSON object.")


# ---------- quality control ----------
DASH_RE = re.compile(r"\s*[–—]\s*")
TAG_RE = re.compile(r"<[^>]+>")


def word_count(html: str) -> int:
    return len(TAG_RE.sub(" ", html or "").split())


def clean_html(html: str) -> str:
    if not html:
        return html
    html = DASH_RE.sub(", ", html)   # em/en dash -> comma
    html = html.replace("!", ".")     # no exclamation points
    for phrase in BANNED:
        html = re.sub(re.escape(phrase), "", html, flags=re.IGNORECASE)
    return re.sub(r"\s{2,}", " ", html).strip()


def quality_check(html: str, min_words: int = 2000):
    wc = word_count(html)
    if wc < min_words:
        raise RuntimeError(f"too short: {wc} words (< {min_words})")
    return wc


def expand_html(system: str, item: dict, existing: str, min_words: int = 2000, tries: int = 2) -> str:
    """If body is under the floor, ask the model for extra <h2> sections until it clears."""
    html = existing
    for _ in range(tries):
        wc = word_count(html)
        if wc >= min_words:
            break
        need = min_words - wc + 300
        user = (f"Topic: {item['title']} (keyword: {item['primary_keyword']}).\n"
                f"Here is the current article body:\n\n{html}\n\n"
                f"Add roughly {need} MORE words as NEW, non-repeating <h2> sections that go deeper "
                f"(specific examples, ports, boats, seasons, costs, practical tips). "
                f"Return ONLY the new HTML <h2> sections, no preamble, no repetition of existing content.")
        more = clean_html(call_model(system, user))
        if not more or word_count(more) < 30:
            break
        html = html.rstrip() + "\n" + more
    return html


def _siblings(exclude_slug: str) -> list[dict]:
    """Pages to cross-link to: already-PUBLISHED pages first (won't 404), then
    queued/planned topics only to top up. Each item: {href, anchor}."""
    published, queued = [], []
    try:
        for it in json.loads(BLOG_STORE.read_text()):
            published.append({"href": f"/blog/{it['slug']}/", "anchor": it.get("title", it["slug"])})
    except Exception:
        pass
    try:
        for it in json.loads(LANDING_STORE.read_text()):
            published.append({"href": f"/{it['slug']}/", "anchor": it.get("h1") or it.get("title", it["slug"])})
    except Exception:
        pass
    try:
        cfg = json.loads(QUEUE_PATH.read_text())
        for it in cfg.get("queue", []):
            href = f"/blog/{it['slug']}/" if it.get("kind") == "blog" else f"/{it['slug']}/"
            queued.append({"href": href, "anchor": it.get("title", it["slug"])})
    except Exception:
        pass
    # published first, queued as fallback fill
    ordered = published + queued
    return [s for s in ordered if exclude_slug not in s["href"]]


def add_internal_links(html: str, item: dict) -> str:
    """Guarantee exactly one homepage link and append a Related cluster of
    cross-links to sibling pages (improves internal-link density + structure)."""
    # 1) Homepage link — wrap the first bare "BoatHire24" mention, else prepend a CTA.
    if 'href="/"' not in html:
        if re.search(r"(?<!>)BoatHire24(?!<)", html):
            html = re.sub(r"(?<!>)BoatHire24(?!<)", '<a href="/">BoatHire24</a>', html, count=1)
        else:
            html = (f'<p>Browse the full fleet at <a href="/">BoatHire24</a>.</p>\n' + html)
    # 2) Related cluster — up to 4 sibling cross-links. _siblings returns
    # published pages first, so taking them in order prefers live (non-404) links.
    sibs = _siblings(item["slug"])
    if sibs:
        picks, seen = [], set()
        for s in sibs:
            if s["href"] in seen:
                continue
            seen.add(s["href"]); picks.append(s)
            if len(picks) >= 4:
                break
        items = "".join(f'<li><a href="{p["href"]}">{p["anchor"]}</a></li>' for p in picks)
        html = html.rstrip() + f'\n<h2>Related guides</h2>\n<ul>{items}</ul>'
    return html


def pick_hero(keyword: str) -> str:
    """Open-license image keyed to the topic; falls back to the curated pool."""
    try:
        from stock_images import open_library_images
        urls = open_library_images(keyword, n=3)
        if urls:
            return random.choice(urls)
    except Exception:
        pass
    return random.choice(HERO_IMAGES)


def gen_blog(item: dict) -> dict:
    system = blog_system()
    data = extract_json(call_model(system, build_blog_user(item)))
    content = clean_html(data["content"])
    content = expand_html(system, item, content)
    quality_check(content)
    content = add_internal_links(content, item)
    # Deterministic per-slug, so a post's byline is stable across regenerations.
    author, role = AUTHORS[int(hashlib.sha1(item["slug"].encode()).hexdigest(), 16) % len(AUTHORS)]
    return {
        "slug": item["slug"],
        "title": strip_brand(item["title"]),
        "excerpt": clean_html(data.get("excerpt", ""))[:300],
        "metaDescription": clean_html(data.get("metaDescription") or data.get("excerpt", ""))[:160],
        "tag": data.get("tag", "Destination guide"),
        "readTime": f"{max(9, word_count(content) // 220)} min read",
        "date": datetime.date.today().strftime("%B %d, %Y"),
        "author": author,
        "authorRole": role,
        "heroImage": pick_hero(item["primary_keyword"]),
        "content": content,
        "faqs": [{"q": clean_html(f.get("q", "")), "a": clean_html(f.get("a", ""))} for f in data.get("faqs", [])],
    }


def strip_brand(title: str) -> str:
    """The Next.js layout template appends '| BoatHire24' to every <title>;
    queue titles that carry it themselves end up doubled in the SERP."""
    return re.sub(r"\s*[|—-]\s*BoatHire24\s*$", "", title or "").strip()


# ---------- semantic dedupe guard ----------
STOP = {"the", "a", "an", "in", "to", "of", "for", "and", "boat", "marbella", "hire", "rental", "charter"}


def _kw_tokens(text: str) -> set:
    return {w for w in re.findall(r"[a-z0-9]+", (text or "").lower()) if w not in STOP and len(w) > 2}


def existing_keyword_sets() -> list[set]:
    sets = []
    for path in (BLOG_STORE, LANDING_STORE):
        try:
            for it in json.loads(path.read_text()):
                sets.append(_kw_tokens(f"{it.get('keyword') or it.get('title','')} {it.get('title','')}"))
        except Exception:
            pass
    return [s for s in sets if s]


def is_near_duplicate(item: dict, existing: list[set], threshold: float = 0.7) -> bool:
    """Jaccard token overlap on keyword+title vs already-published pages."""
    a = _kw_tokens(f"{item.get('primary_keyword','')} {item.get('title','')}")
    if not a:
        return False
    for b in existing:
        if not b:
            continue
        j = len(a & b) / len(a | b)
        if j >= threshold:
            return True
    return False


def gen_landing(item: dict) -> dict:
    system = landing_system()
    data = extract_json(call_model(system, build_landing_user(item)))
    intro = clean_html(data.get("intro", ""))
    body = clean_html(data["bodyHtml"])
    body = expand_html(system, item, body, min_words=2000 - word_count(intro))
    quality_check(intro + " " + body)
    body = add_internal_links(body, item)
    return {
        "slug": item["slug"],
        "title": strip_brand(item["title"]),
        "metaDescription": clean_html(data.get("metaDescription", ""))[:200],
        "h1": clean_html(data.get("h1", item["title"])),
        "keyword": item["primary_keyword"],
        "intro": intro,
        "bodyHtml": body,
        "heroImage": pick_hero(item["primary_keyword"]),
        "faqs": [{"q": clean_html(f.get("q", "")), "a": clean_html(f.get("a", ""))} for f in data.get("faqs", [])],
        "date": datetime.date.today().isoformat(),
    }


# ---------- queue refill ----------
def inventory_target_cities(limit: int = 8) -> list[dict]:
    """Top under-served destinations that have real, bookable boats (clean names
    only), from the inventory brain (scripts/inventory_targets.py). Empty if the
    brain hasn't been generated — the caller then falls back to the core market."""
    try:
        rows = json.loads((ROOT / "config" / "brain" / "inventory_targets.json").read_text())
    except Exception:
        return []
    return [r for r in rows if r.get("generatable") and r.get("boats", 0) >= 4 and r.get("landing_pages", 0) <= 3][:limit]


def refill_queue(queue_cfg: dict, n: int, existing_slugs: set) -> list[dict]:
    seen = set(existing_slugs)
    for src in (queue_cfg.get("queue", []), queue_cfg.get("consumed", [])):
        for it in src:
            seen.add(it.get("slug"))
    # Steer topics toward destinations where we actually have boats but little
    # coverage, instead of endlessly deepening Marbella. (inventory brain)
    targets = inventory_target_cities()
    target_clause = ""
    if targets:
        tlist = "; ".join(f"{t['city']} ({t['country']}, {t['boats']} boats)" for t in targets)
        target_clause = (
            "\n\nPRIORITY — we have real, bookable boats in these UNDER-SERVED destinations but few or no "
            f"pages yet: {tlist}. Make AT LEAST HALF of the LANDING topics target these cities "
            "(put the city name in the slug, primary_keyword and title). The rest can cover the core "
            "Marbella / Costa del Sol market.")
    sys_p = ("You are an SEO content planner for BoatHire24, a boat-rental & yacht-charter marketplace. "
             "Core market: Marbella / Costa del Sol, Spain — plus a growing fleet in Turkey, Cyprus, Greece, "
             "France, Portugal and Thailand. Generate diverse, search-driven topics across: "
             "boat/yacht rental long-tail (city + port + boat-type modifiers), comparisons, seasonal/event hooks "
             "(Starlite, Feria, NYE, hen/stag, F1), experiential angles (dolphins, sunset, snorkel, fishing, "
             "family, photoshoot), price/licence/weather guides. Specific enough to hit 1000-1500 words.")
    user_p = (f"Produce {n} new topics as a STRICT JSON ARRAY. Each item:\n"
              '{"kind":"blog"|"landing","slug":"<kebab-slug, single path segment, no /blog prefix>",'
              '"primary_keyword":"natural search phrase","title":"<=65-char title with keyword","target_words":1100}\n\n'
              f"AVOID these slugs (already used): {json.dumps(sorted(s for s in seen if s))}"
              f"{target_clause}\n\n"
              "Mix ~50% blog, ~50% landing. Landing = commercial intent (rent/charter/hire/price). "
              "Return JSON array only.")
    arr = extract_json(call_model(sys_p, user_p, timeout_s=300), kind="array")
    # Semantic dedupe: reject topics too similar to existing pages or to each other.
    kw_sets = existing_keyword_sets()
    cleaned = []
    for it in arr:
        slug = (it.get("slug") or "").strip("/").replace("blog/", "")
        if not slug or slug in seen or it.get("kind") not in ("blog", "landing"):
            continue
        if not it.get("primary_keyword") or not it.get("title"):
            continue
        cand = {"primary_keyword": it["primary_keyword"].strip(), "title": it["title"].strip()}
        if is_near_duplicate(cand, kw_sets):
            continue
        cleaned.append({
            "kind": it["kind"], "slug": slug,
            "primary_keyword": cand["primary_keyword"],
            "title": cand["title"],
            "target_words": int(it.get("target_words") or 1100),
        })
        seen.add(slug)
        kw_sets.append(_kw_tokens(f"{cand['primary_keyword']} {cand['title']}"))
    return cleaned


# ---------- store plumbing ----------
def load_store(path: pathlib.Path) -> list:
    try:
        return json.loads(path.read_text())
    except Exception:
        return []


def save_store(path: pathlib.Path, data: list):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")


def all_used_slugs() -> set:
    s = set()
    for p in (BLOG_STORE, LANDING_STORE):
        for it in load_store(p):
            s.add(it.get("slug"))
    return s


# ---------- git ----------
def git_push(msg: str):
    subprocess.run(["git", "add", "-A"], cwd=ROOT, check=True)
    diff = subprocess.run(["git", "diff", "--cached", "--quiet"], cwd=ROOT)
    if diff.returncode == 0:
        log("git: no changes to commit")
        return False
    subprocess.run(["git", "commit", "-m", msg], cwd=ROOT, check=True)
    subprocess.run(["git", "push", "origin", "HEAD"], cwd=ROOT, check=True)
    return True


def ping_reindex():
    url = os.environ.get("REINDEX_URL", f"{BASE_URL}/api/reindex")
    secret = os.environ.get("CRON_SECRET")
    req = urllib.request.Request(url)
    if secret:
        req.add_header("Authorization", f"Bearer {secret}")
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            log(f"reindex ping: {r.status} {r.read().decode()[:200]}")
    except Exception as e:
        log(f"reindex ping failed: {e}")


# ---------- main ----------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--blogs", type=int, default=None)
    ap.add_argument("--landings", type=int, default=None)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--no-push", action="store_true")
    ap.add_argument("--force", action="store_true",
                    help="bypass the near-duplicate guard (for intentional keyword variants)")
    args = ap.parse_args()

    cfg = json.loads(QUEUE_PATH.read_text())
    queue = cfg.get("queue", [])
    nb = args.blogs if args.blogs is not None else cfg.get("blog_per_day", 20)
    nl = args.landings if args.landings is not None else cfg.get("landing_per_day", 20)

    blogs = [q for q in queue if q.get("kind") == "blog"][:nb]
    landings = [q for q in queue if q.get("kind") == "landing"][:nl]
    batch = blogs + landings
    log(f"=== Generate: {len(blogs)} blog + {len(landings)} landing = {len(batch)} item(s) (backend={BACKEND}) ===")

    # Pull latest from remote before generating to avoid overwriting work pushed
    # by interactive sessions while the cron was idle. Rebase on top so any local
    # commits stay; tolerate no-remote / detached states.
    try:
        subprocess.run(["git", "pull", "--rebase", "--autostash", "origin", "HEAD"], cwd=ROOT, check=False, capture_output=True)
    except Exception as e:
        log(f"git pull (pre-generate) skipped: {e}")

    blog_store = load_store(BLOG_STORE)
    landing_store = load_store(LANDING_STORE)
    have = {b.get("slug") for b in blog_store} | {l.get("slug") for l in landing_store}
    kw_sets = existing_keyword_sets()   # for semantic dedupe

    succeeded, failed = [], []
    for i, item in enumerate(batch, 1):
        log(f"[{i}/{len(batch)}] {item['kind']} · {item['slug']}")
        if item["slug"] in have:
            log("  (already exists, skipping)")
            succeeded.append(item)
            continue
        if not args.force and is_near_duplicate(item, kw_sets):
            log(f"  (near-duplicate topic, skipping: {item['primary_keyword']})")
            succeeded.append(item)   # drop from queue, don't generate
            continue
        if args.dry_run:
            log("  (dry-run)")
            continue
        try:
            if item["kind"] == "blog":
                rec = gen_blog(item)
                body_wc = word_count(rec.get("content", ""))
            else:
                rec = gen_landing(item)
                body_wc = word_count((rec.get("intro", "") or "") + (rec.get("bodyHtml", "") or ""))
            # Hard belt-and-suspenders gate: never persist thin content.
            if body_wc < 2000:
                raise RuntimeError(f"thin output rejected ({body_wc}w < 2000)")
            (blog_store if item["kind"] == "blog" else landing_store).append(rec)
            have.add(item["slug"])
            kw_sets.append(_kw_tokens(f"{item['primary_keyword']} {item['title']}"))
            succeeded.append(item)
            log("  ✓ generated")
        except Exception as e:
            log(f"  ✗ FAILED: {type(e).__name__}: {str(e)[:200]}")
            traceback.print_exc()
            failed.append(item)

    if args.dry_run:
        log("dry-run complete")
        return 0

    save_store(BLOG_STORE, blog_store)
    save_store(LANDING_STORE, landing_store)

    # advance queue
    cfg["queue"] = [q for q in queue if q not in succeeded]
    cfg.setdefault("consumed", []).extend(
        {**s, "consumed_at": datetime.date.today().isoformat()} for s in succeeded
    )

    # refill — PREFER real keyword data (DataForSEO). Only fall back to LLM
    # topic-invention if DataForSEO is unavailable AND the queue is still low
    # (LLM invention is what previously drifted off-topic).
    threshold = int(cfg.get("refill_threshold", 60))
    refill_batch = int(cfg.get("refill_batch", 80))
    if len(cfg["queue"]) < threshold:
        QUEUE_PATH.write_text(json.dumps(cfg, ensure_ascii=False, indent=2) + "\n")
        dfs_added = 0
        if os.environ.get("DATAFORSEO_LOGIN") and os.environ.get("DATAFORSEO_PASSWORD"):
            log(f"queue under threshold — fetching real keywords from DataForSEO…")
            before = len(cfg["queue"])
            try:
                r = subprocess.run(["/usr/bin/python3", str(ROOT / "scripts" / "dataforseo_keywords.py"),
                                    "--limit", str(refill_batch)],
                                   capture_output=True, text=True, cwd=ROOT, timeout=300)
                log(r.stdout.strip()[-300:] or r.stderr.strip()[-200:])
                cfg = json.loads(QUEUE_PATH.read_text())
                # Count what DataForSEO ACTUALLY added, not merely that we called it.
                # A dead account (HTTP 402) returns 0 items; treating the attempt as
                # success gated off the LLM fallback and left the queue empty for a
                # month, publishing 0 pages/day.
                dfs_added = len(cfg["queue"]) - before
            except Exception as e:
                log(f"DataForSEO refill failed: {type(e).__name__}: {str(e)[:160]}")
        if len(cfg["queue"]) < threshold and dfs_added <= 0:
            log("DataForSEO returned nothing — falling back to LLM topic invention")
            try:
                added = refill_queue(cfg, refill_batch, all_used_slugs())
                cfg["queue"].extend(added)
                log(f"refill (LLM fallback): +{len(added)} (queue now {len(cfg['queue'])})")
            except Exception as e:
                log(f"refill failed: {type(e).__name__}: {str(e)[:200]}")

    QUEUE_PATH.write_text(json.dumps(cfg, ensure_ascii=False, indent=2) + "\n")

    if succeeded and not args.no_push:
        pushed = git_push(f"Daily content: +{len(succeeded)} pages "
                          f"({sum(1 for s in succeeded if s['kind']=='blog')} blog, "
                          f"{sum(1 for s in succeeded if s['kind']=='landing')} landing)")
        if pushed:
            log("pushed — Vercel will deploy; pinging reindex in background is handled by Vercel cron")
            ping_reindex()

    log(f"=== Done: {len(succeeded)} ok, {len(failed)} failed ===\n")
    return 0 if not failed else 1


if __name__ == "__main__":
    sys.exit(main())
