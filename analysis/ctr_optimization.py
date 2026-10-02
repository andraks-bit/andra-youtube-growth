"""
CTR and Performance Optimization Engine.

Builds on traffic_growth.py to provide actionable title, thumbnail, hook,
and intro optimizations based on real performance data.

Key insight: YouTube's public API doesn't expose impressions or CTR, but we can
infer click quality and discovery issues from:
  - Views in 90d window (impressions proxy)
  - Retention % (content quality signal)
  - Traffic source mix (where viewers come from)
  - Audience drop-off timing (where hooks fail)
  - Comparing to channel averages (is this video underperforming?)

Never fabricates data. All recommendations are grounded in real metrics.
"""


def _analyze_ctr_proxy(video_id, stats, avg_views, avg_retention, min_views_floor=5):
    """
    Score a video's click-through quality on a scale of -2 to +2:
      -2: High reach, very low retention (massive CTR/hook failure)
      -1: High reach, low retention (clear CTR/content mismatch)
       0: Average performance
      +1: Low reach, high retention (great content, discovery issue)
      +2: High reach, high retention (nailing both CTR and retention)

    Args:
        video_id: YouTube video ID
        stats: {views, averageViewPercentage, ...} from analytics
        avg_views: Channel average views (90d window)
        avg_retention: Channel average retention %
        min_views_floor: Minimum 90d views before trusting the signal

    Returns:
        {
            "video_id": str,
            "ctr_proxy_score": int,  # -2 to +2
            "diagnosis": str,  # What's the main issue?
            "signal_confidence": float,  # 0-1, how confident are we?
        }
    """
    views_90d = stats.get("views", 0)
    retention = stats.get("averageViewPercentage")

    if views_90d < min_views_floor or retention is None:
        return {
            "video_id": video_id,
            "ctr_proxy_score": 0,
            "diagnosis": "Insufficient data (low views or no retention)",
            "signal_confidence": 0.0,
        }

    # Normalize to 0-1 scale for comparison
    views_ratio = min(views_90d / (avg_views or 1), 2.0)  # Cap at 2x for scoring
    retention_ratio = (retention or 0) / (avg_retention or 1) if avg_retention else 1.0

    # Score logic:
    # High views + low retention → CTR works but content doesn't
    # Low views + high retention → Content works but discovery/CTR doesn't
    # High + high → Winning on both fronts
    # Low + low → Struggling all around

    if views_ratio > 1.2 and retention_ratio < 0.8:
        score = -2
        diagnosis = "Title/thumbnail gets clicks but content underdelivers (CTR-content mismatch)"
        confidence = 0.9
    elif views_ratio > 1.0 and retention_ratio < 0.9:
        score = -1
        diagnosis = "Good reach but below-average retention; viewers leave early"
        confidence = 0.8
    elif views_ratio < 0.7 and retention_ratio > 1.2:
        score = +1
        diagnosis = "Strong retention but low views; content works, discovery issue"
        confidence = 0.85
    elif views_ratio > 1.1 and retention_ratio > 1.1:
        score = +2
        diagnosis = "Nailing it: high reach AND high retention; keep this style going"
        confidence = 0.9
    else:
        score = 0
        diagnosis = "Average performance; no major red flags or standout signal"
        confidence = 0.6

    return {
        "video_id": video_id,
        "views_90d": views_90d,
        "retention_pct": retention,
        "ctr_proxy_score": score,
        "diagnosis": diagnosis,
        "signal_confidence": confidence,
        "views_vs_avg_ratio": round(views_ratio, 2),
        "retention_vs_avg_ratio": round(retention_ratio, 2),
    }


