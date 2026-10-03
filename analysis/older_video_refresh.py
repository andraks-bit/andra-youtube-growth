"""
Older Video Refresh Analysis

Analyzes videos that haven't received fresh views in 30+ days and identifies
which ones should be refreshed (new title/thumbnail) rather than abandoned.

Uses:
- Video catalog (publish dates, lifetime view counts)
- Analytics (90-day view window, retention data)
- Momentum data (recent view trends)
- Destination performance (topic popularity trends)

Logic:
- A video is a "refresh candidate" if it has:
  1. Been published 30+ days ago (old enough to be "stale")
  2. Above-average retention (content is solid)
  3. Below-average recent views (discoverable but not being found)
  4. Its destination is currently popular (audience wants this topic)
  5. Not in steep decline momentum (worth the effort to refresh)
"""

import datetime
import config


def analyze(video_catalog, analytics, momentum_result, destination_performance):
    """
    Identify older videos that should be refreshed.

    Args:
        video_catalog: List of all videos with publish dates
        analytics: Full analytics result (per_video metrics)
        momentum_result: Output of momentum_tracker.analyze()
        destination_performance: Output of destination_performance.analyze()

    Returns:
        {
            "refresh_candidates": [
                {
                    "video_id": "...",
                    "title": "...",
                    "destination": "...",
                    "days_old": N,
                    "lifetime_views": N,
                    "retention_pct": N,
                    "recent_view_trend": "...",
                    "destination_momentum": "...",
                    "refresh_reason": "...",
                    "impact_estimate": "... views/month if successful",
                }
            ],
            "note": "..."
        }
    """

    per_video_stats = {r["video"]: r for r in analytics.get("per_video", [])}
    momentum_by_video = {
        d["video_id"]: d for d in momentum_result.get("gainers", []) + momentum_result.get("losers", [])
    }
    destination_by_label = {d["destination"]: d for d in destination_performance.get("destinations", [])}

    # Channel-wide stats for comparison
    all_retention_values = [
        s.get("averageViewPercentage") for s in per_video_stats.values()
        if "averageViewPercentage" in s
    ]
    avg_retention = sum(all_retention_values) / len(all_retention_values) if all_retention_values else None

    all_views_90d = [s.get("views", 0) for s in per_video_stats.values()]
    avg_views_90d = sum(all_views_90d) / len(all_views_90d) if all_views_90d else 0

    today = datetime.date.today()
    candidates = []

    for video in video_catalog:
        video_id = video["video_id"]
        # Handle ISO format with 'Z' timezone suffix
        published_str = video["published_at"]
        if published_str.endswith("Z"):
            published_str = published_str[:-1]
        published = datetime.datetime.fromisoformat(published_str).date()
        days_old = (today - published).days

        # Filter 1: At least 30 days old
        if days_old < 30:
            continue

        # Get performance stats
        stats = per_video_stats.get(video_id, {})
        retention = stats.get("averageViewPercentage")
        views_90d = stats.get("views", 0)

        # Filter 2: Must have retention data and be above channel average
        if retention is None or avg_retention is None or retention < avg_retention:
            continue

        # Filter 3: Must have below-average recent views (not already getting traffic)
        if views_90d >= avg_views_90d:
            continue

        # Filter 4: Get destination and check if it's in-demand
        destination_label = next(
            (d["destination"] for d in destination_performance.get("destinations", [])
             if any(dv["video_id"] == video_id for dv in video_catalog)),
            None
        )
        if not destination_label:
            continue

        dest_perf = destination_by_label.get(destination_label)
        if not dest_perf or dest_perf.get("priority_score", 0) < 0.3:
            # Destination not in top performers, not worth refresh
            continue

        # Filter 5: Not in steep decline
        momentum = momentum_by_video.get(video_id)
        if momentum and momentum.get("delta", 0) < -50:  # Losing >50 views/90d
            continue

        # Determine impact estimate
        impact_estimate = ""
        if views_90d > 0 and retention:
            estimated_monthly = (views_90d / 90) * 30
            impact_estimate = f"~{int(estimated_monthly*2)}-{int(estimated_monthly*4)} views/month if title/thumbnail improved"

        recent_trend = ""
        if momentum:
            if momentum.get("delta", 0) > 0:
                recent_trend = f"gaining momentum ({momentum['delta']:+d} views/90d)"
            else:
                recent_trend = f"stable ({momentum['delta']:+d} views/90d)"
        else:
            recent_trend = "stable (no recent trend data)"

        reason = ""
        if retention > avg_retention * 1.1:
            reason = f"Strong retention ({retention:.0f}%) but low recent reach -- better title/thumbnail could increase discovery"
        else:
            reason = f"Solid retention ({retention:.0f}%) with low recent reach -- worth a refresh"

        candidates.append({
            "video_id": video_id,
            "title": video["title"],
            "destination": destination_label,
            "days_old": days_old,
            "lifetime_views": video.get("view_count", 0),
            "retention_pct": round(retention, 1),
            "recent_views_90d": views_90d,
            "recent_trend": recent_trend,
            "destination_momentum": dest_perf.get("momentum_90d_view_delta", 0),
            "refresh_reason": reason,
            "impact_estimate": impact_estimate,
            "score": retention * (avg_views_90d / (views_90d + 1)),  # High retention + low recent views
        })

    candidates.sort(key=lambda c: c["score"], reverse=True)

    return {
        "refresh_candidates": candidates[:8],  # Top 8 candidates
        "note": (
            "Videos 30+ days old with above-average retention but below-average recent views, "
            "in destinations that are currently performing well. "
            "These are worth considering for a title/thumbnail refresh rather than abandonment. "
            "Score = retention × (avg views / recent views) -- higher = better refresh candidate."
        ),
    }
