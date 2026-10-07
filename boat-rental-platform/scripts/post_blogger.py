#!/usr/bin/env python3
"""Crosspost BoatHire24 blog articles to Blogger (account: info@boathire24.com).

Reads the generated posts in lib/blog/auto-posts.json and publishes any that
haven't been crossposted yet to the BoatHire24 Blogger blog, each with a
canonical backlink to the live article on boathire24.com/blog/<slug>.

Setup (one-time):
  1. In Google Cloud, create an OAuth *Desktop* client; download client_secrets.json.
  2. Put its path in env BOATHIRE24_GOOGLE_CREDENTIALS (or ~/.boathire24-google.json).
  3. Run:  python3 scripts/post_blogger.py --login        # opens browser, log in as info@boathire24.com
           python3 scripts/post_blogger.py --list-blogs   # find the blog id
  4. Put the id in env BOATHIRE24_BLOGGER_ID.

Fails gracefully (logs + exit 0) if creds/blog id are missing.

Usage:
  python3 scripts/post_blogger.py --limit 40
  python3 scripts/post_blogger.py --list-blogs
  python3 scripts/post_blogger.py --login
"""
from __future__ import annotations
import argparse, datetime, hashlib, json, os, pathlib, re, sys, time

ROOT = pathlib.Path(__file__).resolve().parents[1]
BLOG_STORE = ROOT / "lib" / "blog" / "auto-posts.json"
LANDING_STORE = ROOT / "lib" / "landing" / "auto-landing.json"
POSTED_PATH = ROOT / "config" / "blogger_posted.json"
TOKEN_PATH = pathlib.Path.home() / ".boathire24-blogger-token.json"
LOG_DIR = ROOT / "logs"; LOG_DIR.mkdir(exist_ok=True)
LOG_PATH = LOG_DIR / "post_blogger.log"

BASE_URL = "https://boathire24.com"
GOOGLE_SCOPES = [
    "https://www.googleapis.com/auth/blogger",
    "https://www.googleapis.com/auth/drive.readonly",
]


def log(msg: str):
    ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{ts}] {msg}"
    print(line, flush=True)
    with LOG_PATH.open("a") as f:
        f.write(line + "\n")


def load_env():
    for p in [ROOT / ".env.local", ROOT / ".env"]:
        if not p.exists():
            continue
        for line in p.read_text().splitlines():
            for k in ("BOATHIRE24_BLOGGER_ID", "BOATHIRE24_GOOGLE_CREDENTIALS", "BOATHIRE24_DRIVE_FOLDER_ID"):
                if line.startswith(k + "=") and not os.environ.get(k):
                    os.environ[k] = line.split("=", 1)[1].strip().strip('"').strip("'")


def creds_path() -> pathlib.Path:
    return pathlib.Path(os.environ.get(
        "BOATHIRE24_GOOGLE_CREDENTIALS",
        str(pathlib.Path.home() / ".boathire24-google.json"),
    ))