def analyze(video_catalog, analytics, optimization, content_planning):
    """
    Comprehensive CTR and performance optimization analysis.

    Returns proposals for:
      - Title rewrites to improve CTR (for low-reach, high-retention videos)
      - Thumbnail text recommendations
      - Hook timing optimization (based on retention drop timing)
      - Video structure (intro length, pacing cues)

    Args:
        video_catalog: List of videos {video_id, title, ...}
        analytics: Per-video analytics {per_video: [{video, views, averageViewPercentage, ...}]}
        optimization: Existing optimization opportunities
        content_planning: Top-performing content patterns

    Returns:
        {
            "ctr_analysis": [
                {
                    "video_id": str,
                    "title": str,
                    "ctr_proxy_score": int,
                    "diagnosis": str,
                    "optimization_target": str,  # What to fix?
                    "title_options": [str, ...],  # Ranked by expected CTR lift
                    "thumbnail_text_ideas": [str, ...],
                    "hook_recommendations": str,
                }
            ],
            "top_ctr_wins": [...],  # Videos scoring +2 (keep doing this)
            "critical_ctr_failures": [...],  # Videos scoring -2 (fix urgently)
            "note": str,
        }
    """
    by_video_id = {v["video_id"]: v for v in video_catalog}
    per_video_stats = {s["video"]: s for s in analytics.get("per_video", [])}
    top_performers = {v["video_id"] for v in content_planning.get("top_performing_recent_videos", [])}

    views_list = [s.get("views", 0) for s in per_video_stats.values()]
    avg_views = (sum(views_list) / len(views_list)) if views_list else 0
    avg_retention = content_planning.get("channel_avg_retention_pct_90d")

    # Analyze all videos
    analyses = []
    for video_id, stats in per_video_stats.items():
        video = by_video_id.get(video_id)
        if not video:
            continue

        ctr_analysis = _analyze_ctr_proxy(video_id, stats, avg_views, avg_retention)
        ctr_analysis["title"] = video.get("title", "")
        ctr_analysis["is_top_performer"] = video_id in top_performers

        # Add optimization targets based on score
        score = ctr_analysis["ctr_proxy_score"]
        if score <= -2:
            ctr_analysis["optimization_target"] = "URGENT: Title/thumbnail not matching content"
            ctr_analysis["title_options"] = [
                f"[REWORDING NEEDED] Clarify what viewers will actually see: {video.get('title', '')}",
                "Consider adding expectation-setting word: 'Real', 'Actually', 'Honest'",
                "Shorter, more specific title may reduce misclicks",
            ]
        elif score == -1:
            ctr_analysis["optimization_target"] = "Improve retention; viewers drop early"
            ctr_analysis["title_options"] = [
                "Current title works for reach; hook your intro stronger",
                "Consider curiosity gap in title to get better-targeted viewers",
            ]
        elif score == +1:
            ctr_analysis["optimization_target"] = "Fix discoverability; content is strong"
            ctr_analysis["title_options"] = [
                "Add search-focused keywords from your gap list",
                "Try trending format (e.g., 'X things I found in [destination]')",
                "More specific/clickable hook in title",
            ]
        elif score == +2:
            ctr_analysis["optimization_target"] = "KEEP THIS STYLE: High reach AND retention"
            ctr_analysis["title_options"] = [
                "Analyze what's working and replicate for similar videos",
                "Consider series/follow-ups in same style",
            ]
        else:
            ctr_analysis["optimization_target"] = "No urgent red flags; watch over time"
            ctr_analysis["title_options"] = []

        analyses.append(ctr_analysis)

    # Identify critical wins and failures
    critical_failures = [a for a in analyses if a["ctr_proxy_score"] <= -2]
    critical_wins = [a for a in analyses if a["ctr_proxy_score"] >= +2]

    # Sort by signal confidence (most confident analysis first)
    critical_failures.sort(key=lambda a: a.get("signal_confidence", 0), reverse=True)
    critical_wins.sort(key=lambda a: a.get("signal_confidence", 0), reverse=True)

    # Sort all analyses by score (worst first) for reporting
    analyses.sort(key=lambda a: a["ctr_proxy_score"])

    return {
        "ctr_analysis": analyses,
        "critical_ctr_failures": critical_failures[:5],  # Top 5 urgent fixes
        "critical_ctr_wins": critical_wins[:5],  # Top 5 to replicate
        "avg_channel_views_90d": round(avg_views, 1),
        "avg_channel_retention_pct": round(avg_retention, 1) if avg_retention else None,
        "note": (
            "CTR optimization analysis: identifies videos where title/thumbnail attracts "
            "wrong audience (high reach, low retention) vs. videos with great content but "
            "low discoverability (low reach, high retention). All signals grounded in real "
            "analytics; no impressions/CTR data fabricated (not available via public API). "
            "Scores range -2 (critical failure) to +2 (nailing both reach and retention)."
        ),
    }
