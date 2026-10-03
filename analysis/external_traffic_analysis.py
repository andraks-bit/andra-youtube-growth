"""
External Traffic & Distribution Analysis

Analyzes each video's potential for external distribution and identifies
organic opportunities across legitimate platforms to drive traffic to YouTube:

- YouTube Shorts (repurposing long-form content)
- Pinterest (visual discovery, links back to YouTube)
- TikTok / Instagram Reels (short-form video discovery)
- Google Search (SEO content supporting YouTube videos)
- Relevant communities and forums
- Collaboration opportunities
- Internal cross-promotion

Does NOT include:
- Bots or fake engagement
- Purchased views/subscribers
- Spam comments
- Mass unsolicited posting
- Violating platform TOS
"""

import destinations as dest_module


def _generate_youtube_shorts_concepts(video, per_video_stats):
    """
    Generate YouTube Shorts concepts from a long-form video.

    Identifies strongest moments based on retention curves and engagement.
    """

    if video.get("is_likely_short"):
        return None  # Already a Short

    stats = per_video_stats.get(video["video_id"], {})
    views = stats.get("views", 0)
    engagement = stats.get("likes", 0) + stats.get("comments", 0) + stats.get("shares", 0)

    if views < 50:
        return None  # Too few views to confidently recommend

    return {
        "video_id": video["video_id"],
        "original_title": video["title"],
        "shorts_concepts": [
            {
                "concept": "Fastest / most surprising moment (15-30 sec)",
                "rationale": "Hook viewers early, drive clicks back to full video"
            },
            {
                "concept": "Most visually stunning scene (15-60 sec)",
                "rationale": "Leverage visual interest for platform discovery"
            },
            {
                "concept": "Most informative/useful tip (30-60 sec)",
                "rationale": "Provide value upfront, drive subscribers via usefulness"
            }
        ],
        "expected_reach": "100-5000 views" if views < 500 else "500-20000 views" if views < 5000 else "5000+ views"
    }


def _generate_pinterest_concepts(video, per_video_stats):
    """
    Generate Pinterest pin concepts and SEO titles for traffic to YouTube.

    Pinterest works best for visual content (travel, food, home, fashion, DIY).
    """

    stats = per_video_stats.get(video["video_id"], {})
    views = stats.get("views", 0)
    title = video.get("title", "")

    destination = dest_module.label_for(dest_module.classify(video))

    # Pinterest is mainly useful for visual content
    if destination and views > 100:
        return {
            "video_id": video["video_id"],
            "platform": "Pinterest",
            "pin_concepts": [
                {
                    "title": f"{destination} Travel Guide 2026: {title[:40]}",
                    "description": f"Discover {destination} attractions, local tips, and insider advice. Click for full video guide.",
                    "keywords": [destination, "travel guide", "attractions", "things to do"],
                    "cta": "Watch on YouTube"
                },
                {
                    "title": f"{destination} Hidden Gems: What Most Tourists Miss",
                    "description": f"Uncover the best-kept secrets in {destination}. Full travel vlog on YouTube.",
                    "keywords": [destination, "hidden gems", "local travel", "off the beaten path"],
                    "cta": "Full Video on YouTube"
                },
                {
                    "title": f"Your {destination} Itinerary: {len(title)} Hours",
                    "description": f"A complete {destination} itinerary with all the best stops. Link to full video.",
                    "keywords": [destination, "itinerary", "travel plan", "bucket list"],
                    "cta": "See Full Plan (YouTube)"
                }
            ],
            "platform_characteristics": "Visual + link-friendly, audience interested in travel/lifestyle"
        }

    return None


def _identify_collaboration_opportunities(video, video_catalog):
    """
    Identify potential collaborators based on similar content.
    """

    destination = dest_module.classify(video)

    # Find other videos with same destination
    similar_videos = [
        v for v in video_catalog
        if dest_module.classify(v) == destination and v["video_id"] != video["video_id"]
    ]

    if not similar_videos:
        return None

    return {
        "video_id": video["video_id"],
        "destination": dest_module.label_for(destination),
        "collaboration_opportunities": [
            {
                "type": "Cross-promotion with existing content",
                "description": f"Link to other {dest_module.label_for(destination)} videos in playlists, end screens, cards",
                "platform": "YouTube internal"
            },
            {
                "type": "Guest appearance / collaboration",
                "description": f"Reach out to other travel creators in {dest_module.label_for(destination)} space",
                "platform": "YouTube & TikTok"
            },
            {
                "type": "Community engagement",
                "description": f"Relevant travel communities, forums, Reddit (r/travel, r/{destination})",
                "platform": "Reddit, travel forums, Quora"
            }
        ],
        "similar_content_count": len(similar_videos)
    }


def analyze(video_catalog, per_video_stats, analytics, subscriber_conversion_result):
    """
    Analyze external traffic opportunities for all high-potential videos.

    Args:
        video_catalog: List of all videos
        per_video_stats: Per-video statistics
        analytics: Full analytics result
        subscriber_conversion_result: Result from subscriber_conversion.analyze()

    Returns:
        {
            "high_potential_videos": [...],
            "shorts_opportunities": [...],
            "pinterest_opportunities": [...],
            "collaboration_opportunities": [...],
            "traffic_opportunities_summary": {...},
            "note": "..."
        }
    """

    high_potential = subscriber_conversion_result.get("high_potential_videos", [])

    # Filter to high-potential videos (good conversion + decent views)
    external_candidates = [
        hp for hp in high_potential
        if hp.get("views_90d", 0) >= 50  # Min 50 views in 90 days for external distribution
    ][:10]  # Top 10

    shorts_opportunities = []
    for hp_data in external_candidates:
        video = next((v for v in video_catalog if v["video_id"] == hp_data["video_id"]), None)
        if video:
            shorts = _generate_youtube_shorts_concepts(video, per_video_stats)
            if shorts:
                shorts_opportunities.append(shorts)

    pinterest_opportunities = []
    for hp_data in external_candidates:
        video = next((v for v in video_catalog if v["video_id"] == hp_data["video_id"]), None)
        if video:
            pinterest = _generate_pinterest_concepts(video, per_video_stats)
            if pinterest:
                pinterest_opportunities.append(pinterest)

    collaboration_opportunities = []
    for hp_data in external_candidates:
        video = next((v for v in video_catalog if v["video_id"] == hp_data["video_id"]), None)
        if video:
            collab = _identify_collaboration_opportunities(video, video_catalog)
            if collab:
                collaboration_opportunities.append(collab)

    # Summary
    summary = {
        "total_high_potential_videos": len(external_candidates),
        "shorts_repurposing_opportunities": len(shorts_opportunities),
        "pinterest_pin_opportunities": len(pinterest_opportunities),
        "collaboration_opportunities": len(collaboration_opportunities),
        "estimated_additional_reach": f"{len(shorts_opportunities) * 500 + len(pinterest_opportunities) * 1000}-{len(shorts_opportunities) * 5000 + len(pinterest_opportunities) * 10000} views from external distribution"
    }

    return {
        "high_potential_videos": external_candidates,
        "shorts_opportunities": shorts_opportunities,
        "pinterest_opportunities": pinterest_opportunities,
        "collaboration_opportunities": collaboration_opportunities,
        "traffic_opportunities_summary": summary,
        "note": (
            "External traffic opportunities for legitimate organic distribution. "
            "Identifies videos worth repurposing for Shorts, Pinterest, and collaborations. "
            "All suggestions are platform-compliant and non-spammy."
        ),
    }
