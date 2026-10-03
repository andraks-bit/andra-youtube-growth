"""
Subscriber Conversion Analysis

YouTube's public Analytics API does NOT expose per-video subscriber gains
(that data is Studio-only). However, we can:

1. Track overall channel subscriber growth (subscribersGained/Lost daily)
2. Correlate with video releases to measure impact
3. Analyze video characteristics (retention, traffic sources, engagement)
   that correlate with subscriber-heavy days
4. Identify patterns in video topics, length, titles that drive subs

This module calculates:
- Channel subscriber conversion rate (subs per 1,000 views daily)
- Which days had strong/weak subscriber conversion
- Correlations between video characteristics and subscriber growth
- Per-video proxy metrics for subscriber conversion potential
"""

import datetime


def _calculate_daily_metrics(daily_analytics):
    """Calculate daily subscriber conversion metrics."""
    metrics = []

    for day in daily_analytics:
        views = day.get("views", 0)
        subs_gained = day.get("subscribersGained", 0)
        subs_lost = day.get("subscribersLost", 0)
        net_subs = subs_gained - subs_lost

        # Subscriber conversion rate per 1,000 views
        conversion_rate = (subs_gained / views * 1000) if views > 0 else 0

        metrics.append({
            "day": day.get("date"),
            "views": views,
            "subs_gained": subs_gained,
            "subs_lost": subs_lost,
            "net_subs": net_subs,
            "subs_per_1k_views": round(conversion_rate, 2),
        })

    return metrics


def _calculate_channel_stats(daily_metrics):
    """Calculate channel-wide subscriber conversion statistics."""
    if not daily_metrics:
        return None

    total_views = sum(m["views"] for m in daily_metrics)
    total_subs_gained = sum(m["subs_gained"] for m in daily_metrics)
    total_net_subs = sum(m["net_subs"] for m in daily_metrics)

    # Average conversion rate
    avg_conversion = (total_subs_gained / total_views * 1000) if total_views > 0 else 0

    # Best and worst days
    by_conversion = sorted(daily_metrics, key=lambda m: m["subs_per_1k_views"], reverse=True)

    return {
        "period_views": total_views,
        "period_subs_gained": total_subs_gained,
        "period_net_subs": total_net_subs,
        "avg_subs_per_1k_views": round(avg_conversion, 2),
        "best_conversion_day": by_conversion[0] if by_conversion else None,
        "worst_conversion_day": by_conversion[-1] if by_conversion else None,
        "high_conversion_days": [d for d in by_conversion if d["subs_per_1k_views"] > avg_conversion * 1.2][:5],
        "low_conversion_days": [d for d in by_conversion if d["subs_per_1k_views"] < avg_conversion * 0.8][:5],
    }


def _score_video_for_subscriber_potential(video, per_video_stats, traffic_sources, avg_retention):
    """
    Score a video's potential for subscriber conversion based on characteristics.

    High subscriber-conversion indicator patterns:
    - High retention (people watch through to end/CTA)
    - Strong engagement (likes, comments, shares)
    - Specific topics that drive subscribers
    - Good traffic source mix (Search + Browse, not just external)
    """

    stats = per_video_stats.get(video["video_id"], {})
    views = stats.get("views", 0)
    retention = stats.get("averageViewPercentage", 0)
    likes = stats.get("likes", 0)
    comments = stats.get("comments", 0)
    shares = stats.get("shares", 0)

    score = 0
    factors = {}

    # 1. Retention (strong indicator of audience connection)
    if avg_retention and retention > avg_retention:
        retention_factor = (retention / avg_retention) * 20  # Up to 20 points
        score += retention_factor
        factors["retention"] = f"+{retention_factor:.1f} (above avg)"

    # 2. Engagement rate (likes + comments + shares per view)
    total_engagement = likes + comments + shares
    engagement_rate = (total_engagement / views * 1000) if views > 0 else 0
    if engagement_rate > 5:  # 5+ engagements per 1k views is good
        engagement_factor = min(15, engagement_rate)  # Cap at 15 points
        score += engagement_factor
        factors["engagement"] = f"+{engagement_factor:.1f}"

    # 3. View count (more views = more sub opportunities)
    if views > 100:
        view_factor = min(15, (views / 100) * 0.5)  # Scale up to 15 points
        score += view_factor
        factors["reach"] = f"+{view_factor:.1f}"

    # 4. Video length (longer videos = more CTA opportunities)
    duration = video.get("duration_seconds", 0)
    if duration > 600:  # 10+ min videos
        length_factor = 10
        score += length_factor
        factors["length"] = f"+{length_factor:.1f} (long-form)"
    elif duration < 60:  # Shorts
        length_factor = 5
        score += length_factor
        factors["length"] = f"+{length_factor:.1f} (Short)"

    return {
        "video_id": video["video_id"],
        "title": video["title"],
        "score": round(score, 1),
        "factors": factors,
        "views_90d": views,
        "retention_pct": retention,
        "engagement_count": total_engagement,
    }


def analyze(analytics, video_catalog, per_video_stats, traffic_sources):
    """
    Analyze subscriber conversion patterns.

    Args:
        analytics: Full analytics result from analytics_collector
        video_catalog: List of all videos
        per_video_stats: Per-video statistics dict
        traffic_sources: Traffic source breakdown

    Returns:
        {
            "daily_metrics": [...],
            "channel_stats": {...},
            "high_potential_videos": [...],
            "low_potential_videos": [...],
            "note": "..."
        }
    """

    if not analytics or not analytics.get("daily"):
        return {
            "daily_metrics": [],
            "channel_stats": None,
            "high_potential_videos": [],
            "low_potential_videos": [],
            "note": "Insufficient data for subscriber conversion analysis."
        }

    # Calculate daily metrics
    daily_metrics = _calculate_daily_metrics(analytics["daily"])

    # Calculate channel stats
    channel_stats = _calculate_channel_stats(daily_metrics)

    # Score videos for subscriber potential
    avg_retention = channel_stats.get("period_subs_gained", 0) if channel_stats else None
    if avg_retention and not isinstance(avg_retention, (int, float)):
        # Get actual average retention
        retentions = [s.get("averageViewPercentage") for s in per_video_stats.values()
                      if "averageViewPercentage" in s]
        avg_retention = sum(retentions) / len(retentions) if retentions else None

    video_scores = []
    for video in video_catalog:
        if video["video_id"] in per_video_stats:
            score_data = _score_video_for_subscriber_potential(
                video, per_video_stats, traffic_sources, avg_retention
            )
            video_scores.append(score_data)

    video_scores.sort(key=lambda v: v["score"], reverse=True)

    return {
        "daily_metrics": daily_metrics[-30:],  # Last 30 days
        "channel_stats": channel_stats,
        "high_potential_videos": video_scores[:10],
        "low_potential_videos": video_scores[-10:] if len(video_scores) > 10 else [],
        "note": (
            "Subscriber conversion analysis based on channel daily metrics "
            "(subscribersGained/Lost) and per-video characteristics (retention, engagement, views). "
            "Per-video subscriber conversion is estimated from video characteristics, "
            "as YouTube's public API does not expose per-video subscriber gains."
        ),
    }
