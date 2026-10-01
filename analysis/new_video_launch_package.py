"""
Full launch package generated automatically the moment collectors/
new_video_detector.py notices a video that wasn't in yesterday's snapshot --
this is what makes "analyze new uploads without starting Claude manually"
concretely useful rather than just a notification.
"""
import datetime

import destinations
from text_utils import to_hashtag, dedupe_ci, thumbnail_text_ideas, GENERIC_CHAPTER_TEMPLATE, clean_tag_parts

_TITLE_TEMPLATES = [
    "{dest} Travel Vlog 2026 | {kw}",
    "{kw} -- {dest} Guide",
    "First Time in {dest}: {kw}",
]
_SHORTS_PROMO_TEMPLATES = [
    "3 things that surprised me in {dest} -- full story linked below",
    "{dest} in 60 seconds -- full vlog on the channel",
]

_WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def _best_publish_day(video_catalog):
    by_day = {}
    for v in video_catalog:
        try:
            dt = datetime.datetime.fromisoformat(v["published_at"].replace("Z", "+00:00"))
        except ValueError:
            continue
        by_day.setdefault(dt.weekday(), []).append(v["view_count"])

    averages = {d: sum(views) / len(views) for d, views in by_day.items() if len(views) >= 2}
    if not averages:
        return None
    best_day = max(averages, key=averages.get)
    return {
        "day": _WEEKDAY_NAMES[best_day],
        "avg_lifetime_views": round(averages[best_day], 1),
        "sample_size": len(by_day[best_day]),
    }


def analyze(new_videos, video_catalog, keyword_discovery, suggested_video_strategy):
    by_id = {v["video_id"]: v for v in video_catalog}
    publish_day = _best_publish_day(video_catalog)

    clusters_by_dest = {c["destination"]: c for c in suggested_video_strategy.get("clusters", [])}

    packages = []
    for nv in new_videos.get("new_videos", []):
        video = by_id.get(nv["video_id"])
        if not video:
            continue
        dest_key = destinations.classify(video)
        dest_label = destinations.label_for(dest_key)

        real_gaps = keyword_discovery.get("gaps_by_destination", {}).get(dest_label, [])
        template_gaps = keyword_discovery.get("template_opportunities_by_destination", {}).get(dest_label, [])
        keywords = [g["term"] for g in real_gaps] + template_gaps or [f"{dest_label} travel"]
        primary_keyword = keywords[0]
        secondary_keywords = keywords[1:5]

        title_options = [t.format(dest=dest_label, kw=primary_keyword.title()) for t in _TITLE_TEMPLATES]
        dest_short = dest_label.split("/")[0].strip()

        tags = dedupe_ci(clean_tag_parts(dest_label) + keywords[:6])[:15]
        hashtags = [h for h in dedupe_ci(
            [to_hashtag(dest_short)] + [to_hashtag(k) for k in keywords[:3]] + ["#travelvlog"]
        ) if h]

        description = "\n".join([
            f"{dest_label} -- {primary_keyword}",
            "",
            f"Join me exploring {dest_label}! Full {primary_keyword} in this video.",
            "",
            "Subscribe for more travel vlogs.",
            " ".join(hashtags),
        ])

        cluster = clusters_by_dest.get(dest_label)
        related_videos = []
        internal_links_note = "No other videos in this destination cluster yet."
        if cluster:
            related_videos = [
                p["to_title"] for p in cluster["recommended_pairs"]
                if p["from_video_id"] != nv["video_id"]
            ][:3] or [cluster["hub_video"]["title"]]
            internal_links_note = cluster["description_link_text"]

        packages.append({
            "video_id": nv["video_id"],
            "title": nv["title"],
            "destination": dest_label,
            "primary_keyword": primary_keyword,
            "secondary_keywords": secondary_keywords,
            "title_options": title_options,
            "description": description,
            "tags": tags,
            "hashtags": hashtags,
            "thumbnail_concepts": thumbnail_text_ideas(dest_short),
            "chapters_template": GENERIC_CHAPTER_TEMPLATE,
            "related_videos_to_link": related_videos,
            "shorts_ideas_to_promote_this_video": [t.format(dest=dest_label) for t in _SHORTS_PROMO_TEMPLATES],
            "suggested_internal_links": internal_links_note,
            "recommended_publishing_optimization": publish_day,
        })

    return {
        "packages": packages,
        "note": (
            "Generated automatically for every video detected as new since the last run -- "
            "no manual trigger needed. recommended_publishing_optimization is a real heuristic "
            "(this channel's own historical day-of-week vs average lifetime views), not external "
            "platform data."
        ),
    }
