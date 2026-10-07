"""
Phase 4: Distribution & Outreach Strategy Engine.

Identifies legitimate, organic distribution opportunities across platforms:
- Pinterest (high-intent travel audience, long content lifespan)
- Instagram (clips, Reels, story series)
- Relevant communities (Reddit, travel forums, destination groups)
- Collaboration opportunities (similar channels)
- Cross-promotion strategies

All recommendations are for ORGANIC, legitimate distribution only.
No bots, paid engagement, or fake activity.
"""


def generate_pinterest_strategy(video_catalog, destination_performance, ctr_optimization):
    """
    Pinterest is high-value for travel content: users actively planning trips,
    long average pin lifespan (200+ days vs. 48 hours on Instagram).

    Strategy: Create travel guides, destination lists, packing lists, itineraries.
    """

    opportunities = []

    # High-performing destination videos are good Pinterest candidates
    if ctr_optimization:
        high_performers = ctr_optimization.get("critical_ctr_wins", [])

        for video in high_performers[:3]:
            video_id = video.get("video_id")
            title = video.get("title", "")

            # Extract destination from title (simplified)
            destinations = ["Tokyo", "Bali", "Dubai", "Sydney", "Marbella"]
            matching_dest = next((d for d in destinations if d.lower() in title.lower()), None)

            if matching_dest:
                opportunities.append({
                    "type": "pinterest_pin",
                    "platform": "Pinterest",
                    "source_video_id": video_id,
                    "source_video_title": title,
                    "destination": matching_dest,
                    "pin_ideas": [
                        f"Ultimate {matching_dest} Travel Guide (Free PDF Checklist)",
                        f"72-Hour {matching_dest} Itinerary for First-Timers",
                        f"{matching_dest} Travel Budget Breakdown 2026",
                        f"Hidden Gems in {matching_dest} Only Locals Know",
                    ],
                    "content_lifespan": "200+ days",
                    "expected_traffic": 50,  # Conservative estimate per pin
                    "effort_hours": 1.0,  # Create pin + write description
                    "link_to": f"youtube.com/watch?v={video_id}",
                    "urgency": 1,
                    "roi_score": 50,  # 50 views per hour of effort
                })

    return opportunities


def generate_instagram_strategy(video_catalog, content_ideation=None):
    """
    Instagram strategy: Reels (short video clips), Stories (behind-the-scenes),
    carousel posts (destination guides).

    High-performing Shorts → Instagram Reels.
    Travel tips → carousel posts.
    Daily vlogging → Stories series.
    """

    opportunities = []

    # Shorts extraction opportunities → Instagram Reels
    if content_ideation:
        shorts_ideas = content_ideation.get("by_type", {}).get("shorts_extraction", [])

        for shorts in shorts_ideas[:3]:
            source_title = shorts.get("source_video_title", "")
            shorts_count = shorts.get("shorts_ideas_count", 0)

            opportunities.append({
                "type": "instagram_reels",
                "platform": "Instagram",
                "source_video": source_title,
                "content_format": "15-60 second Reels",
                "reel_count": min(shorts_count, 5),
                "hashtag_strategy": "#TravelVlog #[Destination] #YoutubeShortsComingSoon",
                "cta": "Link in bio to full video",
                "expected_traffic": 20 * min(shorts_count, 5),  # 20 clicks per Reel
                "effort_hours": 0.5,  # Quick audio/caption sync
                "urgency": 2,  # Medium-high: Reels have strong Instagram algorithm boost
                "roi_score": 40,
            })

    # Carousel posts: travel tips, destination guides
    opportunities.append({
        "type": "instagram_carousel",
        "platform": "Instagram",
        "content_format": "10-slide carousel posts",
        "carousel_ideas": [
            "10 Things First-Time Travelers Get Wrong",
            "Budget Travel Hacks by Destination",
            "Best Food in [Destination] (Local Favorites Only)",
            "Packing List for Different Travel Styles",
        ],
        "posting_frequency": "2-3x per week",
        "expected_traffic": 15,
        "effort_hours": 2.0,  # Design + copy
        "urgency": 1,
        "roi_score": 7.5,
    })

    return opportunities


