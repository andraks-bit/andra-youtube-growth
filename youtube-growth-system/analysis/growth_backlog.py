"""
Unified growth opportunities backlog with ROI scoring.

Consolidates all discovered opportunities (title optimization, shorts ideas,
playlist additions, etc.) into a single prioritized list ranked by:
  - Expected impact (view/subscriber lift)
  - Effort to implement (hours of work)
  - Urgency (time-sensitive vs. evergreen)

This is the "what should we work on THIS week?" engine.
"""
import datetime


def score_opportunity(opportunity):
    """
    Score an opportunity for impact and effort.

    Args:
        opportunity: {
            "type": "title_optimization" | "shorts_extraction" | "playlist" | ...,
            "video_id": str (optional),
            "destination": str,
            "impact_signal": float,  # 0-1, how much growth expected?
            "effort_hours": float,  # Estimated hours to implement
            "urgency": int,  # 1=evergreen, 2=normal, 3=time-sensitive
            "confidence": float,  # 0-1, how confident in the recommendation?
        }

    Returns:
        {
            "roi_score": float,  # impact / effort (higher is better)
            "priority": int,  # 1-5 (5=do first)
            ...original opportunity...
        }
    """
    impact = opportunity.get("impact_signal", 0.5)
    effort = opportunity.get("effort_hours", 1.0)
    urgency = opportunity.get("urgency", 2)
    confidence = opportunity.get("confidence", 0.7)

    # ROI = (expected impact * confidence) / effort
    roi_score = (impact * confidence) / max(effort, 0.1)

    # Priority 1-5: ROI + urgency boost
    roi_percentile = min(roi_score / 2.0, 1.0)  # Normalize to 0-1 (2.0 is "high")
    priority = max(1, min(5, int(1 + (roi_percentile * 3) + (urgency - 2))))

    return {
        **opportunity,
        "roi_score": round(roi_score, 2),
        "priority": priority,
    }


