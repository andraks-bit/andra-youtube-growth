"""
Phase 7: Enhanced Growth-Focused Digest.

Weekly digest centered on measurable growth, not just reporting.

Answers:
- How much did we grow this week?
- Which actions had the most impact?
- What should we prioritize next week?
- Where are the highest-ROI opportunities?
"""


def generate_growth_digest(growth_metrics, impact_tracking, growth_backlog,
                          distribution_strategy, previous_digest=None):
    """
    Generate comprehensive growth-focused weekly digest.
    """

    digest_lines = []

    digest_lines.append("# YouTube Growth Digest\n")

    # Week in review
    digest_lines.append("## 📊 This Week's Growth\n")
    velocity = growth_metrics.get("growth_velocity", {})

    views_trend = velocity.get("views", {})
    subs_trend = velocity.get("subscribers", {})

    if views_trend:
        views_change = views_trend.get("week_over_week_change_percent", 0)
        digest_lines.append(f"- Views: {views_trend.get('current', 0)} ({views_change:+.1f}% WoW)")

    if subs_trend:
        subs_change = subs_trend.get("week_over_week_change_percent", 0)
        digest_lines.append(f"- Subscribers: {subs_trend.get('current', 0)} ({subs_change:+.1f}% WoW)")

    health_score = growth_metrics.get("channel_health_score", 0)
    digest_lines.append(f"- Channel Health: {health_score}/100\n")

    # What worked
    digest_lines.append("## ✅ What Worked This Week\n")

    impact_summary = impact_tracking.get("impact_analysis", {})
    successful_count = impact_summary.get("successful", 0)
    success_rate = impact_summary.get("success_rate_percent", 0)

    if successful_count > 0:
        digest_lines.append(f"- {successful_count} optimizations applied with {success_rate:.0f}% success rate")

    learning_rec = impact_tracking.get("learning_patterns", {}).get("recommendation", "")
    if learning_rec:
        digest_lines.append(f"- Most effective approach: {learning_rec}\n")

    # Best ROI actions
    digest_lines.append("## 🎯 Highest-ROI Actions\n")
    roi_by_action = growth_metrics.get("roi_by_action", {})

    if roi_by_action:
        sorted_actions = sorted(roi_by_action.items(),
                               key=lambda x: x[1].get("views_per_hour", 0),
                               reverse=True)
        for i, (action_type, metrics) in enumerate(sorted_actions[:3], 1):
            views_per_hour = metrics.get("views_per_hour", 0)
            digest_lines.append(f"{i}. {action_type}: {views_per_hour:.1f} views/hour effort")

    digest_lines.append("")

    # Next week priorities
    digest_lines.append("## 🚀 Priority Actions for Next Week\n")

    top_backlog = growth_backlog.get("top_5_this_week", [])
    if top_backlog:
        for i, opp in enumerate(top_backlog[:3], 1):
            title = opp.get("title", "")[:50]
            digest_lines.append(f"{i}. {title} (Priority {opp.get('priority')}/5, ROI {opp.get('roi_score'):.2f})")

    digest_lines.append("")

    # Distribution opportunities
    distribution_opps = distribution_strategy.get("all_distribution_opportunities", [])
    if distribution_opps:
        digest_lines.append("## 📢 External Growth Opportunities\n")
        top_distribution = sorted(distribution_opps, key=lambda x: x.get("roi_score", 0), reverse=True)[:3]

        for opp in top_distribution:
            platform = opp.get("platform")
            traffic = opp.get("expected_traffic", 0)
            digest_lines.append(f"- {platform}: {traffic} expected visits\n")

    # Pending approvals
    pending_proposals = growth_backlog.get("backlog", [])
    if pending_proposals:
        digest_lines.append("## 📋 Pending Approvals (Click to Review in GitHub)\n")

        for prop in pending_proposals[:5]:
            issue_type = prop.get("type", "unknown")
            title = prop.get("title", "")[:50]
            digest_lines.append(f"- [{issue_type}] {title}")

    digest_lines.append("\n" + "=" * 60)
    digest_lines.append("🎯 Bottom line: Focus on highest-ROI actions. Approve priority opportunities in GitHub.\n")

    return "\n".join(digest_lines)


def create_markdown_digest(all_phases_results):
    """
    Create markdown version for email/GitHub.
    """

    growth_metrics = all_phases_results.get("growth_metrics", {})
    impact_tracking = all_phases_results.get("impact_tracking", {})
    growth_backlog = all_phases_results.get("growth_backlog", {})
    distribution_strategy = all_phases_results.get("distribution_strategy", {})

    return generate_growth_digest(growth_metrics, impact_tracking, growth_backlog, distribution_strategy)
