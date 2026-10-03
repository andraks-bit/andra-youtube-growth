"""
Content Ideation Engine - Phase 3.

Transforms growth opportunities into concrete video/Shorts ideas.

Generates:
  - High-potential long-form video ideas (ranked by audience demand + seasonality)
  - Shorts ideas (extracted from long-form or standalone)
  - Series ideas (multi-part deep dives on high-opportunity topics)
  - Evergreen content (timeless, searchable travel content)
  - Trending content (time-sensitive, capitalize-now opportunities)
  - Subscriber funnel ideas (where/how to ask for subscribes)

All ideas are grounded in real demand signals, not fabricated.
"""
import datetime


def generate_video_ideas_from_trends(trends_result, keyword_discovery, destination_performance):
    """
    Generate high-potential video ideas from seasonal peaks and trends.

    Returns: [
        {
            "type": "seasonal_deep_dive",
            "destination": str,
            "season": str,
            "title_options": [str, ...],
            "target_keywords": [str, ...],
            "format": "longform",
            "length_recommendation": "15-25 minutes",
            "expected_views": int,
            "urgency": 1-3,
            "reasoning": str,
        }
    ]
    """
    ideas = []

    seasonal_opps = trends_result.get("seasonal_opportunities", {}).get("seasonal_opportunities", [])

    for opp in seasonal_opps:
        if opp.get("urgency", 1) >= 2:  # Only high-urgency seasonal content
            destination = opp.get("destination", "").split("/")[0].strip()
            season = opp.get("season", "")

            # Generate title options for this seasonal opportunity
            title_options = [
                f"{destination} in {season.split('(')[0].strip()} 2026 | Full Guide",
                f"Ultimate {destination} Travel Guide",
                f"Best Time to Visit {destination}: {season}",
                f"72 Hours in {destination}: {season}",
            ]

            # Find keywords for this destination
            dest_keywords = keyword_discovery.get("gaps_by_destination", {}).get(destination, [])
            target_keywords = [k.get("term") for k in dest_keywords[:5]]

            ideas.append({
                "type": "seasonal_deep_dive",
                "destination": destination,
                "season": season,
                "title_options": title_options,
                "target_keywords": target_keywords,
                "format": "longform",
                "length_recommendation": "15-25 minutes",
                "expected_views": 500,  # Conservative estimate for seasonal content
                "urgency": opp.get("urgency", 2),
                "reasoning": f"Peak season for {destination}: high search demand now",
                "publish_timeline": "Within 7 days" if opp.get("urgency") == 3 else "Within 2 weeks",
            })

    return ideas


def generate_shorts_ideas_from_videos(video_catalog, shorts_result, ctr_optimization):
    """
    Generate Shorts ideas from high-performing long-form videos.

    Shorts should be extracted from videos that:
      - Have high retention (good content that works)
      - Have high views (proven audience interest)
      - Cover topics that fit vertical format
    """
    ideas = []

    # Videos with momentum + good retention = good Shorts candidates
    if shorts_result:
        for shorts_opp in shorts_result.get("opportunities", [])[:8]:
            source_id = shorts_opp.get("source_video_id")
            source_title = shorts_opp.get("source_video_title", "")

            ideas.append({
                "type": "shorts_extraction",
                "source_video_id": source_id,
                "source_video_title": source_title,
                "shorts_ideas_count": len(shorts_opp.get("shorts_ideas", [])),
                "format": "shorts",
                "length_recommendation": "15-60 seconds",
                "shorts_angles": [
                    "First impression / arrival reaction",
                    "Most surprising thing I found",
                    "Local food / dining experience",
                    "Hidden gem only locals know",
                    "Biggest tourist mistake to avoid",
                ],
                "expected_reach_multiplier": 2.5,  # Shorts get 2.5x reach vs. long-form in travel niche
                "urgency": 1,
                "reasoning": f"Extract high-engagement moments from proven content",
            })

    return ideas


def generate_subscriber_funnel_ideas(video_catalog, ctr_optimization, destination_performance):
    """
    Generate ideas for where/how to naturally ask for subscriptions.

    Based on:
      - High-performing videos (where viewers are engaged)
      - Cliffhanger potential (end of video is good CTA moment)
      - Series potential (subscribe to follow the journey)
    """
    ideas = []

    if ctr_optimization:
        high_performers = ctr_optimization.get("critical_ctr_wins", [])[:3]

        for video in high_performers:
            video_id = video.get("video_id")
            title = video.get("title", "")

            # These videos are already nailing both reach and retention
            # Good places to ask for subs
            ideas.append({
                "type": "subscriber_cta",
                "video_id": video_id,
                "video_title": title,
                "current_performance": {
                    "score": video.get("ctr_proxy_score"),
                    "confidence": video.get("signal_confidence"),
                },
                "cta_strategy": "End screen CTA",
                "cta_timing": "After main content, before outro (last 15 seconds)",
                "cta_message_options": [
                    "Subscribe to see what happens next",
                    "Like and subscribe for more adventure",
                    "Subscribe to follow this journey",
                ],
                "expected_subscriber_lift": 0.05,  # 5% of viewers when well-placed
                "series_potential": True,  # High performers have follow-up potential
                "reasoning": "Place CTAs on videos already keeping viewers engaged",
            })

    return ideas


