"""
Content-planning signal: what's actually working, distilled from real
performance data rather than guesswork, to inform future video topics.

Rule-based, not ML -- at 203 videos / 142 subscribers there isn't enough
volume to justify anything fancier, and a transparent rule set is easier
for a human to sanity-check and override.
"""
import re
from collections import Counter

_STOPWORDS = {
    "the", "a", "an", "and", "or", "my", "me", "i", "in", "of", "to", "for",
    "with", "on", "at", "is", "it", "this", "that", "you", "your", "first",
    "time", "out", "now",
}


def _title_tokens(title):
    words = re.findall(r"[a-zA-Z]{3,}", title.lower())
    return [w for w in words if w not in _STOPWORDS]


def analyze(video_catalog, analytics):
    per_video_stats = {r["video"]: r for r in analytics.get("per_video", [])}

    scored = []
    for v in video_catalog:
        stats = per_video_stats.get(v["video_id"])
        windowed_views = stats.get("views", 0) if stats else 0
        scored.append((windowed_views, v))
    scored.sort(key=lambda t: t[0], reverse=True)

    top_n = [v for _, v in scored[:10] if _ > 0] or [v for _, v in scored[:10]]
    bottom_n = [v for _, v in scored[-10:]]

    top_words = Counter()
    for v in top_n:
        top_words.update(_title_tokens(v["title"]))

    top_sources = analytics.get("traffic_sources", [])[:5]
    top_countries = analytics.get("geography", [])[:5]
    top_devices = analytics.get("devices", [])

    return {
        "top_performing_recent_videos": [
            {"video_id": v["video_id"], "title": v["title"],
             "views_90d": per_video_stats.get(v["video_id"], {}).get("views", 0)}
            for v in top_n
        ],
        "recurring_words_in_top_performers": top_words.most_common(10),
        "audience_context": {
            "top_traffic_sources": top_sources,
            "top_countries": top_countries,
            "device_breakdown": top_devices,
        },
        "note": (
            "recurring_words_in_top_performers highlights terms common in "
            "titles of the best-performing recent videos (by 90-day views) "
            "-- a starting point for topic ideation, not a guarantee."
        ),
    }
