#!/usr/bin/env python3
"""Publish BoatHire24 content to a WordPress site via the REST API.

Blog articles  -> WordPress posts  (/wp-json/wp/v2/posts)
Landing pages  -> WordPress pages  (/wp-json/wp/v2/pages)

WordPress has no per-day write block like Blogger, so this can absorb the full
40 + 40/day. Reuses the same HTML rendering (hero + inline images, internal
links absolutized to boathire24.com) as the Blogger publisher.

Setup (one-time), in .env.local:
  WP_URL=https://your-wordpress-site.com         # self-hosted WP (REST enabled)
  WP_USER=your_wp_username
  WP_APP_PASSWORD=xxxx xxxx xxxx xxxx xxxx xxxx   # Users -> Profile -> Application Passwords

Usage:
  python3 scripts/wp_publish.py --limit 40
  python3 scripts/wp_publish.py --check        # verify connection only
"""
from __future__ import annotations
import argparse, base64, datetime, importlib.util, json, os, pathlib, sys, time, urllib.request, urllib.error, urllib.parse

ROOT = pathlib.Path(__file__).resolve().parents[1]
BLOG_STORE = ROOT / "lib" / "blog" / "auto-posts.json"
LANDING_STORE = ROOT / "lib" / "landing" / "auto-landing.json"
POSTED_PATH = ROOT / "config" / "wp_posted.json"
LOG_DIR = ROOT / "logs"; LOG_DIR.mkdir(exist_ok=True)
LOG_PATH = LOG_DIR / "wp_publish.log"

# Reuse the Blogger publisher's renderers (images + internal-link absolutization).
_spec = importlib.util.spec_from_file_location("pb", ROOT / "scripts" / "post_blogger.py")
pb = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(pb)


def log(msg: str):
    ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{ts}] {msg}"
    print(line, flush=True)
    with LOG_PATH.open("a") as f:
        f.write(line + "\n")


def load_env():
    for p in (ROOT / ".env.local", ROOT / ".env"):
        if not p.exists():
            continue
        for line in p.read_text().splitlines():
            for k in ("WP_URL", "WP_USER", "WP_APP_PASSWORD", "WP_COM_TOKEN", "WP_COM_SITE"):
                if line.startswith(k + "=") and not os.environ.get(k):
                    os.environ[k] = line.split("=", 1)[1].strip().strip('"').strip("'")


def _is_wpcom() -> bool:
    return bool(os.environ.get("WP_COM_TOKEN") and os.environ.get("WP_COM_SITE"))


def _endpoint_url(endpoint: str) -> str:
    if _is_wpcom():
        site = os.environ["WP_COM_SITE"].rstrip("/")
        return f"https://public-api.wordpress.com/wp/v2/sites/{site}/{endpoint}"
    base = os.environ["WP_URL"].rstrip("/")
    return f"{base}/wp-json/wp/v2/{endpoint}"


def auth_header() -> str:
    if _is_wpcom():
        return f"Bearer {os.environ['WP_COM_TOKEN']}"
    user = os.environ.get("WP_USER", "")
    pw = os.environ.get("WP_APP_PASSWORD", "").replace(" ", "")
    return "Basic " + base64.b64encode(f"{user}:{pw}".encode()).decode()


