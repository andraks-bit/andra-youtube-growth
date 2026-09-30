"""
Tracks per-video performance over time by comparing today's 90-day-windowed
view counts (analytics['per_video']) against the oldest available prior daily
snapshot within config.MOMENTUM_LOOKBACK_DAYS.

This compares a rolling 90-day window at two points in time, not true daily
per-video deltas (the Analytics API can't cheaply return day-by-video
granularity for 200+ videos in one run) -- but a video whose 90-day-window
view count is still climbing between two snapshots is demonstrably still
getting fresh views now; one that's flat is not. Documented here and in the
report rather than overclaiming daily-resolution tracking.

No history yet (first run, or nothing within the lookback window) is a
normal, expected state -- reported explicitly rather than silently empty.
"""
import datetime
import json
import os

import config


def _load_snapshot_dates():
    if not os.path.isdir(config.DATA_DIR):
        return []
    dates = []
    for name in os.listdir(config.DATA_DIR):
        path = os.path.join(config.DATA_DIR, name)
        if os.path.isdir(path):
            try:
                datetime.date.fromisoformat(name)
                dates.append(name)
            except ValueError:
                continue
    return sorted(dates)


def analyze(video_catalog, analytics):
    today = datetime.date.today().isoformat()
    cutoff = (datetime.date.today() - datetime.timedelta(days=config.MOMENTUM_LOOKBACK_DAYS)).isoformat()

    candidate_dates = [d for d in _load_snapshot_dates() if cutoff <= d < today]

    if not candidate_dates:
        return {
            "history_days_available": 0,
            "compared_against_date": None,
            "gainers": [],
            "losers": [],
            "note": (
                "No prior daily snapshot within the last "
                f"{config.MOMENTUM_LOOKBACK_DAYS} days yet -- momentum tracking "
                "needs at least one more day of accumulated history. This is "
                "expected on early runs and will start populating automatically."
            ),
        }

    baseline_date = candidate_dates[0]  # oldest available within the window = max signal
    baseline_path = os.path.join(config.DATA_DIR, baseline_date, "analytics.json")
    try:
        with open(baseline_path) as f:
            baseline_analytics = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {
            "history_days_available": 0,
            "compared_against_date": None,
            "gainers": [],
            "losers": [],
            "note": f"Found a snapshot directory for {baseline_date} but couldn't read its analytics.json.",
        }

    baseline_views = {r["video"]: r.get("views", 0) for r in baseline_analytics.get("per_video", [])}
    current_views = {r["video"]: r.get("views", 0) for r in analytics.get("per_video", [])}
    titles = {v["video_id"]: v["title"] for v in video_catalog}

    deltas = []
    for video_id, cur in current_views.items():
        base = baseline_views.get(video_id, 0)
        deltas.append({
            "video_id": video_id,
            "title": titles.get(video_id, video_id),
            "views_90d_then": base,
            "views_90d_now": cur,
            "delta": cur - base,
        })

    deltas.sort(key=lambda d: d["delta"], reverse=True)
    gainers = [d for d in deltas if d["delta"] > 0][:10]
    losers = sorted([d for d in deltas if d["delta"] < 0], key=lambda d: d["delta"])[:10]

    return {
        "history_days_available": len(candidate_dates),
        "compared_against_date": baseline_date,
        "gainers": gainers,
        "losers": losers,
        "note": (
            f"Comparing each video's 90-day-windowed view count now vs on {baseline_date} "
            "-- a video still climbing is getting fresh views; a flat one isn't, "
            "regardless of its lifetime total."
        ),
    }
