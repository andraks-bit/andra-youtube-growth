"""
Daily Growth Discovery Engine

Proactively discovers NEW legitimate growth opportunities every day:
- Travel directories, tourism websites, resources
- Travel blogs, communities, forums
- Pinterest opportunities
- Collaboration targets
- Backlink opportunities
- Emerging trends in travel content
"""

import datetime
from . import opportunity_tracker


def discover_opportunities(video_catalog, analytics, subscriber_tracking_result):
    """
    Daily discovery: find NEW legitimate growth channels.
    Returns list of discovered opportunities ready for execution.
    """

    opportunities = []

    # Extract video data
    destinations = {}
    for video in video_catalog[:30]:
        dest = video.get("destination", "Unknown")
        if dest not in destinations:
            destinations[dest] = []
        destinations[dest].append(video)

    # DISCOVERY #1: Travel Directory Submissions
    for dest, videos in list(destinations.items())[:5]:
        if videos and not opportunity_tracker.get_already_discovered("directory", dest):
            best_video = sorted(videos, key=lambda v: v.get("views", 0), reverse=True)[0]
            opportunities.append({
                "source_type": "directory",
                "description": f"Submit '{best_video['title']}' to {dest} tourism directories",
                "video_id": best_video["video_id"],
                "action": "submit",
                "target": f"{dest} travel guide directories, tourism boards",
                "estimated_reach": "500-5000 monthly viewers"
            })

    # DISCOVERY #2: Pinterest Seasonal Opportunities
    current_month = datetime.date.today().month
    seasonal_keywords = {
        3: ["spring travel", "easter holidays"],
        6: ["summer vacation", "beach travel"],
        12: ["christmas travel", "holiday destinations"],
    }
    keywords = seasonal_keywords.get(current_month, ["travel vlog"])

    for video in video_catalog[:10]:
        dest = video.get("destination")
        for keyword in keywords:
            if dest and not opportunity_tracker.get_already_discovered("pinterest", f"{dest} {keyword}"):
                opportunities.append({
                    "source_type": "pinterest",
                    "description": f"Create '{dest}' seasonal pins for '{keyword}'",
                    "video_id": video["video_id"],
                    "action": "create_pins",
                    "target": "Pinterest (seasonal content)",
                    "estimated_reach": "1000-10000 monthly visits"
                })

    # DISCOVERY #3: YouTube Shorts Repurposing (clips from existing videos)
    for video in video_catalog[:15]:
        if video.get("views", 0) > 500:
            if not opportunity_tracker.get_already_discovered("shorts", video.get("video_id", "")):
                opportunities.append({
                    "source_type": "shorts",
                    "description": f"Extract 3 Shorts from: {video['title'][:50]}",
                    "video_id": video["video_id"],
                    "action": "create_clips",
                    "target": "YouTube Shorts (repurposing)",
                    "estimated_reach": "Direct YouTube promotion"
                })

    # DISCOVERY #4: Travel Blog Collaboration Outreach
    high_retention_videos = sorted(
        [v for v in video_catalog if v.get("averageViewPercentage", 0) > 50],
        key=lambda v: v.get("views", 0),
        reverse=True
    )[:5]

    for video in high_retention_videos:
        dest = video.get("destination")
        if dest and not opportunity_tracker.get_already_discovered("collaboration", f"{dest} blogs"):
            opportunities.append({
                "source_type": "collaboration",
                "description": f"Outreach to {dest} travel blogs for features/backlinks",
                "video_id": video["video_id"],
                "action": "contact",
                "target": f"Top {dest} travel/lifestyle blogs (5-10 targets)",
                "estimated_reach": "1000-5000 referral traffic"
            })

    # DISCOVERY #5: TikTok/Instagram Shorts Cross-posting
    trending_videos = sorted(
        video_catalog,
        key=lambda v: v.get("views", 0),
        reverse=True
    )[:5]

    for video in trending_videos:
        if not opportunity_tracker.get_already_discovered("tiktok", video.get("video_id", "")):
            opportunities.append({
                "source_type": "tiktok",
                "description": f"Adapt Shorts from '{video['title'][:40]}' for TikTok/Instagram",
                "video_id": video["video_id"],
                "action": "create_adapt",
                "target": "TikTok + Instagram Reels",
                "estimated_reach": "Platform-dependent viral potential"
            })

    # DISCOVERY #6: Search Trend Keywords (new destinations/themes)
    subscriber_data = subscriber_tracking_result.get("current_metrics", {})
    if subscriber_data:
        opportunities.append({
            "source_type": "keyword_trend",
            "description": f"Research emerging {subscriber_data.get('top_destinations', 'travel')} trends on Google Trends",
            "video_id": None,
            "action": "research",
            "target": "Google Trends + YouTube Search Console",
            "estimated_reach": "Identify 3-5 trending topics"
        })

    # DISCOVERY #7: Backlink Opportunities (resource pages, guides)
    opportunities.append({
        "source_type": "backlink",
        "description": "Find resource pages, travel guides, 'best travel channels' lists for backlink requests",
        "video_id": None,
        "action": "contact",
        "target": "Travel resource blogs, aggregators (top 10 YouTube travel channels, etc.)",
        "estimated_reach": "Referring domain authority boost"
    })

    # Add all newly discovered opportunities to tracker
    for opp in opportunities:
        if not opportunity_tracker.get_already_discovered(opp["source_type"], opp["description"]):
            opportunity_tracker.add_opportunity(
                source_type=opp["source_type"],
                description=opp["description"],
                video_id=opp["video_id"],
                action_needed=opp["action"],
                contact_info=opp["target"],
                estimated_reach=opp["estimated_reach"]
            )

    return {
        "new_opportunities_discovered": len(opportunities),
        "opportunities": opportunities[:15],  # Top 15 for this report
        "note": "Daily discovery of legitimate growth channels. Tracked to avoid repeats."
    }
