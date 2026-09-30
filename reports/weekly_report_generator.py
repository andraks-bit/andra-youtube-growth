"""
Rolling 7-day growth summary, regenerated every run so it always reflects
the trailing week rather than being gated to a specific day. Reuses this
run's already-computed momentum/destination/new-video analysis rather than
re-deriving them.
"""
import datetime
import json
import os

import config


def _daily_totals_last_n_days(n=7):
    today = datetime.date.today()
    totals = []
    for i in range(n):
        d = (today - datetime.timedelta(days=i)).isoformat()
        path = os.path.join(config.DATA_DIR, d, "analytics.json")
        if not os.path.exists(path):
            continue
        try:
            with open(path) as f:
                analytics = json.load(f)
        except json.JSONDecodeError:
            continue
        daily_rows = analytics.get("daily", [])
        views = sum(r.get("views", 0) for r in daily_rows)
        minutes = sum(r.get("estimatedMinutesWatched", 0) for r in daily_rows)
        totals.append({"snapshot_date": d, "views_90d_window": views, "minutes_90d_window": minutes})
    return totals


def generate(channel_snapshot, momentum, destination_performance, new_videos, keyword_discovery):
    today = datetime.date.today().isoformat()
    lines = []
    a = lines.append

    a(f"# Weekly Growth Summary -- {config.CHANNEL_TITLE} (as of {today})")
    a("")
    a("**Analysis and recommendations only. Nothing was changed on YouTube.**")
    a("")

    a("## Channel snapshot")
    a(f"- Subscribers: {channel_snapshot['subscriber_count']}")
    a(f"- Lifetime views: {channel_snapshot['view_count']}")
    a("")

    a("## New videos this week")
    if new_videos["new_videos"]:
        for v in new_videos["new_videos"]:
            a(f"- {v['title']} (published {v['published_at'][:10]})")
    else:
        a(f"- None detected. {new_videos['note']}")
    a("")

    a("## Momentum -- gaining views")
    a(momentum["note"])
    if momentum["gainers"]:
        for g in momentum["gainers"][:10]:
            a(f"- {g['title']}: +{g['delta']} views (90d window) since {momentum['compared_against_date']}")
    else:
        a("- None yet.")
    a("")

    a("## Momentum -- losing steam")
    if momentum["losers"]:
        for l in momentum["losers"][:10]:
            a(f"- {l['title']}: {l['delta']} views (90d window) since {momentum['compared_against_date']}")
    else:
        a("- None flagged.")
    a("")

    a("## Destination priority this week")
    a(destination_performance["note"])
    for d in destination_performance["destinations"][:8]:
        ret = f"{d['avg_retention_pct']:.1f}%" if d["avg_retention_pct"] is not None else "n/a"
        a(
            f"- **{d['destination']}** (score {d['priority_score']}): "
            f"{d['video_count']} videos, avg {d['avg_views_90d']} views/90d, "
            f"retention {ret}, "
            f"{d['unmet_demand_keywords']} unmet keyword(s), "
            f"momentum {'+' if d['momentum_90d_view_delta'] >= 0 else ''}{d['momentum_90d_view_delta']}"
        )
    a("")

    a("## Priority actions this week")
    actions = []
    top_dest = destination_performance["destinations"][0] if destination_performance["destinations"] else None
    if top_dest:
        actions.append(f"Highest-priority destination right now: **{top_dest['destination']}** -- "
                        f"see its SEO package in the daily report.")
    if momentum["losers"]:
        actions.append(f"Revisit metadata for: {momentum['losers'][0]['title']} -- losing view momentum.")
    total_gap_keywords = sum(len(v) for v in keyword_discovery.get("gaps_by_destination", {}).values())
    if total_gap_keywords:
        actions.append(f"{total_gap_keywords} proven search-demand keyword(s) across destinations "
                        f"aren't in any video yet -- see 'SEO keyword gaps' in the daily report.")
    if actions:
        for i, action in enumerate(actions, 1):
            a(f"{i}. {action}")
    else:
        a("- Nothing flagged this week.")
    a("")

    a("## Trailing-week view trend (90-day windowed totals, per snapshot)")
    totals = _daily_totals_last_n_days(7)
    if totals:
        for t in totals:
            a(f"- {t['snapshot_date']}: {t['views_90d_window']} views, {t['minutes_90d_window']} min watched")
    else:
        a("- Not enough daily snapshots yet.")
    a("")

    return "\n".join(lines)
