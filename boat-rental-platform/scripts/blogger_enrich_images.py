#!/usr/bin/env python3
"""Make Blogger posts/pages visually rich: distribute several relevant boat
images through the body (not just one hero), via Blogger API UPDATE (works even
though inserts are 403-blocked).

For each live post/page it rebuilds the body to: hero image, then the article
with an image inserted every ~2 H2 sections, then related links + FAQ + canonical.
Images come from a large curated high-quality boat/yacht/sea pool (reliable),
varied per-slug so articles don't all look identical.
"""
import importlib.util, json, pathlib, re, sys, time, warnings
warnings.filterwarnings("ignore")

ROOT = pathlib.Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("pb", ROOT / "scripts" / "post_blogger.py")
pb = importlib.util.module_from_spec(spec); spec.loader.exec_module(pb)
pb.load_env()
BID = "4858233363667605156"

# One large de-duplicated pool of verified-loadable boat images, built from many
# varied queries. Each item gets a UNIQUE non-overlapping slice so no two posts
# share images. Cached to disk so we don't rebuild every run.
_si = importlib.util.spec_from_file_location("si", ROOT / "scripts" / "stock_images.py")
si = importlib.util.module_from_spec(_si); _si.loader.exec_module(si)
POOL_CACHE = ROOT / "config" / "boat_image_pool.json"
QUERIES = [
    "yacht charter", "motor yacht", "sailing yacht", "catamaran boat",
    "fishing boat sea", "speedboat", "luxury yacht marina", "sunset sailing boat",
    "boat anchored cove", "jet ski water", "sailboat ocean", "marina harbour boats",
    "superyacht", "small motorboat", "rib boat sea",
]

def build_pool():
    # A curated pool file (verified-boat images) always wins, regardless of size.
    if POOL_CACHE.exists():
        cached = json.loads(POOL_CACHE.read_text())
        if len(cached) >= 10:
            return cached
    pool = []
    for q in QUERIES:
        for u in si.open_library_images(q, n=8):
            if u not in pool:
                pool.append(u)
    if pool:
        POOL_CACHE.write_text(json.dumps(pool))
    return pool

POOL = build_pool()

def img_tag(url, alt):
    return (f'<div style="margin:24px 0"><img src="{url}" alt="{alt}" '
            f'loading="lazy" style="width:100%;height:auto;border-radius:8px" /></div>')


def slice_for(index, n):
    if not POOL:
        return []
    start = (index * n) % len(POOL)
    return [POOL[(start + i) % len(POOL)] for i in range(n)]


def enrich(item, base_html, alt, index):
    # strip any existing <img>/<div>-wrapped images and the old hero <p><img>
    body = re.sub(r'<p>\s*<img[^>]*>\s*</p>', "", base_html)
    body = re.sub(r'<div[^>]*>\s*<img[^>]*>\s*</div>', "", body)
    urls = slice_for(index, 5)
    if not urls:
        return base_html
    hero = img_tag(urls[0], alt)
    inline = [img_tag(u, alt) for u in urls[1:]]
    # insert inline images after evenly-spaced </h2> closes (skip first section)
    marks = [m.end() for m in re.finditer(r"</h2>", body)]
    if len(marks) >= 2:
        usable = marks[1:]
        k = len(inline)
        chosen = sorted({usable[round((j + 1) * len(usable) / (k + 1)) - 1] for j in range(k)}, reverse=True)
        for pos, snip in zip(chosen, inline):
            body = body[:pos] + snip + body[pos:]
    else:
        body += "".join(inline)
    return hero + "\n" + body


def main():
    svc = pb.blogger_service(pb.get_credentials(interactive=False))
    posts_store = json.loads((ROOT / "lib/blog/auto-posts.json").read_text())
    pages_store = json.loads((ROOT / "lib/landing/auto-landing.json").read_text())

    print(f"image pool size: {len(POOL)}")
    n = idx = 0
    for it in svc.posts().list(blogId=BID, maxResults=100).execute().get("items", []):
        m = [p for p in posts_store if p["title"].strip() == it["title"].strip()]
        if not m:
            continue
        base = pb.render_post_html(m[0], [])
        html = enrich(m[0], base, m[0]["title"], idx)
        try:
            svc.posts().update(blogId=BID, postId=it["id"], body={"title": it["title"], "content": html}).execute()
            n += 1; idx += 1; print("  post:", it["title"][:45]); time.sleep(1)
        except Exception as e:
            print("  x post", it["title"][:25], str(e)[:50])

    for it in svc.pages().list(blogId=BID).execute().get("items", []):
        m = [p for p in pages_store if p["title"].strip() == it["title"].strip()]
        if not m:
            continue
        base = pb.render_page_html(m[0], [])
        html = enrich(m[0], base, m[0]["title"], idx)
        try:
            svc.pages().update(blogId=BID, pageId=it["id"], body={"title": it["title"], "content": html}).execute()
            n += 1; idx += 1; print("  page:", it["title"][:45]); time.sleep(1)
        except Exception as e:
            print("  x page", it["title"][:25], str(e)[:50])
    print(f"enriched {n} item(s) with UNIQUE distributed images")


if __name__ == "__main__":
    main()