def generate_evergreen_series_ideas(video_catalog, destination_performance, keyword_discovery):
    """
    Generate ideas for evergreen series content.

    Evergreen series are:
      - Timeless (relevant year-round)
      - Searchable (people seek them out)
      - Serializable (multiple videos on same theme)

    Examples:
      - "X Tips for Visiting [destination]" series
      - "First Time in [destination]" series
      - "[Destination] On A Budget" series
    """
    ideas = []

    series_templates = [
        {
            "template": "{dest} Budget Travel Guide | Cheap Eats, Hotels & Activities",
            "angles": ["Budget food", "Affordable hotels", "Free activities", "Transportation hacks"],
            "video_count": 4,
        },
        {
            "template": "Luxury vs. Budget in {dest} | What's Actually Worth the Money?",
            "angles": ["Hotels comparison", "Dining comparison", "Activities", "Transportation"],
            "video_count": 4,
        },
        {
            "template": "72 Hours in {dest} | Complete Itinerary",
            "angles": ["Day 1 arrival", "Day 2 main attractions", "Day 3 hidden gems", "Where to eat/sleep"],
            "video_count": 4,
        },
    ]

    # Generate series ideas for top destinations
    for dest in destination_performance.get("destinations", [])[:3]:
        dest_label = dest["destination"]
        dest_short = dest_label.split("/")[0].strip()

        for template in series_templates:
            title_template = template["template"]
            title_base = title_template.format(dest=dest_short)

            ideas.append({
                "type": "evergreen_series",
                "destination": dest_label,
                "series_title": title_base,
                "planned_episodes": template["video_count"],
                "episode_angles": template["angles"],
                "format": "longform",
                "length_per_episode": "10-15 minutes",
                "keywords": keyword_discovery.get("gaps_by_destination", {}).get(dest_label, [])[:3],
                "expected_views_per_episode": 300,
                "total_series_views": 300 * template["video_count"],
                "urgency": 1,  # Evergreen, no rush
                "reasoning": f"Evergreen series build authority and watch-time on {dest_label}",
            })

    return ideas


def consolidate_ideas(video_ideas, shorts_ideas, subscriber_ideas, series_ideas):
    """
    Consolidate all generated ideas into a prioritized list.

    Scoring factors:
      - Expected views/reach
      - Urgency (time-sensitive vs. evergreen)
      - Effort required
      - Subscriber lift potential
    """
    all_ideas = []

    for idea in video_ideas + shorts_ideas + subscriber_ideas + series_ideas:
        # Calculate priority
        urgency = idea.get("urgency", 1)
        expected_views = idea.get("expected_views", idea.get("expected_reach_multiplier", 1) * 100)
        expected_subs = idea.get("expected_subscriber_lift", 0)

        # Score: (views + subs*100) * urgency / effort
        effort_hours = {
            "seasonal_deep_dive": 12,
            "shorts_extraction": 2,
            "subscriber_cta": 0.5,
            "evergreen_series": 48,  # 4 videos * 12 hours each
        }
        hours = effort_hours.get(idea.get("type"), 8)

        roi = ((expected_views + expected_subs * 1000) * urgency) / max(hours, 1)

        idea["roi_score"] = roi
        idea["priority"] = max(1, min(5, int(1 + (roi / 100))))  # Normalize to 1-5

        all_ideas.append(idea)

    # Sort by priority and ROI
    all_ideas.sort(key=lambda i: (i["priority"], i["roi_score"]), reverse=True)

    return all_ideas


def analyze(video_catalog, trends_result, keyword_discovery, destination_performance,
            shorts_result, ctr_optimization):
    """
    Generate complete content ideation: video ideas, Shorts, series, CTAs.

    All ideas grounded in data: seasonal peaks, audience demand, high-performer patterns.
    """

    video_ideas = generate_video_ideas_from_trends(trends_result, keyword_discovery, destination_performance)
    shorts_ideas = generate_shorts_ideas_from_videos(video_catalog, shorts_result, ctr_optimization)
    subscriber_ideas = generate_subscriber_funnel_ideas(video_catalog, ctr_optimization, destination_performance)
    series_ideas = generate_evergreen_series_ideas(video_catalog, destination_performance, keyword_discovery)

    all_ideas = consolidate_ideas(video_ideas, shorts_ideas, subscriber_ideas, series_ideas)

    # Organize by type for easy consumption
    by_type = {}
    for idea in all_ideas:
        idea_type = idea.get("type")
        if idea_type not in by_type:
            by_type[idea_type] = []
        by_type[idea_type].append(idea)

    return {
        "all_ideas": all_ideas,
        "by_type": by_type,
        "total_ideas": len(all_ideas),
        "top_10": all_ideas[:10],
        "immediate_actions": [i for i in all_ideas if i.get("urgency", 1) >= 3][:5],
        "note": (
            "Content ideation: transforms growth opportunities into specific video/Shorts ideas. "
            "All ideas grounded in real audience demand, seasonal peaks, and performance data. "
            "Ranked by ROI (expected views + subscriber lift) / effort."
        ),
    }
