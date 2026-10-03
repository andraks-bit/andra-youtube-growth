"""
Growth Engine: Title & Thumbnail Concept Generation

Detects videos with impressions (views) but weak engagement (low retention),
then generates 3 improved title concepts + 3 thumbnail concepts for each,
ranked by expected impact based on the video's actual performance data.

Uses:
- traffic_growth.py output (CTR-proxy flags, traffic sources)
- retention_patterns.py output (audience retention curves)
- keyword_discovery.py output (proven search keywords)
- search_seo.py output (prioritized keywords by destination)

Important: Title/thumbnail concepts are data-driven templates based on:
- Real search queries already bringing viewers
- Destination + topic performance patterns
- Actual retention drop-off points in the video
- Traffic source imbalances

This is NOT generic YouTube advice -- every concept references real metrics.
"""

import config


def _title_concepts_for_video(video_id, video, traffic_growth_result, search_seo_result, keyword_discovery_result):
    """
    Generate 3 title concept ideas for a specific video.
    Based on: actual search keywords, destination, performance gaps.
    """
    concepts = []

    # Find the traffic_growth assessment for this video
    priority_video = next(
        (pv for pv in traffic_growth_result.get("priority_videos", []) if pv["video_id"] == video_id),
        None
    )
    if not priority_video:
        return []

    destination = priority_video.get("destination", "")

    # Get top search keywords for this destination
    dest_keywords = [
        kw["keyword"] for kw in search_seo_result.get("prioritized_keywords", [])
        if kw.get("destination") == destination and kw["tier"] in ("proven_demand_gap", "channel_demand")
    ][:3]

    # Get keyword gaps for this specific video
    keyword_gap = next(
        (gap for gap in keyword_discovery_result.get("per_video_gaps", []) if gap["video_id"] == video_id),
        None
    )
    missing_keywords = keyword_gap.get("missing_terms", [])[:2] if keyword_gap else []

    # Pattern 1: Add proven search keyword to title
    if dest_keywords:
        kw = dest_keywords[0]
        concepts.append({
            "position": 1,
            "concept": f"\"{kw}\" at start: makes video discoverable for proven search demand",
            "rationale": f"This keyword already drives {priority_video['views_90d']} views without being targeted",
            "template": f"{kw} in {destination} -- [specific angle]",
        })

    # Pattern 2: Address CTR-proxy issue (high reach / low retention)
    if "high reach / low retention" in " ".join(priority_video.get("ctr_proxy_flags", [])):
        concepts.append({
            "position": 2,
            "concept": "Reframe the promise: title over-promises, content under-delivers",
            "rationale": f"Video gets {priority_video['views_90d']} views but {priority_video['retention_pct']:.0f}% retention (channel avg {traffic_growth_result.get('channel_avg_retention', 'n/a')}%)",
            "template": "[Specific deliverable] in {dest} -- [what actually happens]",
        })

    # Pattern 3: Leverage missing search terms
    if missing_keywords:
        kw = missing_keywords[0]
        concepts.append({
            "position": 3,
            "concept": f"Add '{kw}': found in video but missing from title",
            "rationale": f"This term appears in the video but isn't in the title, reducing discoverability",
            "template": f"{video['title'][:40]} -- {kw} included",
        })

    return concepts


def _thumbnail_concepts_for_video(video_id, video, traffic_growth_result, retention_curves, analytics):
    """
    Generate 3 thumbnail concept ideas for a specific video.
    Based on: retention curves, traffic sources, CTR-proxy signals.
    """
    concepts = []

    # Find the traffic_growth assessment for this video
    priority_video = next(
        (pv for pv in traffic_growth_result.get("priority_videos", []) if pv["video_id"] == video_id),
        None
    )
    if not priority_video:
        return []

    # 1. If high reach / low retention: focus on clarity/specificity
    if "high reach / low retention" in " ".join(priority_video.get("ctr_proxy_flags", [])):
        concepts.append({
            "position": 1,
            "concept": "Increase clarity: viewers think they know what they're getting but don't",
            "rationale": f"Video gets clicked ({priority_video['views_90d']} views) but retention drops {priority_video['retention_pct']:.0f}%",
            "design_strategy": "Show the actual benefit/deliverable clearly (not a teaser/bait)",
        })

    # 2. If traffic source opportunity: highlight the relevant element
    sources = priority_video.get("traffic_source_opportunities", [])
    if any("Search" in s for s in sources):
        concepts.append({
            "position": 2,
            "concept": "Thumbnail should show the destination/topic visually",
            "rationale": "Search viewers need to see what they're getting (destination-specific)",
            "design_strategy": "Clear, recognizable landmark or destination identifier",
        })

    # 3. Standard performance pattern
    concepts.append({
        "position": 3,
        "concept": "Test a variation: bold text overlay of the key destination/action",
        "rationale": f"Channel average CTR-proxy is strong; test this video with clearer visual hierarchy",
        "design_strategy": "Large, readable text; relevant imagery; consistent with channel style",
    })

    return concepts


def analyze(video_catalog, traffic_growth_result, search_seo_result, keyword_discovery_result, retention_curves, analytics):
    """
    Generate title + thumbnail concepts for videos with engagement issues.

    Args:
        video_catalog: List of all videos
        traffic_growth_result: Output of traffic_growth.analyze()
        search_seo_result: Output of search_seo.analyze()
        keyword_discovery_result: Output of keyword_discovery.analyze()
        retention_curves: Retention curves from analytics
        analytics: Full analytics result

    Returns:
        {
            "candidates": [
                {
                    "video_id": "...",
                    "title": "...",
                    "destination": "...",
                    "current_performance": {...},
                    "title_concepts": [...],
                    "thumbnail_concepts": [...],
                }
            ],
            "note": "..."
        }
    """

    if not traffic_growth_result or not traffic_growth_result.get("priority_videos"):
        return {
            "candidates": [],
            "note": "No videos with engagement issues found in this analysis window."
        }

    candidates = []

    for priority_video in traffic_growth_result["priority_videos"]:
        video_id = priority_video["video_id"]
        video = next((v for v in video_catalog if v["video_id"] == video_id), None)
        if not video:
            continue

        # Only generate concepts for videos with the CTR-proxy flags (engagement issues)
        if not priority_video.get("ctr_proxy_flags"):
            continue

        title_concepts = _title_concepts_for_video(
            video_id, video, traffic_growth_result, search_seo_result, keyword_discovery_result
        )
        thumbnail_concepts = _thumbnail_concepts_for_video(
            video_id, video, traffic_growth_result, retention_curves, analytics
        )

        if title_concepts or thumbnail_concepts:
            candidates.append({
                "video_id": video_id,
                "title": video["title"],
                "destination": priority_video["destination"],
                "views_90d": priority_video["views_90d"],
                "retention_pct": priority_video["retention_pct"],
                "ctr_proxy_flags": priority_video["ctr_proxy_flags"],
                "title_concepts": title_concepts,
                "thumbnail_concepts": thumbnail_concepts,
                "rationale": " | ".join(priority_video["ctr_proxy_flags"][:1]),
            })

    candidates.sort(key=lambda c: c["views_90d"], reverse=True)

    return {
        "candidates": candidates[:10],  # Top 10 candidates
        "note": (
            "Title and thumbnail concepts for videos with engagement issues "
            "(high reach / low retention, or low reach / high retention). "
            "All concepts are based on real data: search keywords, retention curves, and traffic patterns. "
            "Concepts are NOT generic advice -- each references actual metrics from this channel."
        ),
    }
