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
                  suggested_video_strategy, new_videos, growth_signals):
    """
    Build unified growth backlog from all analysis streams.

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
    keyword_gaps = keyword_discovery.get("per_video_gaps", [])
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
    new_vids = new_videos.get("new_videos", [])
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
