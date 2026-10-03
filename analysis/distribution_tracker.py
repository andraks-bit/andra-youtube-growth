"""
Distribution Tracking

Tracks which external traffic sources (Shorts, Pinterest, TikTok, referral sources)
actually generate views, watch time, and subscribers.

Correlates external distribution efforts with YouTube analytics to measure ROI.
"""


def analyze(analytics, external_traffic_analysis):
    """
    Analyze external traffic sources from YouTube Analytics.

    Args:
        analytics: Full analytics result (includes traffic_sources)
        external_traffic_analysis: Result from external_traffic_analysis.analyze()

    Returns:
        {
            "traffic_source_breakdown": {...},
            "shorts_performance": {...},
            "distribution_health": {...},
            "note": "..."
        }
    """

    traffic_sources = analytics.get("traffic_sources", [])

    # Categorize traffic by source type
    source_map = {
        "YT_SEARCH": {"category": "Search", "icon": "🔍"},
        "BROWSE_FEATURES": {"category": "Browse", "icon": "🏠"},
        "RELATED_VIDEO": {"category": "Suggested", "icon": "🔗"},
        "EXTERNAL": {"category": "External", "icon": "🌐"},
        "DIRECT": {"category": "Direct", "icon": "📍"},
        "PLAYLIST": {"category": "Playlist", "icon": "📋"},
    }

    breakdown = {}
    total_views = sum(s.get("views", 0) for s in traffic_sources)

    for source in traffic_sources:
        source_type = source.get("insightTrafficSourceType", "UNKNOWN")
        views = source.get("views", 0)
        pct = (views / total_views * 100) if total_views > 0 else 0

        if source_type in source_map:
            category = source_map[source_type]["category"]
            icon = source_map[source_type]["icon"]
        else:
            category = source_type
            icon = "•"

        breakdown[category] = {
            "icon": icon,
            "views": views,
            "percentage": round(pct, 1),
            "source_type": source_type
        }

    # Shorts performance (if available)
    shorts_performance = {
        "YouTube Shorts": breakdown.get("Suggested", {}).get("views", 0),
        "External Shorts": breakdown.get("External", {}).get("views", 0),
        "status": "Monitor growth in external Shorts traffic"
    }

    # Distribution health check
    external_traffic = breakdown.get("External", {}).get("views", 0)
    external_pct = breakdown.get("External", {}).get("percentage", 0)
    shorts_driven = external_traffic

    distribution_health = {
        "external_traffic_views": external_traffic,
        "external_traffic_percentage": external_pct,
        "assessment": "Strong external distribution" if external_pct > 10 else "Moderate" if external_pct > 5 else "Low - increase distribution efforts",
        "recommendation": "Continue current distribution strategy" if external_pct > 15 else "Increase Shorts/Pinterest/collaborations"
    }

    return {
        "traffic_source_breakdown": breakdown,
        "shorts_performance": shorts_performance,
        "distribution_health": distribution_health,
        "note": (
            "Tracks how external distribution channels perform in YouTube Analytics. "
            "Use to prioritize which platforms to focus distribution efforts on."
        ),
    }
