"""
Rolling 7-day growth summary, regenerated every run so it always reflects
the trailing week. Week-over-week views/watch-time come from the real
per-calendar-day rows already collected this run (analytics['daily']) --
no extra API calls. Traffic-source week-over-week comes from
traffic_source_trend_collector's two dedicated 7-day queries (real data,
not a 90-day-window approximation).

Explicit: impressions and click-through rate are NOT included anywhere in
this report because the public YouTube Analytics API does not expose them
to creators (confirmed in Step 1/2 -- Studio-only).
"""
import datetime

import config


def _week_over_week(daily_rows):
    today = datetime.date.today()
    this_week_start = today - datetime.timedelta(days=6)
    last_week_start = today - datetime.timedelta(days=13)
    last_week_end = today - datetime.timedelta(days=7)

    this_week = {"views": 0, "minutes": 0}
    last_week = {"views": 0, "minutes": 0}
    for row in daily_rows:
        try:
            d = datetime.date.fromisoformat(row["day"])
        except (KeyError, ValueError):
            continue
        if this_week_start <= d <= today:
            this_week["views"] += row.get("views", 0)
            this_week["minutes"] += row.get("estimatedMinutesWatched", 0)
        elif last_week_start <= d <= last_week_end:
            last_week["views"] += row.get("views", 0)
            last_week["minutes"] += row.get("estimatedMinutesWatched", 0)
    return this_week, last_week


def _pct_change(now, then):
    if then == 0:
        return None
    return round((now - then) / then * 100, 1)


def generate(channel_snapshot, momentum, destination_performance, new_videos, keyword_discovery,
             analytics=None, traffic_source_trend=None):
    today = datetime.date.today().isoformat()
    lines = []
    a = lines.append

    a(f"# Weekly Growth Summary -- {config.CHANNEL_TITLE} (as of {today})")
    a("")
    a("**Analysis and recommendations only. Nothing was changed on YouTube.**")
    a("")
    a("Note: impressions and click-through rate are not included below -- the public "
      "YouTube Analytics API does not expose them to creators (Studio-only).")
    a("")

    a("## Channel snapshot")
    a(f"- Subscribers: {channel_snapshot['subscriber_count']}")
    a(f"- Lifetime views: {channel_snapshot['view_count']}")
    a("")

    if analytics is not None:
        this_week, last_week = _week_over_week(analytics.get("daily", []))
        a("## This week vs. last week")
        views_pct = _pct_change(this_week["views"], last_week["views"])
        minutes_pct = _pct_change(this_week["minutes"], last_week["minutes"])
        a(f"- Views: {this_week['views']} vs {last_week['views']} "
          f"({'n/a' if views_pct is None else f'{views_pct:+.1f}%'})")
        a(f"- Watch time: {this_week['minutes']} min vs {last_week['minutes']} min "
          f"({'n/a' if minutes_pct is None else f'{minutes_pct:+.1f}%'})")
        daily_rows = analytics.get("daily", [])
        subs_gained_week = sum(r.get("subscribersGained", 0) for r in daily_rows
                                if _in_last_n_days(r.get("day"), 7))
        subs_lost_week = sum(r.get("subscribersLost", 0) for r in daily_rows
                              if _in_last_n_days(r.get("day"), 7))
        a(f"- Subscribers this week: +{subs_gained_week} / -{subs_lost_week}")
        a("")

    if traffic_source_trend is not None:
        a("## Traffic sources: this week vs. last week")
        this_sources = traffic_source_trend["this_week"]["by_source"]
        last_sources = traffic_source_trend["last_week"]["by_source"]
        all_sources = sorted(set(this_sources) | set(last_sources), key=lambda s: -this_sources.get(s, 0))
        for s in all_sources[:8]:
            now_v, then_v = this_sources.get(s, 0), last_sources.get(s, 0)
            pct = _pct_change(now_v, then_v)
            a(f"- {s}: {now_v} vs {then_v} ({'n/a' if pct is None else f'{pct:+.1f}%'})")
        a("")
        search_now = this_sources.get("YT_SEARCH", 0)
        suggested_now = this_sources.get("RELATED_VIDEO", 0)
        browse_now = this_sources.get("BROWSE_FEATURES", 0)
        a(f"- Search traffic this week: {search_now} | Suggested: {suggested_now} | Browse: {browse_now}")
        a("")

    a("## New videos this week")
    if new_videos["new_videos"]:
        for v in new_videos["new_videos"]:
            a(f"- {v['title']} (published {v['published_at'][:10]})")
    else:
        a(f"- None detected. {new_videos['note']}")
    a("")

    a("## Top gaining videos")
    a(momentum["note"])
    if momentum["gainers"]:
        for g in momentum["gainers"][:10]:
            a(f"- {g['title']}: +{g['delta']} views (90d window) since {momentum['compared_against_date']}")
    else:
        a("- None yet.")
    a("")

    a("## Declining videos")
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

    a("## Keyword opportunities")
    total_gap_keywords = sum(len(v) for v in keyword_discovery.get("gaps_by_destination", {}).values())
    total_gap_keywords += len(keyword_discovery.get("unmatched_gap_terms", []))
    a(f"- {total_gap_keywords} proven search-demand keyword(s) across destinations aren't in any video yet.")
    a("")

    a("## Priority actions this week")
    actions = []
    top_dest = destination_performance["destinations"][0] if destination_performance["destinations"] else None
    if top_dest:
        actions.append(f"Highest-priority destination right now: **{top_dest['destination']}** -- "
                        f"see its SEO package in the daily report.")
    if momentum["losers"]:
        actions.append(f"Revisit metadata for: {momentum['losers'][0]['title']} -- losing view momentum.")
    if total_gap_keywords:
        actions.append(f"{total_gap_keywords} proven search-demand keyword(s) across destinations "
                        f"aren't in any video yet -- see 'SEO keyword gaps' in the daily report.")
    if actions:
        for i, action in enumerate(actions, 1):
            a(f"{i}. {action}")
    else:
        a("- Nothing flagged this week.")
    a("")

    return "\n".join(lines)


def _in_last_n_days(day_str, n):
    if not day_str:
        return False
    try:
        d = datetime.date.fromisoformat(day_str)
    except ValueError:
        return False
    return (datetime.date.today() - d).days < n
