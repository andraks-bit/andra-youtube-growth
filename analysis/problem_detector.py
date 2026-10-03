"""
Problem Detection - Find underperforming & declining content.
"""


def analyze(analytics, video_catalog, per_video_stats, momentum_result):
    """Find videos with problems that need attention."""

    per_video = {v.get("video"): v for v in analytics.get("per_video", [])}
    momentum_by_id = {v["video_id"]: v for v in momentum_result.get("losers", []) + momentum_result.get("gainers", [])}

    problems = []

    # Find declining videos (momentum losers with significant decline)
    for loser in momentum_result.get("losers", [])[:5]:
        vid = next((v for v in video_catalog if v["video_id"] == loser["video_id"]), None)
        if vid and loser.get("delta", 0) < -100:
            problems.append({
                "type": "declining_video",
                "video_id": vid["video_id"],
                "title": vid["title"],
                "decline": f"{loser['delta']:+d} views (90d)",
                "action": "Consider refresh or removal from recommendations"
            })

    # Find high-view, low-retention videos
    avg_retention = sum(v.get("averageViewPercentage", 0) for v in per_video.values() if "averageViewPercentage" in v) / len([v for v in per_video.values() if "averageViewPercentage" in v]) if per_video else 0

    for vid in video_catalog:
        stats = per_video.get(vid["video_id"], {})
        if stats.get("views", 0) > 200 and stats.get("averageViewPercentage", 0) < avg_retention * 0.7:
            problems.append({
                "type": "poor_retention",
                "video_id": vid["video_id"],
                "title": vid["title"],
                "retention": f"{stats.get('averageViewPercentage', 0):.0f}% (vs {avg_retention:.0f}% avg)",
                "action": "Review title/thumbnail - content may not match promise"
            })

    # Find low-engagement videos
    for vid in video_catalog[:50]:
        stats = per_video.get(vid["video_id"], {})
        views = stats.get("views", 0)
        engagement = stats.get("likes", 0) + stats.get("comments", 0) + stats.get("shares", 0)
        if views > 100 and engagement < 5:
            problems.append({
                "type": "low_engagement",
                "video_id": vid["video_id"],
                "title": vid["title"],
                "engagement": f"{engagement} total (views: {views})",
                "action": "Boost with CTAs, cards, end screens"
            })

    return {
        "problems_detected": problems[:10],
        "critical_count": len([p for p in problems if p["type"] == "declining_video"]),
        "note": "Proactive problem detection. Act on critical issues first."
    }