def wp_post(endpoint: str, payload: dict) -> tuple[int, dict]:
    req = urllib.request.Request(
        _endpoint_url(endpoint),
        data=json.dumps(payload).encode(),
        headers={"Authorization": auth_header(), "Content-Type": "application/json",
                 "User-Agent": "boathire24-bot"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, {"error": e.read().decode(errors="replace")[:200]}


_MEDIA_CACHE: dict = {}


def upload_media(image_url: str) -> int | None:
    """Upload an image to the WP media library; returns attachment id (cached per URL).
    The featured image is what WordPress uses for og:image / social sharing cards."""
    if not image_url:
        return None
    if image_url in _MEDIA_CACHE:
        return _MEDIA_CACHE[image_url]
    try:
        raw = urllib.request.urlopen(
            urllib.request.Request(image_url, headers={"User-Agent": "boathire24-bot"}), timeout=30
        ).read()
        req = urllib.request.Request(
            _endpoint_url("media"), data=raw, method="POST",
            headers={"Authorization": auth_header(), "Content-Type": "image/jpeg",
                     "Content-Disposition": 'attachment; filename="boathire24.jpg"',
                     "User-Agent": "boathire24-bot"},
        )
        with urllib.request.urlopen(req, timeout=90) as r:
            mid = json.loads(r.read()).get("id")
            _MEDIA_CACHE[image_url] = mid
            return mid
    except Exception as e:
        log(f"  (media upload failed: {str(e)[:100]})")
        return None


def find_id(endpoint: str, slug: str) -> int | None:
    url = _endpoint_url(endpoint) + f"?slug={urllib.parse.quote(slug)}&per_page=1&status=publish"
    try:
        with urllib.request.urlopen(
            urllib.request.Request(url, headers={"Authorization": auth_header()}), timeout=30
        ) as r:
            items = json.loads(r.read())
            return items[0]["id"] if items else None
    except Exception:
        return None


def load_posted() -> set:
    try:
        return set(json.loads(POSTED_PATH.read_text()))
    except Exception:
        return set()


def save_posted(s: set):
    POSTED_PATH.write_text(json.dumps(sorted(s), indent=2) + "\n")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=40)
    ap.add_argument("--check", action="store_true", help="verify connection only")
    ap.add_argument("--reprocess-seo", action="store_true",
                    help="add featured image + excerpt to already-published items (SEO/og:image backfill)")
    args = ap.parse_args()
    load_env()

    if not _is_wpcom() and not (os.environ.get("WP_URL") and os.environ.get("WP_USER") and os.environ.get("WP_APP_PASSWORD")):
        log("WP: no credentials. Set WP_COM_TOKEN + WP_COM_SITE (WordPress.com) or WP_URL/WP_USER/WP_APP_PASSWORD (self-hosted) in .env.local.")
        return 0

    if args.check:
        url = _endpoint_url("posts") + "?per_page=1"
        req = urllib.request.Request(url, headers={"Authorization": auth_header()})
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                log(f"WP: connection OK ({r.status}) — {'WordPress.com' if _is_wpcom() else os.environ.get('WP_URL')}")
        except Exception as e:
            log(f"WP: connection FAILED: {str(e)[:160]}")
        return 0

    posts = json.loads(BLOG_STORE.read_text()) if BLOG_STORE.exists() else []
    pages = json.loads(LANDING_STORE.read_text()) if LANDING_STORE.exists() else []
    posted = load_posted()

    # ── SEO backfill: add featured image (og:image) + excerpt to existing items ──
    if args.reprocess_seo:
        done = 0
        for endpoint, items, pref in (("posts", posts, "post"), ("pages", pages, "page")):
            for it in items:
                if f"{pref}:{it['slug']}" not in posted:
                    continue
                wid = find_id(endpoint, it["slug"])
                if not wid:
                    continue
                fm = upload_media(it.get("heroImage"))
                patch = {"excerpt": it.get("metaDescription") or it.get("excerpt", "")}
                if fm:
                    patch["featured_media"] = fm
                code, res = wp_post(f"{endpoint}/{wid}", patch)
                if 200 <= code < 300:
                    done += 1; log(f"  ✓ seo {endpoint}/{it['slug']} (img={'y' if fm else 'n'})")
                else:
                    log(f"  ✗ seo {it['slug']}: {code} {res.get('error','')[:100]}")
                time.sleep(1)
        log(f"WP SEO backfill: updated {done} item(s)")
        return 0

    def pending(items, prefix):
        return [it for it in items if it.get("slug") and f"{prefix}:{it['slug']}" not in posted][:args.limit]

    todo_posts = pending(posts, "post")
    todo_pages = pending(pages, "page")
    if not todo_posts and not todo_pages:
        log("WP: nothing new to publish.")
        return 0

    target = os.environ.get("WP_COM_SITE") or os.environ.get("WP_URL")
    log(f"WP: publishing {len(todo_posts)} post(s) + {len(todo_pages)} page(s) to {target}")
    ok = 0
    for p in todo_posts:
        payload = {"title": p["title"], "content": pb.render_post_html(p, []),
                   "status": "publish", "slug": p["slug"],
                   "excerpt": p.get("metaDescription") or p.get("excerpt", "")}
        fm = upload_media(p.get("heroImage"))
        if fm:
            payload["featured_media"] = fm
        code, res = wp_post("posts", payload)
        if 200 <= code < 300:
            posted.add(f"post:{p['slug']}"); save_posted(posted); ok += 1
            log(f"  ✓ post {res.get('link')}")
        else:
            log(f"  ✗ post {p['slug']}: {code} {res.get('error','')[:120]}")
        time.sleep(1)
    for p in todo_pages:
        payload = {"title": p["title"], "content": pb.render_page_html(p, []),
                   "status": "publish", "slug": p["slug"],
                   "excerpt": p.get("metaDescription", "")}
        fm = upload_media(p.get("heroImage"))
        if fm:
            payload["featured_media"] = fm
        code, res = wp_post("pages", payload)
        if 200 <= code < 300:
            posted.add(f"page:{p['slug']}"); save_posted(posted); ok += 1
            log(f"  ✓ page {res.get('link')}")
        else:
            log(f"  ✗ page {p['slug']}: {code} {res.get('error','')[:120]}")
        time.sleep(1)
    save_posted(posted)
    log(f"WP: {ok}/{len(todo_posts) + len(todo_pages)} published")
    return 0


if __name__ == "__main__":
    sys.exit(main())
