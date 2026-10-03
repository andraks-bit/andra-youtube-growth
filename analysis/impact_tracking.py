"""
Phase 5: Optimization Impact Tracking & Learning Loop.

Measures whether applied changes actually improve channel metrics:
- Did the title change increase views?
- Did the Shorts help subscribers grow?
- Did the playlist increase watch time?

Learns which optimization strategies work best for this specific channel.
"""


def calculate_impact(before_metrics, after_metrics):
    """Compare metrics before/after applying an optimization."""

    metrics = {}
    for key in ["views", "retention", "subscribers", "watch_time_hours"]:
        before = before_metrics.get(key, 0)
        after = after_metrics.get(key, 0)

        if before > 0:
            change_pct = ((after - before) / before) * 100
            metrics[f"{key}_change_pct"] = change_pct
            metrics[f"{key}_lift"] = after - before

    return metrics


def track_title_optimization_impact(video_id, old_title, new_title,
                                     views_before, views_after):
    """Track impact of title change on views."""

    return {
        "optimization_type": "title_change",
        "video_id": video_id,
        "old_title": old_title,
        "new_title": new_title,
        "views_before": views_before,
        "views_after": views_after,
        "view_lift_percent": ((views_after - views_before) / max(views_before, 1)) * 100,
        "success": views_after > views_before,
    }


def track_playlist_impact(playlist_id, watch_time_before, watch_time_after):
    """Track impact of playlist creation on channel watch time."""

    return {
        "optimization_type": "playlist_creation",
        "playlist_id": playlist_id,
        "watch_time_increase_hours": watch_time_after - watch_time_before,
        "success": watch_time_after > watch_time_before,
    }


def analyze_learning_patterns(applied_changes_history):
    """
    Analyze which types of optimizations are most effective.

    Returns pattern insights: "title changes work best", "Shorts drive subscribers", etc.
    """

    if not applied_changes_history:
        return {"insights": [], "note": "Insufficient data for pattern analysis"}

    # Aggregate results by optimization type
    results_by_type = {}
    for change in applied_changes_history:
        opt_type = change.get("optimization_type", "unknown")
        if opt_type not in results_by_type:
            results_by_type[opt_type] = {"successes": 0, "total": 0}

        results_by_type[opt_type]["total"] += 1
        if change.get("success", False):
            results_by_type[opt_type]["successes"] += 1

    # Calculate success rates
    insights = []
    for opt_type, results in results_by_type.items():
        success_rate = (results["successes"] / results["total"]) * 100 if results["total"] > 0 else 0
        insights.append({
            "optimization_type": opt_type,
            "success_rate": success_rate,
            "sample_size": results["total"],
        })

    # Sort by success rate
    insights.sort(key=lambda i: i["success_rate"], reverse=True)

    return {
        "insights": insights,
        "recommendation": f"Most effective: {insights[0]['optimization_type'] if insights else 'insufficient data'}",
    }


def analyze(applied_changes_history=None, current_analytics=None):
    """
    Impact tracking and learning loop.

    In production, this would:
    1. Compare video metrics before/after each change
    2. Calculate impact (views increased? retention improved?)
    3. Track which optimization types have highest success rate
    4. Use learnings to prioritize future optimizations
    """

    if not applied_changes_history:
        applied_changes_history = []

    # Analyze patterns from historical data
    patterns = analyze_learning_patterns(applied_changes_history)

    return {
        "impact_analysis": {
            "total_optimizations_tracked": len(applied_changes_history),
            "successful": len([c for c in applied_changes_history if c.get("success", False)]),
            "success_rate_percent": (len([c for c in applied_changes_history if c.get("success", False)]) / max(len(applied_changes_history), 1)) * 100,
        },
        "learning_patterns": patterns,
        "recommendations_for_next_round": [
            f"Prioritize {patterns['recommendation']} optimizations",
            "Apply successful patterns to similar videos",
            "Pause ineffective optimization types",
        ] if patterns.get("insights") else ["Gather more optimization data before making recommendations"],
        "note": (
            "Impact tracking: measures whether applied optimizations actually improve metrics. "
            "Learning loop: identifies which strategies work best for this channel. "
            "Continuous improvement: future priorities driven by what actually works."
        ),
    }
