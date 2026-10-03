"""
Shorts -> long-form funneling: for each destination with both Shorts and a
strong long-form video, generate CTA concepts (for new Shorts, and for
existing published Shorts that could add a CTA) pointing viewers at the
long-form video.
"""
import config
import destinations

_NEW_SHORTS_CTA_TEMPLATES = [
    "3 things that surprised me in {dest} -- full story linked below",
    "{dest} in 60 seconds -- the full vlog is on the channel",
    "The moment before everything went wrong in {dest} -- see what happened next",
]


def analyze(video_catalog, analytics):
    per_video_stats = {r["video"]: r for r in analytics.get("per_video", [])}

    by_dest = {}
    for v in video_catalog:
        dest_key = destinations.classify(v)
        if dest_key == config.UNCLASSIFIED_DESTINATION:
            continue  # not a coherent destination to funnel traffic around
        by_dest.setdefault(dest_key, []).append(v)

    def score(v):
        stats = per_video_stats.get(v["video_id"], {})
        return (stats.get("views", 0), v["view_count"])

    funnels = []
    for dest_key, videos in by_dest.items():
        longform = [v for v in videos if not v["is_likely_short"]]
        shorts = [v for v in videos if v["is_likely_short"]]
        if not longform or not shorts:
            continue

        target = sorted(longform, key=score, reverse=True)[0]
        label = destinations.label_for(dest_key)

        existing_shorts_ctas = [
            {
                "short_video_id": s["video_id"],
                "short_title": s["title"],
                "suggested_cta": f"Watch the full story: \"{target['title'][:50]}\" -- link in pinned comment/bio",
            }
            for s in sorted(shorts, key=score, reverse=True)[:3]
        ]

        new_short_ideas = [t.format(dest=label) for t in _NEW_SHORTS_CTA_TEMPLATES]

        funnels.append({
            "destination": label,
            "target_longform_video": {"video_id": target["video_id"], "title": target["title"]},
            "existing_shorts_ctas": existing_shorts_ctas,
            "new_shorts_cta_ideas": new_short_ideas,
        })

    funnels.sort(key=lambda f: len(f["existing_shorts_ctas"]), reverse=True)

    return {
        "funnels": funnels,
        "note": (
            "Pairs each destination's existing Shorts with its strongest long-form video "
            "(by 90-day views) and suggests a CTA pointing viewers there -- increases session "
            "time by moving viewers from a Short into a longer watch."
        ),
    }
