"""
YouTube Discovery Optimizer

Focus: BROWSE & SUGGESTED traffic (YouTube algorithm), not just Search

Browse: Videos shown when users scroll YouTube homepage/categories
Suggested: Videos recommended after/alongside other videos

Optimize for algorithm by:
- Matching topic clustering (videos on same destination cluster together)
- Optimizing hooks & CTR (first 30s retention)
- Building watch-time chains (sequencing videos to maximize session length)
"""


def analyze(analytics, video_catalog, momentum_result=None):
    """
    Optimize for YouTube Browse/Suggested, not just Search.
    """

    traffic_sources = analytics.get("traffic_sources", {})
    per_video = {v.get("video"): v for v in analytics.get("per_video", [])}

    # Step 1: Measure Browse/Suggested vs Search distribution
    browse_traffic = traffic_sources.get("Browse", {}).get("views", 0)
    suggested_traffic = traffic_sources.get("Suggested", {}).get("views", 0)
    search_traffic = traffic_sources.get("Search", {}).get("views", 0)
    total_traffic = sum(t.get("views", 0) for t in traffic_sources.values()) or 1

    browse_pct = (browse_traffic / total_traffic * 100) if total_traffic else 0
    suggested_pct = (suggested_traffic / total_traffic * 100) if total_traffic else 0
    search_pct = (search_traffic / total_traffic * 100) if total_traffic else 0

    # Step 2: Topic clustering - group by destination
    destinations = {}
    for video in video_catalog:
        dest = video.get("destination", "Other")
        if dest not in destinations:
            destinations[dest] = []
        destinations[dest].append(video)

    # Step 3: Find successful topic clusters (many views + good retention)
    cluster_performance = []
    for dest, videos in destinations.items():
        total_views = sum(v.get("views", 0) for v in videos)
        avg_retention = sum(v.get("averageViewPercentage", 0) for v in videos) / len(videos) if videos else 0

        cluster_performance.append({
            "destination": dest,
            "video_count": len(videos),
            "total_views": total_views,
            "avg_retention": round(avg_retention, 1),
            "strength": "Strong" if total_views > 1000 and avg_retention > 50 else "Weak"
        })

    cluster_performance.sort(key=lambda x: x["total_views"], reverse=True)

    # Step 4: Generate Browse/Suggested optimization actions
    actions = []

    # Weak clusters that should be strengthened
    weak_clusters = [c for c in cluster_performance if c["strength"] == "Weak" and c["video_count"] >= 3]
    for cluster in weak_clusters[:3]:
        actions.append({
            "type": "strengthen_cluster",
            "destination": cluster["destination"],
            "action": f"Improve {cluster['video_count']} {cluster['destination']} videos to cluster strength",
            "rationale": "YouTube recommends strong clusters. Browse/Suggested favor topical grouping",
            "expected_impact": "+20-40% Browse traffic if cluster reaches 'Strong'"
        })

    # First-30s optimization (critical for Browse/Suggested)
    high_view_low_retention = [
        v for v in video_catalog
        if v.get("views", 0) > 200 and v.get("averageViewPercentage", 0) < 40
    ]
    if high_view_low_retention:
        actions.append({
            "type": "improve_hooks",
            "count": len(high_view_low_retention[:3]),
            "videos": [v.get("title", "")[:40] for v in high_view_low_retention[:3]],
            "action": "Improve opening hooks (first 30s) to reduce drop-off",
            "rationale": "YouTube algorithm weighs early retention heavily for Browse/Suggested",
            "expected_impact": "+30% avg_view_pct → +15-25% Browse/Suggested traffic"
        })

    # Watch-time chaining (build playlists for session length)
    actions.append({
        "type": "optimize_watch_time_chains",
        "action": "Build topic-based playlists to maximize session length",
        "rationale": "Longer sessions = YouTube promotes video more to Browse/Suggested",
        "implementation": f"Create playlists for {len(cluster_performance)} destinations in priority order",
        "expected_impact": "+10-20% watch time per session = +25% Browse/Suggested promotion"
    })

    return {
        "current_traffic_split": {
            "browse_pct": round(browse_pct, 1),
            "suggested_pct": round(suggested_pct, 1),
            "search_pct": round(search_pct, 1),
            "other_pct": round(100 - browse_pct - suggested_pct - search_pct, 1)
        },
        "cluster_analysis": cluster_performance[:5],
        "optimization_actions": actions,
        "total_browse_suggested": round(browse_pct + suggested_pct, 1),
        "opportunity": f"If Browse/Suggested reaches 50% (vs {round(browse_pct + suggested_pct, 1)}%), channel could 2x total views"
    }
