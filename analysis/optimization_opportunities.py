"""
Flags existing videos worth re-optimizing.

Entirely read-only: produces a list of *suggestions* with reasons. Nothing
here ever calls a write endpoint or stages a change -- see README.md for the
approval-only workflow this feeds into.
"""

MIN_VIEWS_FOR_RETENTION_JUDGEMENT = 50


def analyze(video_catalog, analytics):
    per_video_stats = {r["video"]: r for r in analytics.get("per_video", [])}
    retention_pcts = [
        r["averageViewPercentage"] for r in per_video_stats.values()
        if "averageViewPercentage" in r
    ]
    avg_retention = sum(retention_pcts) / len(retention_pcts) if retention_pcts else None

    opportunities = []
    for v in video_catalog:
        reasons = []
        stats = per_video_stats.get(v["video_id"])

        if stats and avg_retention is not None:
            retention = stats.get("averageViewPercentage")
            windowed_views = stats.get("views", 0)
            if (retention is not None and windowed_views >= MIN_VIEWS_FOR_RETENTION_JUDGEMENT
                    and retention < avg_retention * 0.7):
                reasons.append(
                    f"retention {retention:.1f}% is well below channel average "
                    f"{avg_retention:.1f}% over the last 90 days -- consider a "
                    f"stronger hook in the first 5-10s or re-checking pacing"
                )

        if not v["tags"]:
            reasons.append("no tags set on this video")

        if len(v["description"].strip()) < 50:
            reasons.append("description is very short (<50 chars) -- limited SEO surface")

        title_len = len(v["title"])
        if title_len < 20:
            reasons.append(f"title is short ({title_len} chars) -- may be under-using searchable keyword space")
        elif title_len > 100:
            reasons.append(f"title is long ({title_len} chars) -- may be truncated in search/suggested results")

        if reasons:
            opportunities.append({
                "video_id": v["video_id"],
                "title": v["title"],
                "published_at": v["published_at"],
                "lifetime_views": v["view_count"],
                "reasons": reasons,
            })

    opportunities.sort(key=lambda o: o["lifetime_views"], reverse=True)

    return {
        "channel_avg_retention_pct_90d": avg_retention,
        "opportunities": opportunities,
        "note": "Suggestions only. No titles, descriptions, tags, or thumbnails were changed.",
    }
