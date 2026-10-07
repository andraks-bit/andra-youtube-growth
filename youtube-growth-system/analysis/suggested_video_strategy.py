"""
Topic-cluster-based internal linking strategy: which videos should point
viewers at each other (end-screens, cards, playlists, description links,
pinned comments) to increase session time.

Data-honesty note: the YouTube Data API does not expose a channel's existing
end-screen/card configuration (no public .list for that), so this can only
generate fresh recommendations each run -- it cannot check what's already
set up in Studio. Said explicitly in the note below.

Clusters = destinations (reuses destinations.classify from Step 4).
"""
import config
import destinations

MAX_PAIRS_PER_CLUSTER = 5
MIN_VIDEOS_FOR_PLAYLIST = 3


def analyze(video_catalog, analytics):
    per_video_stats = {r["video"]: r for r in analytics.get("per_video", [])}

    clusters_videos = {}
    for v in video_catalog:
        dest_key = destinations.classify(v)
        if dest_key == config.UNCLASSIFIED_DESTINATION:
            continue  # not a coherent topic to cluster/playlist around
        clusters_videos.setdefault(dest_key, []).append(v)

    def score(v):
        stats = per_video_stats.get(v["video_id"], {})
        return (stats.get("views", 0), v["view_count"])

    clusters = []
    for dest_key, videos in clusters_videos.items():
        if len(videos) < 2:
            continue
        label = destinations.label_for(dest_key)
        ranked = sorted(videos, key=score, reverse=True)
        hub = ranked[0]

        pairs = []
        for v in ranked[1:MAX_PAIRS_PER_CLUSTER + 1]:
            pairs.append({
                "from_video_id": v["video_id"],
                "from_title": v["title"],
                "to_video_id": hub["video_id"],
                "to_title": hub["title"],
                "reason": f"same destination ({label}); {hub['title'][:40]} is the top performer in this cluster",
            })
        # Hub also links forward to the next-best 2 videos, so it's not a dead end.
        for v in ranked[1:3]:
            pairs.append({
                "from_video_id": hub["video_id"],
                "from_title": hub["title"],
                "to_video_id": v["video_id"],
                "to_title": v["title"],
                "reason": f"keep viewers inside the {label} cluster after the top performer",
            })

        playlist_suggestion = f"{label} Travel Vlogs" if len(videos) >= MIN_VIDEOS_FOR_PLAYLIST else None

        clusters.append({
            "destination": label,
            "video_count": len(videos),
            "hub_video": {"video_id": hub["video_id"], "title": hub["title"]},
            "recommended_pairs": pairs,
            "playlist_suggestion": playlist_suggestion,
            "description_link_text": f"More from {label}: [link to {hub['title'][:50]}]",
            "pinned_comment_text": f"If you loved this, watch my {label} trip here → [link to {hub['title'][:50]}]",
        })

    clusters.sort(key=lambda c: c["video_count"], reverse=True)

    return {
        "clusters": clusters,
        "note": (
            "YouTube's API does not expose your existing end-screen/card setup, so these are "
            "fresh recommendations each run -- cross-check against what's already configured "
            "in Studio before adding more. Clusters = destinations; hub = top performer in "
            "that cluster by 90-day views."
        ),
    }
