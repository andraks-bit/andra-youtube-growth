"""
Phase 6: Unified Growth Metrics & Performance Tracking.

Aggregates all growth signals into one unified dashboard:
- Growth velocity (views/subs increasing or declining?)
- ROI of each optimization type
- Traffic quality (which sources convert to subscribers?)
- Content efficiency (views per hour of effort)
"""


def calculate_growth_velocity(current_week, previous_week):
    """Calculate whether growth is accelerating or declining."""

    velocity = {}

    for metric in ["views", "subscribers", "watch_time_hours"]:
        current = current_week.get(metric, 0)
        previous = previous_week.get(metric, 0)

        if previous > 0:
            week_over_week_percent = ((current - previous) / previous) * 100
            velocity[metric] = {
                "current": current,
                "previous": previous,
                "week_over_week_change_percent": week_over_week_percent,
                "trend": "accelerating" if week_over_week_percent > 0 else "declining",
            }

    return velocity


def calculate_roi_by_action_type(actions_taken, resulting_metrics):
    """Calculate ROI: what growth did each type of action produce?"""

    roi = {}

    for action in actions_taken:
        action_type = action.get("type")
        effort_hours = action.get("effort_hours", 1)
        resulting_views = resulting_metrics.get(f"{action_type}_views", 0)

        roi[action_type] = {
            "effort_hours": effort_hours,
            "views_generated": resulting_views,
            "views_per_hour": resulting_views / max(effort_hours, 1),
            "subscribers_generated": resulting_metrics.get(f"{action_type}_subscribers", 0),
        }

    return roi


def calculate_traffic_quality(analytics_data):
    """Identify which traffic sources convert to subscribers."""

    traffic_sources = analytics_data.get("traffic_sources", [])

    quality_metrics = {}
    for source in traffic_sources:
        source_type = source.get("insightTrafficSourceType")
        views = source.get("views", 0)
        subscribers_gained = source.get("subscribers_gained", 0)

        quality_metrics[source_type] = {
            "views": views,
            "subscribers": subscribers_gained,
            "subscriber_conversion_rate": (subscribers_gained / max(views, 1)) * 100 if views > 0 else 0,
        }

    # Sort by conversion rate (best source first)
    sorted_sources = sorted(quality_metrics.items(),
                           key=lambda x: x[1]["subscriber_conversion_rate"],
                           reverse=True)

    return {
        "by_source": dict(sorted_sources),
        "highest_quality_source": sorted_sources[0][0] if sorted_sources else None,
    }


def analyze(current_analytics, previous_analytics=None, actions_applied=None):
    """
    Unified growth metrics dashboard.

    Answers:
    - Are we growing faster or slower?
    - Which actions produce the best ROI?
    - What type of traffic becomes subscribers?
    - What's the overall channel health?
    """

    # Calculate velocity
    velocity = {}
    if previous_analytics:
        current_week = {k: current_analytics.get(k, 0) for k in ["views", "subscribers", "watch_time_hours"]}
        previous_week = {k: previous_analytics.get(k, 0) for k in ["views", "subscribers", "watch_time_hours"]}
        velocity = calculate_growth_velocity(current_week, previous_week)

    # Calculate ROI
    roi = {}
    if actions_applied:
        roi = calculate_roi_by_action_type(actions_applied, current_analytics)

    # Calculate traffic quality
    traffic_quality = calculate_traffic_quality(current_analytics)

    # Overall channel health score (0-100)
    health_score = 50  # Default
    if velocity:
        views_trend = velocity.get("views", {}).get("trend")
        subs_trend = velocity.get("subscribers", {}).get("trend")

        if views_trend == "accelerating" and subs_trend == "accelerating":
            health_score = 85
        elif views_trend == "accelerating" or subs_trend == "accelerating":
            health_score = 70
        elif views_trend == "declining" or subs_trend == "declining":
            health_score = 40

    return {
        "growth_velocity": velocity,
        "roi_by_action": roi,
        "traffic_quality": traffic_quality,
        "channel_health_score": health_score,
        "summary": {
            "growth_status": velocity.get("views", {}).get("trend", "unknown"),
            "best_roi_action": max(roi.items(), key=lambda x: x[1].get("views_per_hour", 0))[0] if roi else None,
            "best_traffic_source": traffic_quality.get("highest_quality_source"),
        },
        "note": (
            "Growth metrics: unified view of channel performance. Tracks velocity, ROI, "
            "traffic quality, and overall channel health. Used to prioritize future actions."
        ),
    }
