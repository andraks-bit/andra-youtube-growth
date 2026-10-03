"""
Subscriber Growth Patterns

Identifies patterns in video characteristics (topic, destination, length, title,
engagement, retention, traffic sources) that correlate with subscriber growth.

Analyzes:
- Destination performance for subscriber growth
- Video length impact (Shorts vs long-form)
- Title patterns (keywords, length, style)
- Engagement patterns (likes, comments, shares)
- Traffic source correlation with subscriber growth
- Retention patterns (watch time, dropoff points)
"""

import destinations as dest_module


def analyze(video_catalog, per_video_stats, analytics, subscriber_conversion_result, traffic_growth_result):
    """
    Identify patterns that drive subscriber growth.

    Args:
        video_catalog: List of all videos
        per_video_stats: Per-video statistics
        analytics: Full analytics result
        subscriber_conversion_result: Result from subscriber_conversion.analyze()
        traffic_growth_result: Result from traffic_growth.analyze()

    Returns:
        {
            "destination_subscriber_performance": [...],
            "video_length_analysis": {...},
            "engagement_subscriber_correlation": {...},
            "retention_subscriber_correlation": {...},
            "traffic_source_subscriber_correlation": {...},
            "title_length_analysis": {...},
            "high_subscriber_patterns": [...],
            "note": "..."
        }
    """

    high_potential = subscriber_conversion_result.get("high_potential_videos", [])
    low_potential = subscriber_conversion_result.get("low_potential_videos", [])

    # Destination subscriber performance
    by_destination = {}
    for video in video_catalog:
        dest_key = dest_module.classify(video)
        if dest_key == "UNCLASSIFIED":
            continue
        if dest_key not in by_destination:
            by_destination[dest_key] = {
                "videos": [],
                "total_subs_gained": 0,
                "total_views": 0,
                "high_potential_count": 0,
            }

        stats = per_video_stats.get(video["video_id"], {})
        views = stats.get("views", 0)
        is_high_potential = any(hp["video_id"] == video["video_id"] for hp in high_potential)

        by_destination[dest_key]["videos"].append(video["video_id"])
        by_destination[dest_key]["total_views"] += views
        by_destination[dest_key]["high_potential_count"] += (1 if is_high_potential else 0)

    dest_performance = []
    for dest_key, data in sorted(by_destination.items()):
        dest_label = dest_module.label_for(dest_key)
        high_pct = (data["high_potential_count"] / len(data["videos"]) * 100) if data["videos"] else 0

        dest_performance.append({
            "destination": dest_label,
            "video_count": len(data["videos"]),
            "total_views": data["total_views"],
            "high_potential_percent": round(high_pct, 1),
            "recommendation": "strong subscriber potential" if high_pct >= 50 else "moderate" if high_pct >= 25 else "low"
        })

    dest_performance.sort(key=lambda d: d["high_potential_percent"], reverse=True)

    # Video length analysis
    shorts = [v for v in video_catalog if v.get("is_likely_short")]
    longform = [v for v in video_catalog if not v.get("is_likely_short")]

    shorts_high_pot = sum(1 for s in shorts if any(hp["video_id"] == s["video_id"] for hp in high_potential))
    longform_high_pot = sum(1 for l in longform if any(hp["video_id"] == l["video_id"] for hp in high_potential))

    length_analysis = {
        "shorts": {
            "count": len(shorts),
            "high_potential_count": shorts_high_pot,
            "high_potential_percent": round(shorts_high_pot / len(shorts) * 100, 1) if shorts else 0,
        },
        "longform": {
            "count": len(longform),
            "high_potential_count": longform_high_pot,
            "high_potential_percent": round(longform_high_pot / len(longform) * 100, 1) if longform else 0,
        }
    }

    # Engagement patterns
    high_engagement = [v for v in high_potential if v["engagement_count"] > 10]
    low_engagement = [v for v in high_potential if v["engagement_count"] <= 10]

    engagement_analysis = {
        "high_potential_high_engagement": len(high_engagement),
        "high_potential_low_engagement": len(low_engagement),
        "pattern": "High subscriber potential videos also have high engagement" if len(high_engagement) > len(low_engagement) else "Engagement not required for subscriber growth"
    }

    # Retention patterns
    retentions_high = [v["retention_pct"] for v in high_potential if v["retention_pct"] > 0]
    retentions_low = [v["retention_pct"] for v in low_potential if v["retention_pct"] > 0]

    avg_retention_high = sum(retentions_high) / len(retentions_high) if retentions_high else 0
    avg_retention_low = sum(retentions_low) / len(retentions_low) if retentions_low else 0

    retention_analysis = {
        "high_potential_avg_retention": round(avg_retention_high, 1),
        "low_potential_avg_retention": round(avg_retention_low, 1),
        "retention_advantage": round(avg_retention_high - avg_retention_low, 1),
        "pattern": f"High-subscriber videos have {round(avg_retention_high - avg_retention_low, 1)}% higher retention"
    }

    # Title length analysis
    high_pot_titles = [v["title"] for v in high_potential if v["title"]]
    avg_title_length = sum(len(t) for t in high_pot_titles) / len(high_pot_titles) if high_pot_titles else 0

    title_analysis = {
        "avg_high_potential_title_length": round(avg_title_length, 0),
        "titles_sample": high_pot_titles[:3] if high_pot_titles else [],
        "recommendation": "Keep titles concise if avg < 50" if avg_title_length < 50 else "Titles can be descriptive"
    }

    # Overall patterns
    patterns = []

    if length_analysis["longform"]["high_potential_percent"] > length_analysis["shorts"]["high_potential_percent"] * 1.5:
        patterns.append("Long-form videos drive significantly more subscribers than Shorts")
    elif length_analysis["shorts"]["high_potential_percent"] > length_analysis["longform"]["high_potential_percent"] * 1.5:
        patterns.append("Shorts drive significantly more subscribers than long-form")

    if retention_analysis["retention_advantage"] > 5:
        patterns.append(f"High-subscriber videos have {retention_analysis['retention_advantage']:.1f}% better retention")

    if dest_performance[0]["high_potential_percent"] > 60:
        patterns.append(f"Destination '{dest_performance[0]['destination']}' shows strongest subscriber conversion")

    return {
        "destination_performance": dest_performance,
        "video_length_analysis": length_analysis,
        "engagement_correlation": engagement_analysis,
        "retention_correlation": retention_analysis,
        "title_analysis": title_analysis,
        "high_subscriber_patterns": patterns,
        "note": (
            "Analysis based on video characteristics and subscriber conversion potential. "
            "Identifies patterns that correlate with higher subscriber-generating videos."
        ),
    }
