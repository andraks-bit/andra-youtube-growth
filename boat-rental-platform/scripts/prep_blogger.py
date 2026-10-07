#!/usr/bin/env python3
"""Prepare image-rich Blogger HTML for ONE post/page and copy it to the clipboard.

Blogger crossposts must always include images. This builds the full HTML the way
the automated publisher does (hero image + inline images + topical related links
+ affiliate CTA + FAQs), entity-encodes non-ASCII (paste-safe), writes /tmp/bp.html
and copies it via pbcopy.

Usage:
  python3 scripts/prep_blogger.py post <slug>
  python3 scripts/prep_blogger.py page <slug>
"""
import importlib.util, json, pathlib, re, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("pb", ROOT / "scripts" / "post_blogger.py")
pb = importlib.util.module_from_spec(spec); spec.loader.exec_module(pb)
pb.load_env()

BLOG = ROOT / "lib" / "blog" / "auto-posts.json"
LAND = ROOT / "lib" / "landing" / "auto-landing.json"


def hero_img(url, alt):
    return (f'<p><img src="{url}" alt="{alt}" '
            f'style="max-width:100%;height:auto" /></p>') if url else ""


def main():
    kind, slug = sys.argv[1], sys.argv[2]
    if kind == "post":
        p = next(x for x in json.loads(BLOG.read_text()) if x["slug"] == slug)
        body = pb.render_post_html(p, [])
        title = p["title"]
    else:
        p = next(x for x in json.loads(LAND.read_text()) if x["slug"] == slug)
        body = pb.render_page_html(p, [])
        title = p["title"]

    # Guarantee a prominent hero image at the very top (heroImage is a reliable
    # boat photo) — prepend it if the rendered body doesn't already start with an img.
    html = body
    if p.get("heroImage") and p["heroImage"] not in html[:400]:
        html = hero_img(p["heroImage"], title) + "\n" + html

    # entity-encode non-ASCII so the clipboard paste stays clean
    html = "".join(c if ord(c) < 128 else f"&#{ord(c)};" for c in html)
    (pathlib.Path("/tmp/bp.html")).write_text(html)
    subprocess.run(["pbcopy"], input=html.encode(), check=True)
    n_img = html.count("<img ")
    print(f"TITLE: {title}")
    print(f"images: {n_img}  | chars: {len(html)}  | copied to clipboard")


if __name__ == "__main__":
    main()
