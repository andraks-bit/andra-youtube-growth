"""
Subscriber Growth Opportunities

Generates specific, actionable recommendations to increase subscriber conversion:

1. Sequel/follow-up ideas for videos that are converting subscribers
2. Subscribe CTA recommendations (best timing, placement, messaging)
3. End screen / card strategies for turning viewers into subscribers
4. Playlist strategies for viewer retention and subscriber funnel
5. Internal linking opportunities (playlists, related videos, end screens)
"""

import destinations as dest_module


def _generate_cta_recommendations(video, per_video_stats, analytics):
    """
    Recommend best timing and placement for subscribe CTAs.

    Uses retention curve data to identify optimal CTA timing
    (highest retention point, before drop-off).
    """

    stats = per_video_stats.get(video["video_id"], {})
    retention = stats.get("averageViewPercentage", 0)
    watch_time = stats.get("estimatedMinutesWatched", 0)
    duration_sec = video.get("duration_seconds", 600)
    duration_min = duration_sec / 60

    # For videos with good retention, recommend CTA at 40-50% through
    # (audience is engaged but there's still time for conversion)

    if duration_min < 1:  # Shorts
        return {
            "format": "Short",
            "cta_recommendation": "End screen + top pin comment with channel link",
            "timing": "At 80-90% through video",
            "reason": f"High-retention short ({retention:.0f}%) - capture momentum at end"
        }

    elif duration_min < 5:
        return {
            "format": "Short-form (3-5 min)",
            "cta_recommendation": "End screen card + subscribe button at 70-80%",
            "timing": f"At {int(duration_min * 0.75)}-{int(duration_min * 0.85)} min mark",
            "reason": f"Retention {retention:.0f}% - CTA before potential drop-off"
        }

    else:  # 5+ min longform
        optimal_point = int(duration_min * 0.4)  # 40% through
        return {
            "format": "Long-form (5+ min)",
            "cta_recommendation": f"Verbal CTA at {optimal_point}-{optimal_point+1} min, then end screen at video end",
            "timing": f"First CTA: {optimal_point} min | End screen: full duration",
            "reason": f"Retention {retention:.0f}% - verbal CTA early, subscribe button at end as safety net",
            "additional": "Consider card/pinned comment linking to related videos/playlists"
        }


def _generate_sequel_ideas(video, video_catalog, per_video_stats, traffic_growth_result):
    """
    Generate sequel/follow-up ideas for high-converting videos.
    """

    video_id = video["video_id"]
    stats = per_video_stats.get(video_id, {})
    destination = dest_module.label_for(dest_module.classify(video))

    # Check if this is a high-converting video
    is_high_converting = any(
        traffic_obj.get("video_id") == video_id
        for traffic_obj in traffic_growth_result.get("priority_videos", [])
        if traffic_obj.get("ctr_proxy_flags")  # Has engagement potential
    )

    if not is_high_converting:
        return None

    # Generate sequel ideas based on destination
    sequel_ideas = []

    if destination:
        sequel_ideas = [
            f"Deep dive: {destination} attractions people missed - Part 2",
            f"Hidden gems in {destination} - places the algorithm never shows",
            f"24-hour challenge in {destination} - revealing what tourists don't see",
        ]

    return {
        "original_video_id": video_id,
        "original_title": video["title"],
        "destination": destination,
        "sequel_ideas": sequel_ideas,
        "reasoning": f"This video drives engagement ({stats.get('views', 0)} views, {stats.get('comments', 0)} comments) - audiences want more of this content"
    }


def analyze(video_catalog, per_video_stats, analytics, subscriber_conversion_result,
            suggested_video_strategy, shorts_to_longform):
    """
    Generate subscriber growth opportunities and recommendations.

    Args:
        video_catalog: List of all videos
        per_video_stats: Per-video statistics
        analytics: Full analytics result
        subscriber_conversion_result: Result from subscriber_conversion.analyze()
        suggested_video_strategy: Result from suggested_video_strategy.analyze()
        shorts_to_longform: Result from shorts_to_longform.analyze()

    Returns:
        {
            "high_potential_videos": [...],
            "cta_recommendations": [...],
            "sequel_opportunities": [...],
            "end_screen_strategies": [...],
            "playlist_subscriber_funnels": [...],
            "note": "..."
        }
    """

    high_potential = subscriber_conversion_result.get("high_potential_videos", [])

    # CTA recommendations for top videos
    cta_recommendations = []
    for video_data in high_potential[:5]:
        video = next((v for v in video_catalog if v["video_id"] == video_data["video_id"]), None)
        if not video:
            continue

        cta = _generate_cta_recommendations(video, per_video_stats, analytics)
        cta_recommendations.append({
            "video_id": video_data["video_id"],
            "title": video_data["title"],
            "cta": cta
        })

    # Sequel opportunities
    sequel_opportunities = []
    traffic_growth_result = {"priority_videos": []}  # Placeholder; would come from parent
    for video in high_potential[:5]:
        video_obj = next((v for v in video_catalog if v["video_id"] == video["video_id"]), None)
        if video_obj:
            sequel = _generate_sequel_ideas(video_obj, video_catalog, per_video_stats, traffic_growth_result)
            if sequel:
                sequel_opportunities.append(sequel)

    # End screen strategies (from suggested_video_strategy)
    end_screen_strategies = []
    for cluster in suggested_video_strategy.get("clusters", [])[:3]:
        if cluster.get("playlist_suggestion"):
            end_screen_strategies.append({
                "videos": [v["video_id"] for v in cluster.get("videos", [])[:3]],
                "strategy": f"Link these videos in end screens to keep viewers on channel",
                "playlist_name": cluster.get("playlist_suggestion"),
            })

    # Playlist subscriber funnels (from shorts_to_longform)
    playlist_funnels = []
    for funnel in shorts_to_longform.get("funnels", []):
        playlist_funnels.append({
            "destination": funnel["destination"],
            "short_videos": [s["short_video_id"] for s in funnel.get("existing_shorts_ctas", [])],
            "target_longform": funnel["target_longform_video"]["video_id"],
            "strategy": f"Create playlist to funnel Shorts viewers to {destination} long-form content",
            "subscriber_benefit": "Shorts = discovery, long-form = retention and subscriber conversion"
        })

    return {
        "high_potential_videos": high_potential[:5],
        "cta_recommendations": cta_recommendations,
        "sequel_opportunities": sequel_opportunities,
        "end_screen_strategies": end_screen_strategies,
        "playlist_subscriber_funnels": playlist_funnels,
        "note": (
            "Recommendations for maximizing subscriber conversion. "
            "CTA timing based on retention data, sequels based on video engagement, "
            "playlists based on viewer flow patterns."
        ),
    }
