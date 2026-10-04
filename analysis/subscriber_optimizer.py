"""
Subscriber Growth Optimizer

GOAL: Maximize subscriber conversion per 1,000 views

1. Identify top subscriber-converting videos (WHY do they work?)
2. Find patterns in successful videos
3. Apply those patterns to underperforming videos
4. Generate specific improvements (not generic recommendations)
"""

import json
import os


def analyze(analytics, video_catalog, optimization=None):
    """
    Core: Find videos converting viewers → subscribers, identify patterns, generate fixes.
    """

    per_video = {v.get("video"): v for v in analytics.get("per_video", [])}
    daily_data = analytics.get("daily", [])

    if not daily_data:
        return {"note": "Insufficient data"}

    # CALCULATION: Subs per 1,000 views (the key metric)
    subs_gained_total = sum(d.get("subscribersGained", 0) for d in daily_data)
    views_total = sum(d.get("views", 0) for d in daily_data)
    channel_conversion_rate = (subs_gained_total / views_total * 1000) if views_total > 0 else 0

    # Find each video's conversion rate
    video_conversions = []
    for video in video_catalog:
        vid_id = video.get("video_id")
        views = video.get("views", 0)

        # Estimate subs from this video (imprecise, but best available from public API)
        # We use retention as proxy - high retention = high conversion
        retention = video.get("averageViewPercentage", 0)

        if views >= 50:  # Minimum sample size
            estimated_conversion = (retention / 100) * channel_conversion_rate if retention > 0 else 0

            video_conversions.append({
                "video_id": vid_id,
                "title": video.get("title", "")[:60],
                "views": views,
                "retention": round(retention, 1),
                "estimated_subs_per_1k": round(estimated_conversion, 2),
                "destination": video.get("destination", "Other"),
                "duration_seconds": video.get("duration_seconds", 0),
            })

    # Sort by conversion rate
    video_conversions.sort(key=lambda x: x["estimated_subs_per_1k"], reverse=True)

    # HIGH CONVERTERS: Learn from them
    top_converters = video_conversions[:5]
    top_converter_patterns = {
        "avg_retention": sum(v["retention"] for v in top_converters) / len(top_converters),
        "avg_views": sum(v["views"] for v in top_converters) / len(top_converters),
        "common_destinations": list(set(v["destination"] for v in top_converters)),
    }

    # UNDERPERFORMERS: Fix them
    low_converters = [v for v in video_conversions if v["views"] > 100 and v["estimated_subs_per_1k"] < channel_conversion_rate * 0.5]

    improvements = []
    for video in low_converters[:5]:
        issue = None
        fix = None

        retention = video["retention"]
        if retention < top_converter_patterns["avg_retention"] - 10:
            issue = f"Low retention ({retention:.0f}% vs {top_converter_patterns['avg_retention']:.0f}%)"
            fix = "Review title-thumbnail match: promise likely not matching content"
        elif video["views"] < 100:
            issue = "Insufficient views for discovery"
            fix = f"Improve title/CTR to match {top_converters[0]['title'][:40]} style"
        else:
            issue = "Low conversion despite adequate retention"
            fix = "Add mid-video subscribe CTA + end screen card + playlist link"

        improvements.append({
            "video_id": video["video_id"],
            "title": video["title"],
            "issue": issue,
            "improvement": fix,
            "current_conversion": video["estimated_subs_per_1k"],
            "target_conversion": channel_conversion_rate,
            "impact": f"Could add ~{int((channel_conversion_rate - video['estimated_subs_per_1k']) * video['views'] / 1000)} subs"
        })

    return {
        "channel_conversion_rate": round(channel_conversion_rate, 2),
        "top_converters": top_converters[:3],
        "underperformers_with_fixes": improvements[:5],
        "total_subscriber_potential": int(sum(i["impact"].split("~")[1].split()[0] for i in improvements if "~" in i["impact"])),
        "note": "Subscriber optimization: identify high converters, diagnose underperformers, generate specific fixes"
    }