def get_credentials(interactive: bool):
    from google.oauth2.credentials import Credentials
    from google.auth.transport.requests import Request
    cp = creds_path()
    creds = None
    if TOKEN_PATH.exists():
        creds = Credentials.from_authorized_user_file(str(TOKEN_PATH), GOOGLE_SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        elif interactive:
            from google_auth_oauthlib.flow import InstalledAppFlow
            if not cp.exists():
                sys.exit(f"ERROR: client secrets not found at {cp}")
            flow = InstalledAppFlow.from_client_secrets_file(str(cp), GOOGLE_SCOPES)
            creds = flow.run_local_server(port=0)
        else:
            return None
        TOKEN_PATH.write_text(creds.to_json())
    return creds


def blogger_service(creds):
    from googleapiclient.discovery import build
    return build("blogger", "v3", credentials=creds, cache_discovery=False)


def drive_service(creds):
    from googleapiclient.discovery import build
    return build("drive", "v3", credentials=creds, cache_discovery=False)


def list_drive_media(drive, folder_id: str) -> list:
    """Image/video files in the shared media-pool folder, normalized to
    {type, url}. Files must be shared 'anyone with the link' to render publicly."""
    files, page = [], None
    q = (f"'{folder_id}' in parents and trashed=false and "
         f"(mimeType contains 'image/' or mimeType contains 'video/')")
    while True:
        resp = drive.files().list(
            q=q, fields="nextPageToken, files(id,name,mimeType)",
            pageSize=200, pageToken=page,
            includeItemsFromAllDrives=True, supportsAllDrives=True,
        ).execute()
        files.extend(resp.get("files", []))
        page = resp.get("nextPageToken")
        if not page:
            break
    media = []
    for f in files:
        if f["mimeType"].startswith("video/"):
            media.append({"type": "video", "url": f"https://drive.google.com/file/d/{f['id']}/preview"})
        else:
            media.append({"type": "image", "url": f"https://lh3.googleusercontent.com/d/{f['id']}=w1200"})
    return media


def _img(url: str, alt: str) -> str:
    return f'<p><img src="{url}" alt="{alt}" style="max-width:100%;height:auto" /></p>'


def _video(url: str) -> str:
    return (f'<p><iframe src="{url}" width="640" height="360" allow="autoplay" '
            f'style="max-width:100%"></iframe></p>')


def media_for(slug: str, media: list, n: int = 3) -> tuple[str, list]:
    """Deterministic per-slug selection from a normalized [{type,url}] pool
    (Drive + open-library blended). Returns (hero_html, [inline_snippets])."""
    if not media:
        return "", []
    imgs = [m for m in media if m["type"] == "image"]
    vids = [m for m in media if m["type"] == "video"]
    h = int(hashlib.md5(slug.encode()).hexdigest(), 16)
    hero, inline = "", []
    if imgs:
        # Hero = first image in pool order (Drive or the page's own boat heroImage),
        # which is always relevant. Inline = hash-rotated selection of the rest.
        hero = _img(imgs[0]["url"], slug)
        rest = imgs[1:]
        picks, seen = [], {imgs[0]["url"]}
        for i in range(len(rest)):
            m = rest[(h + i) % len(rest)]
            if m["url"] in seen:
                continue
            seen.add(m["url"]); picks.append(m)
            if len(picks) >= max(0, n - 1):
                break
        inline = [_img(m["url"], slug) for m in picks]
    if vids:
        inline.append(_video(vids[h % len(vids)]["url"]))
    return hero, inline


def _distribute(body: str, snippets: list) -> str:
    """Spread inline media evenly through the middle of the article by inserting
    each snippet after a different <h2> section (never all clustered at the top)."""
    if not snippets:
        return body
    # positions just after each section's closing </h2>
    marks = [m.end() for m in re.finditer(r"</h2>", body)]
    if len(marks) < 2:
        return body + "".join(snippets)
    # skip the first section (keeps the area under the hero clean); spread across the rest
    usable = marks[1:]
    k = len(snippets)
    chosen = [usable[round((i + 1) * len(usable) / (k + 1)) - 1] for i in range(k)]
    # insert from the end so earlier offsets stay valid
    for snip, pos in sorted(zip(snippets, chosen), key=lambda x: -x[1]):
        body = body[:pos] + snip + body[pos:]
    return body


def combined_media(item: dict, drive_media: list, stock_n: int = 3) -> list:
    """Blend the Drive pool with open-license images keyed to the page's topic."""
    from stock_images import open_library_images
    query = item.get("keyword") or item.get("primary_keyword") or item.get("title") or ""
    pool = list(drive_media)
    # Page's own generator heroImage first (kept as one option in the blend).
    if item.get("heroImage"):
        pool.append({"type": "image", "url": item["heroImage"]})
    for u in open_library_images(query, n=stock_n):
        pool.append({"type": "image", "url": u})
    return pool


def render_post_html(post: dict, drive_media: list) -> str:
    pool = combined_media(post, drive_media)
    hero, inline = media_for(post["slug"], pool)
    return _render(post.get("content", ""), post.get("faqs"),
                   f"{BASE_URL}/blog/{post['slug']}", hero, inline)


def render_page_html(page: dict, drive_media: list) -> str:
    body = (page.get("intro", "") or "") + "\n" + (page.get("bodyHtml", "") or "")
    pool = combined_media(page, drive_media)
    hero, inline = media_for(page["slug"], pool)
    return _render(body, page.get("faqs"), f"{BASE_URL}/{page['slug']}", hero, inline)


def _render(body: str, faqs, canonical: str, hero: str = "", inline: list | None = None) -> str:
    # Spread inline media evenly through the middle of the article.
    body = _distribute(body, inline or [])
    parts = [hero, body] if hero else [body]
    for f in (faqs or []):
        if parts[-1] != "<h2>Common questions</h2>":
            parts.append("<h2>Common questions</h2>")
        parts.append(f"<h3>{f.get('q','')}</h3><p>{f.get('a','')}</p>")
    parts.append(
        f'<p><em>Originally published on '
        f'<a href="{canonical}" rel="canonical">BoatHire24</a>. '
        f'Browse boats and book at <a href="{BASE_URL}/search">boathire24.com</a>.</em></p>'
    )
    html = "\n".join(parts)
    # Relative links would resolve against blogspot.com; point them at the money site
    # so internal links work AND pass link equity back to boathire24.com.
    html = re.sub(r'href="/(?!/)', f'href="{BASE_URL}/', html)
    return html


def load_posted() -> set:
    try:
        return set(json.loads(POSTED_PATH.read_text()))
    except Exception:
        return set()


def save_posted(s: set):
    POSTED_PATH.write_text(json.dumps(sorted(s), indent=2) + "\n")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--login", action="store_true", help="run interactive OAuth login")
    ap.add_argument("--list-blogs", action="store_true")
    ap.add_argument("--list-folders", action="store_true", help="list Drive folders to find the media pool")
    ap.add_argument("--limit", type=int, default=40)
    args = ap.parse_args()
    load_env()

    if args.login:
        get_credentials(interactive=True)
        log("login OK — token saved")
        return 0

    creds = get_credentials(interactive=False)
    if not creds:
        log(f"Blogger: no credentials (run --login). Skipped.")
        return 0
    svc = blogger_service(creds)

    if args.list_blogs:
        blogs = svc.blogs().listByUser(userId="self").execute().get("items", [])
        for b in blogs:
            log(f"  {b['id']}  {b.get('name')}  {b.get('url')}")
        return 0

    if args.list_folders:
        drive = drive_service(creds)
        resp = drive.files().list(
            q="mimeType='application/vnd.google-apps.folder' and trashed=false",
            fields="files(id,name)", pageSize=200,
            includeItemsFromAllDrives=True, supportsAllDrives=True,
        ).execute()
        for f in resp.get("files", []):
            log(f"  {f['id']}  {f['name']}")
        return 0

    blog_id = os.environ.get("BOATHIRE24_BLOGGER_ID", "").strip()
    if not blog_id:
        log("Blogger: BOATHIRE24_BLOGGER_ID not set (run --list-blogs). Skipped.")
        return 0

    # ── Drive media pool (optional) ──
    media = []
    folder_id = os.environ.get("BOATHIRE24_DRIVE_FOLDER_ID", "").strip()
    if folder_id:
        try:
            media = list_drive_media(drive_service(creds), folder_id)
            log(f"Drive: {len(media)} media file(s) in pool {folder_id}")
        except Exception as e:
            log(f"Drive: media listing failed ({type(e).__name__}: {str(e)[:120]}). Posting without media.")

    posts = json.loads(BLOG_STORE.read_text()) if BLOG_STORE.exists() else []
    pages = json.loads(LANDING_STORE.read_text()) if LANDING_STORE.exists() else []
    posted = load_posted()

    def pending(items, prefix):
        return [it for it in items if it.get("slug") and f"{prefix}:{it['slug']}" not in posted][-args.limit:]

    todo_posts = pending(posts, "post")
    todo_pages = pending(pages, "page")
    if not todo_posts and not todo_pages:
        log("Blogger: nothing new to publish.")
        return 0

    log(f"Blogger: publishing {len(todo_posts)} post(s) + {len(todo_pages)} page(s) to blog {blog_id}")
    throttle = float(os.environ.get("BLOGGER_THROTTLE", "6"))   # seconds between writes
    ok = 0

    class Blocked(Exception):
        pass

    def insert_with_retry(request, label: str) -> bool:
        """Execute a Blogger write, backing off on transient 429s. Raises Blocked when
        Google hard-blocks writes (403 forbidden / daily quota) so we stop hammering."""
        nonlocal ok
        delay = 30
        for attempt in range(5):
            try:
                res = request().execute()
                ok += 1
                log(f"  ✓ {label} {res.get('url')}")
                return True
            except Exception as e:
                msg = str(e)
                low = msg.lower()
                # Hard block: 403 forbidden / permission / daily limit -> stop the whole run.
                if "403" in msg or "forbidden" in low or "permission" in low or "dailylimit" in low:
                    raise Blocked(msg[:160])
                # Transient rate limit: back off and retry.
                if ("429" in msg or "exhausted" in low or "ratelimit" in low) and attempt < 4:
                    log(f"  … rate limited on {label}; backing off {delay}s")
                    time.sleep(delay); delay = min(delay * 2, 600)
                    continue
                log(f"  ✗ {label}: {type(e).__name__}: {msg[:140]}")
                return False
        return False

    try:
        # ── Blogger posts (from blog articles) ──
        for p in todo_posts:
            body = {"kind": "blogger#post", "title": p["title"], "content": render_post_html(p, media)}
            if insert_with_retry(lambda b=body: svc.posts().insert(blogId=blog_id, body=b, isDraft=False), f"post {p['slug']}"):
                posted.add(f"post:{p['slug']}"); save_posted(posted); time.sleep(throttle)
        # ── Landing pages → published as Blogger PAGES (Pages section). ──
        for p in todo_pages:
            body = {"kind": "blogger#page", "title": p["title"], "content": render_page_html(p, media)}
            if insert_with_retry(lambda b=body: svc.pages().insert(blogId=blog_id, body=b, isDraft=False), f"page {p['slug']}"):
                posted.add(f"page:{p['slug']}"); save_posted(posted); time.sleep(throttle)
    except Blocked as b:
        log(f"Blogger WRITE-BLOCKED (quota/rate limit): {b}. Stopping; remaining items will publish on the next run.")
    save_posted(posted)
    log(f"Blogger: {ok}/{len(todo_posts) + len(todo_pages)} published this run")
    return 0


if __name__ == "__main__":
    sys.exit(main())
