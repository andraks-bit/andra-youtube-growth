"""
Unified Daily Prioritizer - True Top 5 across ALL engines.
Combines all analysis modules into single prioritized action list.
"""


def analyze(traffic_growth_actions_result, subscriber_growth_opportunities, external_traffic_result,
            growth_engine_result, problem_detector_result, content_opportunity_result):
    """
    Unify all Top 5 lists into single authoritative daily action list.
    Considers impact, ease, and urgency.
    """

    candidates = []

    # Traffic growth actions (proven high impact)
    for action in traffic_growth_actions_result.get("actions", [])[:3]:
        candidates.append({
            "rank_score": action.get("score", 0) * 1.2,
            "source": "traffic_growth",
            "action": action.get("text", ""),
            "priority": "HIGH",
        })

    # Problem fixes (urgent)
    for problem in problem_detector_result.get("problems_detected", [])[:2]:
        candidates.append({
            "rank_score": 150,  # High urgency
            "source": "problem_detection",
            "action": f"Fix {problem['type']}: {problem['title'][:40]}",
            "priority": "URGENT",
        })

    # Subscriber growth opportunities
    for cta in subscriber_growth_opportunities.get("cta_recommendations", [])[:2]:
        candidates.append({
            "rank_score": 100,
            "source": "subscriber_growth",
            "action": f"Optimize CTA timing: {cta['title'][:40]}",
            "priority": "HIGH",
        })

    # New content ideas (high impact long-term)
    for idea in content_opportunity_result.get("next_video_ideas", [])[:1]:
        candidates.append({
            "rank_score": 80,
            "source": "content_planning",
            "action": f"Create: {idea['destination']} video",
            "priority": "MEDIUM",
        })

    # External traffic (scalable reach)
    shorts_count = len(external_traffic_result.get("shorts_opportunities", []))
    if shorts_count > 0:
        candidates.append({
            "rank_score": 70,
            "source": "external_traffic",
            "action": f"Repurpose {shorts_count} videos as Shorts",
            "priority": "MEDIUM",
        })

    # Sort by score
    candidates.sort(key=lambda x: x["rank_score"], reverse=True)

    return {
        "top_5_actions": candidates[:5],
        "all_candidates": candidates,
        "note": "Unified daily action prioritization across all growth engines."
    }
