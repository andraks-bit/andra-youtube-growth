#!/usr/bin/env python3
"""One-off maintenance:
  1) Quarantine thin landing pages (<MIN_WORDS) out of the live store.
  2) Rebuild internal linking across ALL kept blogs + landings so every quality
     landing page (incl. new ones) is woven into the hub-and-spoke "Related guides"
     cluster, and every page has exactly one homepage link.

Writes:
  lib/landing/auto-landing.json        (kept, relinked)
  lib/landing/quarantine-landing.json  (removed thin pages, recoverable)
  lib/blog/auto-posts.json             (relinked)
"""
from __future__ import annotations
import json, pathlib, re, importlib.util

ROOT = pathlib.Path(__file__).resolve().parents[1]
BLOG = ROOT / "lib" / "blog" / "auto-posts.json"
LAND = ROOT / "lib" / "landing" / "auto-landing.json"
QUAR = ROOT / "lib" / "landing" / "quarantine-landing.json"
MIN_WORDS = 2000

EXEMPT = {
    "list-your-boat-marbella","list-your-yacht-marbella","list-your-jet-ski-marbella",
    "list-your-sailboat-marbella","list-your-catamaran-marbella",
    "peer-to-peer-boat-rental-marbella","boat-rental-insurance-spain",
    "start-boat-rental-business-marbella","boat-rental-malaga","boat-rental-estepona",
    "boat-rental-sotogrande","mediterranean-bareboat-charter-marbella",
    "airbnb-for-boats","how-much-can-i-earn-renting-my-boat","boat-charter-management",
    "how-to-rent-out-your-boat","boat-rental-insurance-us",
    "boatsetter-alternative","click-and-boat-alternative","getmyboat-alternative",
    "samboat-alternative","borrow-a-boat-uk-alternative",
}


TAG = re.compile(r"<[^>]+>")
def wc(h: str) -> int:
    return len(TAG.sub(" ", h or "").split())

# reuse the generator's relink logic
spec = importlib.util.spec_from_file_location("gc", ROOT / "scripts" / "generate_content.py")
gc = importlib.util.module_from_spec(spec); spec.loader.exec_module(gc)

# Strip previously-appended "Related guides" block + affiliate CTA so we can re-add fresh.
REL = re.compile(r"\n?<h2>Related guides</h2>\s*<ul>.*?</ul>", re.S)
AFF = re.compile(r"\n?<p><strong>Own a boat\?</strong>.*?</p>", re.S)
def strip_related(html: str) -> str:
    return AFF.sub("", REL.sub("", html or "")).rstrip()


