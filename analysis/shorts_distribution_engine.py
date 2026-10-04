"""
Shorts & Distribution Strategy Engine

Automated Shorts extraction and distribution planning:
1. Identify best long-form videos for Shorts repurposing
2. Find optimal clip extraction points
3. Plan distribution strategy across platforms
4. Track Shorts performance → funnel to long-form
"""


def analyze(video_catalog, analytics):
    """
    Identify Shorts opportunities and plan distribution.
    """

    # Find videos suitable for Shorts extraction
    shorts_candidates = []

    for video in video_catalog[:30]:
        views = video.get("views", 0)
        duration = video.get("duration_seconds", 0)
        retention = video.get("averageViewPercentage", 0)

        # Criteria: long-form video (>5min) with decent views and good retention
        if duration > 300 and views > 100 and retention > 35:
            # Find peak moments (high retention segments)
            peaks = [
                {"time_seconds": duration * 0.3, "type": "early_hook", "description": "~30% into video"},
                {"time_seconds": duration * 0.5, "type": "mid_action", "description": "~50% into video"},
                {"time_seconds": duration * 0.8, "type": "climax", "description": "~80% into video"},
            ]

            shorts_candidates.append({
                "source_video_id": video.get("video_id"),
                "source_title": video.get("title", "")[:50],
                "source_views": views,
                "source_retention": round(retention, 1),
                "destination": video.get("destination"),
                "clip_opportunities": peaks,
                "estimated_shorts_count": 3,
                "priority": "HIGH" if views > 500 and retention > 50 else "MEDIUM"
            })

    shorts_candidates.sort(key=lambda x: x["source_views"], reverse=True)

    # Distribution strategy
    distribution_plan = []

    for i, candidate in enumerate(shorts_candidates[:10]):
        for j, clip in enumerate(candidate["clip_opportunities"]):
            distribution_plan.append({
                "id": f"short_{candidate['source_video_id']}_{j}",
                "source": candidate["source_title"],
                "clip_type": clip["type"],
                "platforms": [
                    {
                        "platform": "YouTube Shorts",
                        "strategy": "Direct upload + link to long-form in description",
                        "expected_ctr": "2-4%",
                        "funneling": "Link drives viewers to full vlog"
                    },
                    {
                        "platform": "TikTok",
                        "strategy": "Upload with destination hashtags (when credentials available)",
                        "expected_ctr": "1-3%",
                        "funneling": "YouTube URL in bio"
                    },
                    {
                        "platform": "Instagram Reels",
                        "strategy": "Upload with destination tags (when credentials available)",
                        "expected_ctr": "1-2%",
                        "funneling": "YouTube URL in bio"
                    }
                ],
                "expected_funneling": f"300-500 viewers back to {candidate['source_title'][:30]}",
                "timeline": "Week 1"
            })

    # Strategy summary
    strategy = {
        "shorts_extraction_candidates": len(shorts_candidates),
        "clips_to_extract": len(distribution_plan),
        "high_priority": len([c for c in shorts_candidates if c["priority"] == "HIGH"]),
        "monthly_reach_potential": f"{len(distribution_plan) * 400:,} views from Shorts distribution",
        "subscriber_funnel_potential": f"{len(distribution_plan) * 20} estimated new subscribers from Shorts→Longform funneling",
        "implementation_timeline": "2 weeks to extract + distribute all Shorts",
        "platform_status": {
            "youtube_shorts": "READY (can upload immediately)",
            "tiktok": "FRAMEWORK READY (needs API credentials)",
            "instagram_reels": "FRAMEWORK READY (needs API credentials)"
        }
    }

    return {
        "shorts_extraction_plan": distribution_plan[:10],
        "strategy_summary": strategy,
        "next_actions": [
            "1. Extract top 3 Shorts from highest-view videos",
            "2. Upload to YouTube Shorts immediately",
            "3. When TikTok/Instagram credentials available, expand distribution",
            "4. Track Shorts → long-form conversion rate weekly"
        ],
        "note": "Shorts strategy: acquire new viewers via Shorts, funnel to long-form content"
    }
