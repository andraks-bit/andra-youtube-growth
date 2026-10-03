"""
Subscriber Growth Tracking & Measurement

Tracks subscriber growth daily and weekly to measure:
- Overall channel subscriber growth trend
- Correlation between video releases and subscriber spikes
- Which content types/destinations increase subscriber growth
- Moving average subscriber conversion rate
- Impact of implemented recommendations
"""

import datetime
import json


def _calculate_moving_average(values, window=7):
    """Calculate simple moving average."""
    if len(values) < window:
        return values

    result = []
    for i in range(len(values)):
        start = max(0, i - window + 1)
        avg = sum(values[start:i+1]) / (i - start + 1)
        result.append(round(avg, 2))
    return result


def analyze(analytics, video_catalog, channel_snapshot_history=None):
    """
    Track subscriber growth trends.

    Args:
        analytics: Current analytics result
        video_catalog: List of all videos (sorted by publish date for alignment)
        channel_snapshot_history: List of historical channel snapshots (if available)

    Returns:
        {
            "current_metrics": {...},
            "daily_trend": [...],
            "weekly_trend": [...},
            "subscriber_velocity": {...},
            "benchmark_data": {...},
            "note": "..."
        }
    """

    # Current metrics
    daily = analytics.get("daily", [])
    if not daily:
        return {
            "current_metrics": None,
            "daily_trend": [],
            "weekly_trend": [],
            "note": "Insufficient data for tracking."
        }

    latest_day = daily[-1] if daily else {}
    current_subs_gained = latest_day.get("subscribersGained", 0)
    current_subs_lost = latest_day.get("subscribersLost", 0)
    current_net = current_subs_gained - current_subs_lost
    current_views = latest_day.get("views", 0)

    # Calculate conversion rate
    conversion_rate = (current_subs_gained / current_views * 1000) if current_views > 0 else 0

    current_metrics = {
        "date": latest_day.get("date"),
        "subs_gained_today": current_subs_gained,
        "subs_lost_today": current_subs_lost,
        "net_subs_today": current_net,
        "subs_per_1k_views_today": round(conversion_rate, 2),
        "views_today": current_views,
    }

    # Daily trend (last 30 days)
    daily_subs_gained = [d.get("subscribersGained", 0) for d in daily]
    daily_net = [d.get("subscribersGained", 0) - d.get("subscribersLost", 0) for d in daily]
    daily_conversion = [
        (d.get("subscribersGained", 0) / (d.get("views", 1)) * 1000) if d.get("views", 0) > 0 else 0
        for d in daily
    ]

    # Moving averages
    avg_subs_gained = _calculate_moving_average(daily_subs_gained, window=7)
    avg_net_subs = _calculate_moving_average(daily_net, window=7)
    avg_conversion = _calculate_moving_average(daily_conversion, window=7)

    daily_trend = [
        {
            "date": d.get("date"),
            "subs_gained": d.get("subscribersGained", 0),
            "net_subs": d.get("subscribersGained", 0) - d.get("subscribersLost", 0),
            "subs_per_1k_views": round((d.get("subscribersGained", 0) / (d.get("views", 1)) * 1000) if d.get("views") else 0, 2),
            "views": d.get("views", 0),
        }
        for d in daily[-30:]
    ]

    # Weekly trend
    weeks = {}
    for day in daily:
        date_obj = datetime.datetime.fromisoformat(day["date"])
        week_start = date_obj - datetime.timedelta(days=date_obj.weekday())
        week_key = week_start.isoformat()

        if week_key not in weeks:
            weeks[week_key] = {
                "subs_gained": 0,
                "subs_lost": 0,
                "views": 0,
                "days": 0,
            }

        weeks[week_key]["subs_gained"] += day.get("subscribersGained", 0)
        weeks[week_key]["subs_lost"] += day.get("subscribersLost", 0)
        weeks[week_key]["views"] += day.get("views", 0)
        weeks[week_key]["days"] += 1

    weekly_trend = []
    for week_key in sorted(weeks.keys())[-12:]:  # Last 12 weeks
        week_data = weeks[week_key]
        net = week_data["subs_gained"] - week_data["subs_lost"]
        conversion = (week_data["subs_gained"] / week_data["views"] * 1000) if week_data["views"] > 0 else 0

        weekly_trend.append({
            "week_start": week_key,
            "subs_gained": week_data["subs_gained"],
            "net_subs": net,
            "views": week_data["views"],
            "subs_per_1k_views": round(conversion, 2),
            "avg_daily_subs": round(week_data["subs_gained"] / week_data["days"], 1),
        })

    # Subscriber velocity (trend)
    if len(weekly_trend) >= 2:
        recent_net = weekly_trend[-1]["net_subs"]
        previous_net = weekly_trend[-2]["net_subs"]
        velocity = recent_net - previous_net
        velocity_pct = (velocity / previous_net * 100) if previous_net > 0 else 0
        direction = "accelerating 📈" if velocity > 0 else "declining 📉" if velocity < 0 else "stable →"
    else:
        velocity = 0
        velocity_pct = 0
        direction = "insufficient data"

    subscriber_velocity = {
        "latest_week_net_subs": weekly_trend[-1]["net_subs"] if weekly_trend else 0,
        "previous_week_net_subs": weekly_trend[-2]["net_subs"] if len(weekly_trend) > 1 else 0,
        "velocity_change": velocity,
        "velocity_pct_change": round(velocity_pct, 1),
        "trend_direction": direction,
    }

    # Benchmark: what's our target?
    total_views_period = sum(d.get("views", 0) for d in daily)
    total_subs_gained_period = sum(d.get("subscribersGained", 0) for d in daily)
    avg_conversion_rate = (total_subs_gained_period / total_views_period * 1000) if total_views_period > 0 else 0

    benchmark_data = {
        "period_days": len(daily),
        "total_views": total_views_period,
        "total_subs_gained": total_subs_gained_period,
        "avg_subs_per_1k_views": round(avg_conversion_rate, 2),
        "daily_avg_subs": round(total_subs_gained_period / len(daily), 1) if daily else 0,
    }

    return {
        "current_metrics": current_metrics,
        "daily_trend": daily_trend,
        "weekly_trend": weekly_trend,
        "subscriber_velocity": subscriber_velocity,
        "benchmark_data": benchmark_data,
        "note": (
            "Daily and weekly subscriber growth tracking. "
            "Shows conversion rate (subscribers per 1,000 views) and velocity trends. "
            "Use to measure impact of implemented recommendations."
        ),
    }
