"""
Performance History & Tracking

Maintains a daily history of:
- Channel metrics (views, subs, CTR, retention, watch time)
- What recommendations were made each day
- Which recommendations were implemented
- Outcomes (did they improve performance)

Enables learning and continuous optimization.
"""

import json
import os
import datetime


def record_daily_snapshot(analytics, channel_snapshot, video_catalog, all_analyses_results):
    """
    Record today's complete performance snapshot for later comparison.

    Returns path to saved snapshot file.
    """

    snapshot_date = datetime.date.today().isoformat()

    # Calculate key metrics
    daily_metrics = analytics.get("daily", [])[-1] if analytics.get("daily") else {}

    snapshot = {
        "date": snapshot_date,
        "channel_metrics": {
            "subscribers": channel_snapshot.get("subscribers"),
            "lifetime_views": channel_snapshot.get("views"),
            "video_count": len(video_catalog),
            "daily_views": daily_metrics.get("views", 0),
            "daily_subs_gained": daily_metrics.get("subscribersGained", 0),
            "daily_subs_lost": daily_metrics.get("subscribersLost", 0),
            "daily_watch_time_minutes": daily_metrics.get("estimatedMinutesWatched", 0),
        },
        "analytics_summary": {
            "avg_views_per_video": None,
            "avg_retention": None,
            "avg_subs_per_1k_views": None,
        },
        "recommendations_made": {
            "traffic_growth_actions": len(all_analyses_results.get("traffic_growth_actions", {}).get("actions", [])),
            "subscriber_growth_opportunities": len(all_analyses_results.get("subscriber_growth_opportunities", {}).get("cta_recommendations", [])),
            "external_traffic_opportunities": len(all_analyses_results.get("external_traffic_analysis", {}).get("shorts_opportunities", [])),
            "title_thumbnail_concepts": len(all_analyses_results.get("growth_engine", {}).get("candidates", [])),
            "refresh_candidates": len(all_analyses_results.get("older_video_refresh", {}).get("refresh_candidates", [])),
            "new_content_ideas": len(all_analyses_results.get("content_opportunity_engine", {}).get("next_video_ideas", [])),
        },
        "top_5_actions": [],  # Will be populated by unified_prioritizer
    }

    # Calculate averages
    per_video_stats = analytics.get("per_video", [])
    if per_video_stats:
        avg_views = sum(v.get("views", 0) for v in per_video_stats) / len(per_video_stats)
        avg_retention = sum(v.get("averageViewPercentage", 0) for v in per_video_stats if "averageViewPercentage" in v) / len([v for v in per_video_stats if "averageViewPercentage" in v])

        snapshot["analytics_summary"]["avg_views_per_video"] = round(avg_views, 1)
        snapshot["analytics_summary"]["avg_retention"] = round(avg_retention, 1)

    # Save snapshot
    history_dir = os.path.join("data", "performance_history")
    os.makedirs(history_dir, exist_ok=True)

    snapshot_path = os.path.join(history_dir, f"{snapshot_date}.json")
    with open(snapshot_path, "w") as f:
        json.dump(snapshot, f, indent=2)

    return snapshot_path


def get_previous_snapshot(days_back=1):
    """
    Load a previous day's snapshot for comparison.
    """

    target_date = (datetime.date.today() - datetime.timedelta(days=days_back)).isoformat()
    history_dir = os.path.join("data", "performance_history")
    snapshot_path = os.path.join(history_dir, f"{target_date}.json")

    if os.path.exists(snapshot_path):
        with open(snapshot_path) as f:
            return json.load(f)

    return None


def get_metrics_trend(days=7):
    """
    Get a trend of metrics over the last N days.
    """

    history_dir = os.path.join("data", "performance_history")
    if not os.path.exists(history_dir):
        return []

    snapshots = []
    for i in range(days, 0, -1):
        snapshot = get_previous_snapshot(days_back=i)
        if snapshot:
            snapshots.append(snapshot)

    return snapshots


def calculate_metrics_change(current_snapshot, previous_snapshot=None):
    """
    Calculate changes in key metrics from yesterday to today.
    """

    if not previous_snapshot:
        previous_snapshot = get_previous_snapshot(days_back=1)

    if not previous_snapshot:
        return None

    current = current_snapshot["channel_metrics"]
    previous = previous_snapshot["channel_metrics"]

    return {
        "daily_views_change": current["daily_views"] - previous["daily_views"],
        "daily_subs_change": (current["daily_subs_gained"] - current["daily_subs_lost"]) -
                            (previous["daily_subs_gained"] - previous["daily_subs_lost"]),
        "watch_time_change": current["daily_watch_time_minutes"] - previous["daily_watch_time_minutes"],
    }


def analyze(analytics, channel_snapshot, video_catalog, all_analyses_results):
    """
    Record today's performance and compare with history.
    """

    current_snapshot = {
        "date": datetime.date.today().isoformat(),
        "channel_metrics": {
            "subscribers": channel_snapshot.get("subscribers", 0),
            "lifetime_views": channel_snapshot.get("views", 0),
            "video_count": len(video_catalog),
        },
    }

    # Get change from yesterday
    metrics_change = calculate_metrics_change(current_snapshot)

    # Get trend
    trend = get_metrics_trend(days=7)

    # Save today's snapshot
    snapshot_path = record_daily_snapshot(analytics, channel_snapshot, video_catalog, all_analyses_results)

    return {
        "current_snapshot": current_snapshot,
        "metrics_change_from_yesterday": metrics_change,
        "trend_last_7_days": trend,
        "snapshot_saved": snapshot_path,
        "note": "Tracks daily performance to measure impact of recommendations and identify trends."
    }
