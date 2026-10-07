"""
Generates a reusable SEO package (title options, description, tags,
hashtags, chapter template, thumbnail text ideas, Shorts ideas) per
destination, refreshed every run with the latest keyword-gap data.

Covers destinations with existing videos AND explicitly-configured future
ones with zero videos yet (config.DESTINATIONS) -- the package for a
not-yet-filmed destination leans more on template_opportunities since there's
no real search-gap data for it yet.

Template-based, not LLM-generated -- see analysis/metadata_rewriter.py for
the same design choice and why.
"""
import config
from text_utils import to_hashtag, dedupe_ci, thumbnail_text_ideas, GENERIC_CHAPTER_TEMPLATE, clean_tag_parts

MAX_PACKAGES = 6

_TITLE_TEMPLATES = [
    "{dest} Travel Vlog 2026 | {kw}",
    "{kw} -- {dest} Guide",
    "First Time in {dest}: {kw}",
    "{dest} Diaries: {kw}",
]

_SHORTS_IDEAS_TEMPLATES = [
    "3 things that surprised me in {dest}",
    "{dest} in 60 seconds",
    "Day in my life in {dest}",
    "Biggest mistake tourists make in {dest}",
    "Trying the most famous food in {dest}",
]


def _keywords_for(dest_label, keyword_discovery):
    real_gaps = keyword_discovery.get("gaps_by_destination", {}).get(dest_label, [])
    template_gaps = keyword_discovery.get("template_opportunities_by_destination", {}).get(dest_label, [])
    keywords = [g["term"] for g in real_gaps] + template_gaps
    return keywords or [f"{dest_label} travel"]


def analyze(destination_performance, keyword_discovery, content_planning):
    priority_order = [
        d["destination"] for d in destination_performance.get("destinations", [])
        if d["destination"] != config.UNCLASSIFIED_LABEL
    ]
    top_words = [w for w, _ in content_planning.get("recurring_words_in_top_performers", [])]

    packages = []
    for dest_label in priority_order[:MAX_PACKAGES]:
        keywords = _keywords_for(dest_label, keyword_discovery)
        primary_kw = keywords[0]
        dest_short = dest_label.split("/")[0].strip()

        title_options = [t.format(dest=dest_label, kw=primary_kw.title()) for t in _TITLE_TEMPLATES]

        tag_pool = clean_tag_parts(dest_label) + keywords[:6] + top_words[:4]
        tags = dedupe_ci(tag_pool)[:15]

        hashtags = dedupe_ci([
            to_hashtag(dest_short), *[to_hashtag(k) for k in keywords[:3]], "#travelvlog",
        ])
        hashtags = [h for h in hashtags if h]

        description = "\n".join([
            f"{dest_label} -- {primary_kw}",
            "",
            f"Join me exploring {dest_label}! Full {primary_kw} coming up.",
            "",
            "Subscribe for more travel vlogs.",
            " ".join(hashtags),
        ])

        shorts_ideas = [t.format(dest=dest_label) for t in _SHORTS_IDEAS_TEMPLATES]

        packages.append({
            "destination": dest_label,
            "title_options": title_options,
            "description": description,
            "tags": tags,
            "hashtags": hashtags,
            "chapters_template": GENERIC_CHAPTER_TEMPLATE,
            "thumbnail_text_ideas": thumbnail_text_ideas(dest_short),
            "shorts_ideas": shorts_ideas,
        })

    return {
        "packages": packages,
        "note": (
            "Template-based SEO packages for your top-priority destinations (see "
            "destination_performance), refreshed with the latest keyword-gap data "
            "each run. Chapters are a generic structural starting point -- fill in "
            "real timestamps once the video is cut. Not LLM-generated, not published "
            "anywhere automatically."
        ),
    }
