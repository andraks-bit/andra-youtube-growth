"""
Compares the retention-curve shape of the channel's best- vs worst-performing
videos (among those with a curve at all -- see config.RETENTION_MIN_VIEWS)
to surface a concrete, data-grounded pattern rather than generic advice.

Split by format (Shorts vs long-form) rather than pooled: Shorts can show
audienceWatchRatio > 100% because people rewatch/loop them (confirmed
empirically -- the channel's top-viewed Shorts are 4-19s clips with ratios
above 1.0 at every checkpoint), which is real YouTube behavior but not
comparable to long-form drop-off, and not what "structure a better vlog"
advice should be based on.
"""
import config

_CHECKPOINTS = [0.1, 0.25, 0.5, 0.75, 0.9]


def _nearest_ratio_value(curve, target_ratio):
    if not curve:
        return None
    closest = min(curve, key=lambda p: abs(p["elapsed_ratio"] - target_ratio))
    return closest["audience_watch_ratio"]


def _avg_curve(video_ids, retention_curves):
    result = {}
    for cp in _CHECKPOINTS:
        values = [
            _nearest_ratio_value(retention_curves[vid], cp)
            for vid in video_ids
            if vid in retention_curves and retention_curves[vid]
        ]
        values = [v for v in values if v is not None]
        result[cp] = round(sum(values) / len(values), 3) if values else None
    return result


def _build_insight(top_avg, bottom_avg, is_shorts):
    early_top, early_bottom = top_avg.get(0.25), bottom_avg.get(0.25)
    if early_top is None or early_bottom is None:
        return None
    gap_pct = round((early_top - early_bottom) * 100, 1)
    loop_note = (
        " (ratios above 100% are real -- Shorts get rewatched/looped, this isn't an error)"
        if is_shorts and (early_top > 1 or early_bottom > 1) else ""
    )
    if abs(gap_pct) >= 3:
        direction = "higher" if gap_pct > 0 else "lower"
        return (
            f"By the 25% mark, top-performing {'Shorts' if is_shorts else 'long-form videos'} "
            f"retain {early_top*100:.0f}% of viewers on average vs {early_bottom*100:.0f}% for "
            f"lower-performing ones ({abs(gap_pct):.1f} points {direction}){loop_note} -- the "
            f"opening {'hook' if gap_pct > 0 else 'section'} is the clearest differentiator here."
        )
    return (
        f"Top and bottom performing {'Shorts' if is_shorts else 'long-form videos'} retain "
        "viewers similarly through the first quarter -- the performance gap shows up later, "
        "not in the opening hook."
    )


def _compare_cohort(video_ids_ranked, titles, retention_curves, is_shorts):
    n = config.RETENTION_PATTERN_COHORT_SIZE
    if len(video_ids_ranked) < 4:
        return {
            "videos_with_curves": len(video_ids_ranked),
            "top_cohort": [], "bottom_cohort": [],
            "top_avg_curve": {}, "bottom_avg_curve": {},
            "insight": None,
        }

    top_ids = video_ids_ranked[:n]
    bottom_ids = video_ids_ranked[-n:] if len(video_ids_ranked) > n else video_ids_ranked[n:]
    top_avg = _avg_curve(top_ids, retention_curves)
    bottom_avg = _avg_curve(bottom_ids, retention_curves)

    return {
        "videos_with_curves": len(video_ids_ranked),
        "top_cohort": [{"video_id": v, "title": titles.get(v, v)} for v in top_ids],
        "bottom_cohort": [{"video_id": v, "title": titles.get(v, v)} for v in bottom_ids],
        "top_avg_curve": top_avg,
        "bottom_avg_curve": bottom_avg,
        "insight": _build_insight(top_avg, bottom_avg, is_shorts),
    }


def analyze(video_catalog, analytics):
    retention_curves = analytics.get("retention_curves", {})
    per_video_stats = {r["video"]: r for r in analytics.get("per_video", [])}
    titles = {v["video_id"]: v["title"] for v in video_catalog}
    is_short_by_id = {v["video_id"]: v["is_likely_short"] for v in video_catalog}

    have_curves = [vid for vid in retention_curves if retention_curves[vid]]
    shorts_ranked = sorted(
        (vid for vid in have_curves if is_short_by_id.get(vid)),
        key=lambda vid: per_video_stats.get(vid, {}).get("views", 0), reverse=True,
    )
    longform_ranked = sorted(
        (vid for vid in have_curves if not is_short_by_id.get(vid)),
        key=lambda vid: per_video_stats.get(vid, {}).get("views", 0), reverse=True,
    )

    return {
        "videos_with_curves": len(have_curves),
        "shorts": _compare_cohort(shorts_ranked, titles, retention_curves, is_shorts=True),
        "long_form": _compare_cohort(longform_ranked, titles, retention_curves, is_shorts=False),
        "note": (
            "Compares average retention at fixed elapsed-time checkpoints across the top "
            "and bottom videos (by 90-day views) that have enough views for YouTube to "
            "expose a retention curve -- split by format, since Shorts retention (loop-driven) "
            "and long-form retention (drop-off-driven) aren't comparable."
        ),
    }
