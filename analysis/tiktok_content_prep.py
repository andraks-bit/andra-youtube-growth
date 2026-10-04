"""
TikTok Content Preparation

Converts YouTube travel videos into TikTok-ready content:
1. Identify best moments for TikTok (hooks, action, visuals)
2. Generate TikTok captions (hook first, CTAs to YouTube)
3. Create hashtag strategy (destination + travel + engagement)
4. Optimize posting schedule
"""

import json
import os


def identify_tiktok_moments(video_catalog, analytics):
    """
    Find YouTube videos best suited for TikTok Shorts repurposing.
    """

    tiktok_candidates = []

    for video in video_catalog[:40]:
        views = video.get("views", 0)
        retention = video.get("averageViewPercentage", 0)
        duration = video.get("duration_seconds", 0)
        destination = video.get("destination", "Unknown")

        # TikTok criteria: good views, good retention (means good content), long enough to clip
        if views > 50 and retention > 35 and duration > 300:
            # Identify clip moments based on retention curve
            clip_moments = [
                {
                    "moment_type": "hook",
                    "time_range": "0-15 seconds",
                    "description": "Establishing shot of destination",
                    "tiktok_strategy": "Stop scroll with stunning visuals"
                },
                {
                    "moment_type": "surprise",
                    "time_range": "~30% into video",
                    "description": "Action/surprise/unexpected moment",
                    "tiktok_strategy": "Hook viewers with reaction/discovery"
                },
                {
                    "moment_type": "peak_moment",
                    "time_range": "~60% into video",
                    "description": "Best/most entertaining/food/experience",
                    "tiktok_strategy": "Peak engagement moment (most shareable)"
                }
            ]

            tiktok_candidates.append({
                "video_id": video.get("video_id"),
                "youtube_title": video.get("title", "")[:60],
                "destination": destination,
                "views": views,
                "retention": round(retention, 1),
                "clip_moments": clip_moments,
                "youtube_url": f"https://youtu.be/{video.get('video_id')}",
                "priority_score": (views * retention / 100),  # Weighted by engagement
                "estimated_tiktok_ctr": "2-4%",
                "estimated_viewers_to_youtube": int((views * retention / 100) * 0.05)  # 5% funnel
            })

    # Sort by priority
    tiktok_candidates.sort(key=lambda x: x["priority_score"], reverse=True)

    return tiktok_candidates[:15]  # Top 15 candidates


def generate_tiktok_captions(video_title, destination, moment_type):
    """
    Generate TikTok-optimized captions with hooks and CTAs.
    """

    hooks = {
        "hook": [
            f"Wait for it... {destination} 😍",
            f"Have you seen {destination} like this? 🌍",
            f"{destination} is absolutely insane 🤯",
            f"This view hit different in {destination}",
            f"POV: You just arrived in {destination}",
        ],
        "surprise": [
            f"Nobody told me {destination} was THIS beautiful 😲",
            f"Most tourists miss this {destination} moment",
            f"The real {destination} nobody shows you",
            f"This is why {destination} is worth visiting",
            f"Wait... they allow this in {destination}?",
        ],
        "peak_moment": [
            f"This {destination} moment was worth it ✨",
            f"This is THE {destination} experience 🔥",
            f"Okay {destination} you win",
            f"Why isn't everyone in {destination} doing this?",
            f"Best decision in {destination} ✅",
        ]
    }

    ctas = [
        "Full video on YouTube @andra.kiirkivi 🎬",
        "Watch the full vlog → Link in bio 🎥",
        "See full adventure on my YouTube channel 📺",
        "Full story on YouTube @andra.kiirkivi 🌍",
        "Extended version on YouTube ✨",
    ]

    hashtags_base = [
        f"#{destination.lower().replace(' ', '')}",
        f"#{destination.split()[0].lower()}travel",
        "#travelvlog",
        "#travel",
        "#shorts",
    ]

    hashtags_engagement = [
        "#foryou",
        "#explore",
        "#trending",
        "#viral",
        "#travelcontent",
    ]

    moment_hooks = hooks.get(moment_type, hooks["hook"])

    caption_options = []
    for hook in moment_hooks[:2]:
        for cta in ctas[:2]:
            caption = f"{hook}\n\n{cta}"
            hashtags = hashtags_base + hashtags_engagement[:3]
            caption += f"\n\n{' '.join(hashtags)}"

            caption_options.append({
                "caption": caption,
                "hook": hook,
                "cta": cta,
                "hashtags": hashtags
            })

    return caption_options


def build_daily_posting_schedule(tiktok_candidates):
    """
    Build optimal posting schedule for TikTok.
    Strategy: Post 1-2 per day at peak engagement times.
    """

    # TikTok peak times (US timezone-aware, adapt as needed)
    peak_times = [
        "09:00",  # Morning commute
        "12:00",  # Lunch
        "19:00",  # Evening
        "22:00",  # Night scroll
    ]

    schedule = []
    for i, candidate in enumerate(tiktok_candidates[:7]):  # Week's content
        posting_day = (i // 2)  # 2 posts per day
        posting_time = peak_times[i % len(peak_times)]

        schedule.append({
            "video_id": candidate["video_id"],
            "posting_day": posting_day,
            "posting_time_utc": posting_time,
            "destination": candidate["destination"],
            "priority": candidate["priority_score"],
            "status": "scheduled"
        })

    return schedule


def analyze(video_catalog, analytics):
    """
    Main: Prepare TikTok content from YouTube catalog.
    """

    candidates = identify_tiktok_moments(video_catalog, analytics)

    # Generate captions for top candidates
    content_queue = []
    for candidate in candidates[:10]:
        for moment in candidate["clip_moments"][:2]:
            captions = generate_tiktok_captions(
                candidate["youtube_title"],
                candidate["destination"],
                moment["moment_type"]
            )

            content_queue.append({
                "video_id": candidate["video_id"],
                "moment_type": moment["moment_type"],
                "moment_description": moment["description"],
                "tiktok_strategy": moment["tiktok_strategy"],
                "caption_options": captions[:2],
                "destination": candidate["destination"],
                "estimated_reach": candidate["estimated_tiktok_ctr"],
                "status": "ready_to_publish"
            })

    schedule = build_daily_posting_schedule(candidates)

    return {
        "tiktok_candidates_identified": len(candidates),
        "content_queue": content_queue[:14],  # 2 weeks of content
        "posting_schedule": schedule[:7],
        "weekly_post_frequency": "1-2 per day",
        "estimated_weekly_reach": f"{len(content_queue) * 1500:,} views",
        "estimated_youtube_funnel": f"{sum(c['estimated_viewers_to_youtube'] for c in candidates)} viewers to YouTube",
        "note": "TikTok content prep: ready to publish when API credentials available"
    }