def main():
    blogs = json.loads(BLOG.read_text())
    lands = json.loads(LAND.read_text())

    # 1) Quarantine thin landings
    keep, quarantine = [], []
    for p in lands:
        body = (p.get("intro", "") or "") + (p.get("bodyHtml", "") or "")
        (keep if (p.get("slug") in EXEMPT or wc(body) >= MIN_WORDS) else quarantine).append(p)
    LAND.write_text(json.dumps(keep, ensure_ascii=False, indent=2) + "\n")
    existing_q = json.loads(QUAR.read_text()) if QUAR.exists() else []
    QUAR.write_text(json.dumps(existing_q + quarantine, ensure_ascii=False, indent=2) + "\n")
    print(f"quarantined {len(quarantine)} thin landings; kept {len(keep)}")

    # 2) CANNIBALIZATION: cluster landings by normalized keyword token-set; within
    #    each exact-match cluster pick a primary and canonicalize the rest to it.
    STOPK = {"the","a","an","in","to","of","for","and","your","with",
             "boat","boats","hire","rental","rentals","charter","rent","yacht","yachts"}
    def kt(s):
        return frozenset(w for w in re.findall(r"[a-z0-9]+", (s or "").lower())
                         if w not in STOPK and len(w) > 2)
    clusters = {}
    for p in keep:
        clusters.setdefault(kt(p.get("keyword") or p.get("h1") or p["title"]), []).append(p)
    canon_count = 0
    for key, group in clusters.items():
        if not key or len(group) < 2:
            for p in group:
                p.pop("canonicalSlug", None)
            continue
        # primary = longest body (most authoritative); others canonicalize to it
        primary = max(group, key=lambda p: len((p.get("bodyHtml") or "")))
        for p in group:
            if p["slug"] == primary["slug"]:
                p.pop("canonicalSlug", None)
            else:
                p["canonicalSlug"] = primary["slug"]
                canon_count += 1
    print(f"cannibalization: {canon_count} variant pages canonicalized to a primary")

    # 3) Rebuild internal links: homepage + distributed related + AFFILIATE/money links.
    AFFILIATE = [s for s in (
        "list-your-boat-marbella","how-much-can-i-earn-renting-my-boat","airbnb-for-boats",
        "boatsetter-alternative","click-and-boat-alternative","getmyboat-alternative",
        "samboat-alternative","borrow-a-boat-uk-alternative","become-a-host",
    )]
    aff_pool = []
    have_slugs = {p["slug"] for p in keep}
    for s in AFFILIATE:
        if s == "become-a-host":
            aff_pool.append({"href": "/become-a-host", "anchor": "List your boat & earn"})
        elif s in have_slugs:
            lp = next(p for p in keep if p["slug"] == s)
            aff_pool.append({"href": f"/{s}/", "anchor": lp.get("h1") or lp["title"]})

    # HYBRID TOPICAL + DISTRIBUTED linking.
    #  - N_TOPIC links to the most topically-related pages (shared city / boat
    #    category) -> builds topic clusters (e.g. jet-ski pages link to jet-ski
    #    pages and jet-ski blog posts).
    #  - N_DIST distributed rotating links -> guarantees no orphans + spreads equity.
    N_TOPIC, N_DIST = 4, 2
    STOPT = {"the","a","an","in","to","of","for","and","your","with","best","guide",
             "tips","day","near","me","how","what","you","rent"}
    def topic_tokens(text):
        return {w for w in re.findall(r"[a-z0-9]+", (text or "").lower())
                if w not in STOPT and len(w) > 2}

    pool = ([{"href": f"/blog/{p['slug']}/", "anchor": p["title"],
              "tok": topic_tokens(f"{p['slug']} {p.get('primary_keyword','')} {p['title']}"),
              "is_blog": True} for p in blogs] +
            [{"href": f"/{p['slug']}/", "anchor": p.get("h1") or p["title"],
              "tok": topic_tokens(f"{p['slug']} {p.get('keyword','')} {p.get('h1') or p['title']}"),
              "is_blog": False} for p in keep])
    M = len(pool)

    def related_block(idx: int, self_href: str, self_tok: set) -> str:
        picks, used = [], {self_href}
        # (a) topical: rank others by shared-token overlap; prefer a blog among them
        scored = sorted(
            (c for c in pool if c["href"] not in used and self_tok & c["tok"]),
            key=lambda c: len(self_tok & c["tok"]), reverse=True,
        )
        for c in scored:
            if len(picks) >= N_TOPIC:
                break
            picks.append(c); used.add(c["href"])
        # ensure at least one BLOG link in the cluster when available
        if not any(c["is_blog"] for c in picks):
            for c in scored:
                if c["is_blog"] and c["href"] not in used:
                    picks.append(c); used.add(c["href"]); break
        # (b) distributed: fill remaining slots from rotating window (no orphans)
        k = 1
        while len(picks) < N_TOPIC + N_DIST and k <= M:
            c = pool[(idx * (N_TOPIC + N_DIST) + k) % M]
            if c["href"] not in used:
                picks.append(c); used.add(c["href"])
            k += 1
        items = "".join(f'<li><a href="{x["href"]}">{x["anchor"]}</a></li>' for x in picks)
        block = f'\n<h2>Related guides</h2>\n<ul>{items}</ul>'
        # rotate in 1 affiliate/money link per page (distributed) as a CTA
        if aff_pool:
            a = aff_pool[idx % len(aff_pool)]
            if a["href"] != self_href:
                block += (f'\n<p><strong>Own a boat?</strong> '
                          f'<a href="{a["href"]}">{a["anchor"]}</a>.</p>')
        return block

    def ensure_home(html: str) -> str:
        if 'href="/"' in html:
            return html
        if re.search(r"(?<!>)BoatHire24(?!<)", html):
            return re.sub(r"(?<!>)BoatHire24(?!<)", '<a href="/">BoatHire24</a>', html, count=1)
        return '<p>Browse the full fleet at <a href="/">BoatHire24</a>.</p>\n' + html

    for i, p in enumerate(blogs):
        c = ensure_home(strip_related(p["content"]))
        tok = topic_tokens(f"{p['slug']} {p.get('primary_keyword','')} {p['title']}")
        p["content"] = c + related_block(i, f"/blog/{p['slug']}/", tok)
    BLOG.write_text(json.dumps(blogs, ensure_ascii=False, indent=2) + "\n")

    for i, p in enumerate(keep):
        b = ensure_home(strip_related(p.get("bodyHtml", "")))
        tok = topic_tokens(f"{p['slug']} {p.get('keyword','')} {p.get('h1') or p['title']}")
        p["bodyHtml"] = b + related_block(len(blogs) + i, f"/{p['slug']}/", tok)

    # Orphan sweep: guarantee every page receives >=1 inbound link. Any page with
    # zero inbound gets injected into the related list of a different page.
    def all_targets():
        t = set()
        for p in blogs:
            t.update(re.findall(r'href="(/[^"]+)"', p["content"]))
        for p in keep:
            t.update(re.findall(r'href="(/[^"]+)"', p["bodyHtml"]))
        return t
    targets = all_targets()
    everything = ([("blog", p) for p in blogs] + [("land", p) for p in keep])
    for j, (kind, p) in enumerate(everything):
        href = f"/blog/{p['slug']}/" if kind == "blog" else f"/{p['slug']}/"
        if href in targets:
            continue
        anchor = p["title"] if kind == "blog" else (p.get("h1") or p["title"])
        host = everything[(j + 1) % len(everything)][1]  # a different page
        field = "content" if "content" in host else "bodyHtml"
        host_field = "content" if host in blogs else "bodyHtml"
        host[host_field] = host[host_field].replace(
            "</ul>", f'<li><a href="{href}">{anchor}</a></li></ul>', 1)
        targets.add(href)

    BLOG.write_text(json.dumps(blogs, ensure_ascii=False, indent=2) + "\n")
    LAND.write_text(json.dumps(keep, ensure_ascii=False, indent=2) + "\n")

    # report
    def homecov(items, body):
        return sum(1 for p in items if 'href="/"' in body(p))
    print(f"relinked: blogs={len(blogs)} (homepage {homecov(blogs, lambda p:p['content'])}/{len(blogs)}), "
          f"landings={len(keep)} (homepage {homecov(keep, lambda p:p['bodyHtml'])}/{len(keep)}), "
          f"affiliate-link pool={len(aff_pool)}")


if __name__ == "__main__":
    main()
