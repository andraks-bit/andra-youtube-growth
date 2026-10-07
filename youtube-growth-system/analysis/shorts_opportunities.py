"""
Shorts vs long-form performance comparison and repurposing candidates.

The Data API has no explicit "is this a Short" flag, so
video["is_likely_short"] is a duration-based heuristic (<= config.
SHORTS_MAX_DURATION_SECONDS) computed in collectors/video_catalog.py. This
is flagged wherever it's surfaced.
"""


def analyze(video_catalog, analytics):
    per_video_stats = {r["video"]: r for r in analytics.get("per_video", [])}

    def bucket(is_short):
        vids = [v for v in video_catalog if v["is_likely_short"] == is_short]
        if not vids:
            return {"count": 0}
        avg_views = sum(v["view_count"] for v in vids) / len(vids)
        retentions = [
            per_video_stats[v["video_id"]]["averageViewPercentage"]
            for v in vids
            if v["video_id"] in per_video_stats
            and "averageViewPercentage" in per_video_stats[v["video_id"]]
        ]
        avg_retention = sum(retentions) / len(retentions) if retentions else None
        return {
            "count": len(vids),
            "avg_lifetime_views": round(avg_views, 1),
            "avg_retention_pct_90d": round(avg_retention, 1) if avg_retention is not None else None,
        }

    shorts_stats = bucket(True)
    longform_stats = bucket(False)

    # Repurposing candidates: long-form videos with above-average retention
    # (a strong hook/segment likely exists worth clipping into a Short).
    longform = [v for v in video_catalog if not v["is_likely_short"]]
    repurpose_candidates = []
    if longform_stats.get("avg_retention_pct_90d"):
        threshold = longform_stats["avg_retention_pct_90d"]
        for v in longform:
            stats = per_video_stats.get(v["video_id"])
            if not stats or "averageViewPercentage" not in stats:
                continue
            if stats["averageViewPercentage"] > threshold and stats.get("views", 0) >= 20:
                repurpose_candidates.append({
                    "video_id": v["video_id"],
                    "title": v["title"],
                    "retention_pct_90d": stats["averageViewPercentage"],
                    "duration_seconds": v["duration_seconds"],
                })
    repurpose_candidates.sort(key=lambda c: c["retention_pct_90d"], reverse=True)

    return {
        "shorts": shorts_stats,
        "long_form": longform_stats,
        "repurpose_candidates": repurpose_candidates[:10],
        "note": (
            "'is_likely_short' is a <=180s duration heuristic, not an "
            "official YouTube flag -- the public API does not expose one."
        ),
    }