def build_backlog(ctr_optimization, shorts_analysis, keyword_discovery,
                  suggested_video_strategy, new_videos, growth_signals,
                  competitor_intel_result=None, trends_result=None):
    """
    Build unified growth backlog from all analysis streams.

    Phase 1: CTR optimization + Shorts + Keywords + Playlists
    Phase 2: Competitive gaps + Trend opportunities + Seasonal peaks

    Returns:
        {
            "backlog": [
                {
                    "priority": 1-5,
                    "type": str,
                    "title": str,
                    "impact_expected": str,
                    "effort_hours": float,
                    "roi_score": float,
                    "details": {...},
                }
            ],
            "top_5_this_week": [...],
            "summary": str,
        }
    """
    backlog = []

    # Extract opportunities from CTR optimization (title/thumbnail fixes)
    if ctr_optimization:
        for ctr in ctr_optimization.get("ctr_analysis", [])[:10]:  # Top 10 by analysis order
            if ctr["ctr_proxy_score"] <= -2:
                # Critical CTR failure: rewriting title is high-impact
                backlog.append({
                    "type": "title_optimization_urgent",
                    "title": f"Fix title CTR failure: {ctr.get('title', '')[:50]}",
                    "video_id": ctr["video_id"],
                    "destination": "mixed",
                    "diagnosis": ctr.get("diagnosis", ""),
                    "impact_signal": 0.8,  # High expected view lift
                    "effort_hours": 0.25,
                    "urgency": 3,  # Time-sensitive
                    "confidence": ctr.get("signal_confidence", 0.7),
                    "details": ctr,
                })
            elif ctr["ctr_proxy_score"] == 1:
                # Low reach, high retention: keyword/discovery fix
                backlog.append({
                    "type": "title_optimization_discovery",
                    "title": f"Improve discoverability: {ctr.get('title', '')[:50]}",
                    "video_id": ctr["video_id"],
                    "destination": "mixed",
                    "diagnosis": ctr.get("diagnosis", ""),
                    "impact_signal": 0.6,
                    "effort_hours": 0.25,
                    "urgency": 2,
                    "confidence": ctr.get("signal_confidence", 0.7),
                    "details": ctr,
                })

    # Extract from keyword discovery (keyword gaps = untapped search demand)
    if keyword_discovery:
        keyword_gaps = keyword_discovery.get("per_video_gaps", [])
    else:
        keyword_gaps = []
    if keyword_gaps:
        gap_count = len(keyword_gaps)
        if gap_count > 0:
            backlog.append({
                "type": "keyword_targeting",
                "title": f"Incorporate {gap_count} search keywords into video metadata",
                "missing_terms": gap_count,
                "impact_signal": 0.7,  # Proven search demand
                "effort_hours": 0.5,
                "urgency": 2,
                "confidence": 0.8,
                "details": keyword_gaps[:5],
            })

    # Extract from shorts analysis
    if shorts_analysis:
        for shorts in shorts_analysis.get("opportunities", [])[:5]:
            backlog.append({
                "type": "shorts_extraction",
                "title": f"Extract Shorts from: {shorts.get('source_video_title', '')[:40]}",
                "source_video_id": shorts.get("source_video_id", ""),
                "shorts_ideas_count": len(shorts.get("shorts_ideas", [])),
                "impact_signal": 0.5,  # Moderate reach expansion
                "effort_hours": 1.0,
                "urgency": 1,  # Can do anytime
                "confidence": 0.6,
                "details": shorts,
            })

    # Extract from new videos
    if new_videos:
        new_vids = new_videos.get("new_videos", [])
    else:
        new_vids = []
    if new_vids:
        backlog.append({
            "type": "new_video_launch",
            "title": f"Launch optimization for {len(new_vids)} new video(s)",
            "video_count": len(new_vids),
            "impact_signal": 0.9,  # New videos are high-priority
            "effort_hours": 0.5 * len(new_vids),
            "urgency": 3,
            "confidence": 0.9,
            "details": new_vids,
        })

    # Extract from Phase 2: Competitive Intelligence
    if competitor_intel_result:
        comp_opps = competitor_intel_result.get("opportunities", {}).get("opportunities", [])
        for opp in comp_opps[:5]:  # Top 5 competitive gaps
            backlog.append({
                "type": "competitive_gap",
                "title": f"Cover content gap: {opp.get('topic', '')} ({opp.get('suggested_format', 'longform')})",
                "topic": opp.get("topic"),
                "competitor_coverage": opp.get("competitor_coverage", 0),
                "impact_signal": opp.get("impact_score", 0.5),
                "effort_hours": 4.0 if opp.get("suggested_format") == "longform" else 2.0,
                "urgency": opp.get("urgency", 1),
                "confidence": 0.7,
                "details": opp,
            })

    # Extract from Phase 2: Trend Detection
    if trends_result:
        # Add seasonal peak opportunities
        seasonal_opps = trends_result.get("seasonal_opportunities", {}).get("seasonal_opportunities", [])
        for opp in seasonal_opps:
            if opp.get("urgency", 1) >= 2:  # Only include medium+ urgency
                backlog.append({
                    "type": "seasonal_opportunity",
                    "title": f"Create content for {opp.get('destination')}: {opp.get('season')}",
                    "destination": opp.get("destination"),
                    "season": opp.get("season"),
                    "impact_signal": 0.8,  # Seasonal peaks are high-value
                    "effort_hours": 8.0,
                    "urgency": opp.get("urgency", 2),
                    "confidence": 0.85,
                    "details": opp,
                })

        # Add urgent trend signals
        urgent_trends = trends_result.get("urgent_opportunities", [])
        for trend in urgent_trends[:3]:  # Top 3 urgent trends
            backlog.append({
                "type": "urgent_trend",
                "title": f"Capitalize on trend: {trend.get('source', {}).get('signal', 'emerging trend')}",
                "impact_signal": 0.9,  # Trends are time-sensitive and high-impact
                "effort_hours": 2.0,  # Quick turnaround
                "urgency": trend.get("urgency", 3),
                "confidence": 0.7,
                "details": trend,
            })

    # Score all opportunities
    scored_backlog = [score_opportunity(opp) for opp in backlog]

    # Sort by priority (descending), then by ROI
    scored_backlog.sort(key=lambda o: (o["priority"], o["roi_score"]), reverse=True)

    # Identify top 5 for this week
    top_5 = scored_backlog[:5]

    # Summary
    total_opportunities = len(scored_backlog)
    high_priority = len([o for o in scored_backlog if o["priority"] >= 4])
    est_total_hours = sum(o.get("effort_hours", 0) for o in scored_backlog)

    summary = f"{total_opportunities} growth opportunities identified. {high_priority} high-priority. Est. {est_total_hours:.1f} hours of work for maximum impact."

    return {
        "backlog": scored_backlog,
        "top_5_this_week": top_5,
        "total_opportunities": total_opportunities,
        "high_priority_count": high_priority,
        "estimated_total_hours": round(est_total_hours, 1),
        "summary": summary,
        "note": (
            "Growth opportunities backlog: unified view of all discovered opportunities "
            "ranked by ROI (impact/effort) and urgency. Top 5 are recommended for this week."
        ),
    }