def generate_community_opportunities(destination_performance, keyword_discovery):
    """
    Reddit, travel forums, destination-specific Facebook groups, Discord communities.

    Strategy: Participate authentically, share videos when relevant to discussion.
    Never spam; provide value first.
    """

    communities = {
        "reddit": [
            {"subreddit": r_sub, "monthly_visitors": visitors, "travel_focus": focus}
            for r_sub, visitors, focus in [
                ("r/travel", 2000000, "General travel advice"),
                ("r/Japan", 500000, "Japan-specific"),
                ("r/indonesia", 200000, "Indonesia-specific"),
                ("r/dubai", 150000, "UAE-specific"),
                ("r/sydney", 400000, "Australia-specific"),
            ]
        ],
        "facebook_groups": [
            "Budget Travel Tips",
            "[Destination] Travel Group",
            "Digital Nomad Community",
            "Solo Female Travelers",
        ],
        "forums": [
            "TripAdvisor Forum",
            "Lonely Planet's Thorn Tree",
            "Travel Stackexchange",
        ],
    }

    opportunities = []

    # Create participation strategy for Reddit
    for reddit_community in communities["reddit"]:
        subreddit = reddit_community["subreddit"]
        focus = reddit_community["travel_focus"]

        opportunities.append({
            "type": "reddit_engagement",
            "platform": "Reddit",
            "community": subreddit,
            "monthly_reach": reddit_community["monthly_visitors"],
            "participation_strategy": "Answer travel questions authentically, share video when directly relevant",
            "content_link": "youtube.com/c/AndraKiirkivi",
            "posting_frequency": "2-3 times per week",
            "expected_traffic": 10,
            "effort_hours": 1.0,  # Reading + thoughtful response
            "urgency": 2,
            "roi_score": 10,
            "rules": "Read community rules first. Never pure self-promotion.",
        })

    return opportunities


def generate_collaboration_opportunities(destination_performance, video_catalog):
    """
    Find similar travel channels for collaboration, cross-promotion, link-swaps.

    Strategy: Identify complementary channels (same niches, similar size),
    propose collaborations that benefit both audiences.
    """

    opportunities = []

    # Identify top destinations for collaboration focus
    top_dests = destination_performance.get("destinations", [])[:3]

    for dest in top_dests:
        dest_label = dest["destination"]

        opportunities.append({
            "type": "collaboration_opportunity",
            "platform": "Direct outreach",
            "focus_destination": dest_label,
            "collaboration_ideas": [
                f"Guest appearance on [similar channel]'s {dest_label} video",
                f"Cross-promotion: they feature your video, you theirs",
                f"Link swap: mention each other's channels in descriptions",
                f"Collaboration video: both channels, split production",
            ],
            "target_channel_criteria": "1000-100k subscribers, travel/vlog niche, same destination focus",
            "outreach_template": "Personalized email highlighting audience overlap",
            "expected_traffic": 50,  # From each collaboration
            "effort_hours": 3.0,  # Research + outreach + negotiation
            "urgency": 1,  # Evergreen, but takes time to arrange
            "roi_score": 16.7,  # 50 views per 3 hours
        })

    return opportunities


def generate_embed_strategy(video_catalog):
    """
    Identify opportunities for video embeds on travel blogs, guides, forums.

    Strategy: Create embeddable content (destination guides, how-tos),
    then research where to propose embeds.
    """

    opportunities = []

    opportunities.append({
        "type": "embed_strategy",
        "platform": "Web embeds",
        "target_sites": [
            "Travel blogs covering your destinations",
            "Budget travel guides",
            "Digital nomad resources",
            "Destination wikis/guides",
        ],
        "content_to_embed": "Destination guides, how-to videos, travel tips",
        "outreach_approach": "Contact site owners with YouTube embed code",
        "expected_traffic": 100,
        "effort_hours": 5.0,  # Research + personalized outreach
        "urgency": 1,
        "roi_score": 20.0,
    })

    return opportunities


def analyze(video_catalog, destination_performance, keyword_discovery,
            ctr_optimization=None, content_ideation=None):
    """
    Complete distribution strategy across all organic channels.
    """

    pinterest_opps = generate_pinterest_strategy(video_catalog, destination_performance, ctr_optimization)
    instagram_opps = generate_instagram_strategy(video_catalog, content_ideation)
    community_opps = generate_community_opportunities(destination_performance, keyword_discovery)
    collab_opps = generate_collaboration_opportunities(destination_performance, video_catalog)
    embed_opps = generate_embed_strategy(video_catalog)

    all_opportunities = pinterest_opps + instagram_opps + community_opps + collab_opps + embed_opps

    # Sort by ROI
    all_opportunities.sort(key=lambda o: o.get("roi_score", 0), reverse=True)

    return {
        "all_distribution_opportunities": all_opportunities,
        "by_platform": {
            "pinterest": pinterest_opps,
            "instagram": instagram_opps,
            "reddit_and_communities": community_opps,
            "collaborations": collab_opps,
            "embeds": embed_opps,
        },
        "total_opportunities": len(all_opportunities),
        "total_expected_traffic": sum(o.get("expected_traffic", 0) for o in all_opportunities),
        "total_effort_hours": sum(o.get("effort_hours", 0) for o in all_opportunities),
        "note": (
            "Distribution strategy: identifies organic, legitimate opportunities to "
            "promote content across Pinterest, Instagram, Reddit, collaborations, and embeds. "
            "All strategies are authentic community participation, never spam or fake engagement."
        ),
    }
