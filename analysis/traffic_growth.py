"""
Per-priority-video traffic-opportunity assessment.

IMPORTANT data-honesty note: YouTube's public Analytics API does not expose
thumbnail impressions or click-through rate (confirmed via a live 400 in
Step 2 -- "Unknown identifier (impressions)", Studio-only). Nothing in this
module computes, estimates, or fabricates an impressions or CTR number.
Where the requirements ask for CTR/impression signals, this uses two
real-data-only proxies instead, both built purely from views + retention
(both genuinely measured):

  - "high reach, low retention": the video gets above-average views but
    below-average retention -- consistent with a title/thumbnail that gets
    clicks but over-promises relative to the content (a classic CTR-adjacent
    pattern), WITHOUT claiming to have measured a click-through rate.
  - "low reach, high retention": below-average views but above-average
    retention -- consistent with solid content that isn't getting
    discovered/clicked enough, again without claiming a CTR number.

"Impression growth opportunity" similarly uses real view-momentum (Step 4's
momentum_tracker), not fabricated impression counts.
"""
import destinations

HIGH_RETENTION_LOW_REACH_RETENTION_MULT = 1.2
HIGH_RETENTION_LOW_REACH_VIEWS_MULT = 0.5
LOW_RETENTION_HIGH_REACH_RETENTION_MULT = 0.8
# A floor on 90-day-window views before trusting either CTR-proxy comparison:
# without it, an old video with ~0 fresh views in the window trivially looks
# "low reach" (and its retention % may be a near-meaningless tiny sample)
# regardless of whether there's a genuine discoverability problem.
MIN_VIEWS_FOR_CTR_PROXY = 5


def analyze(video_catalog, analytics, video_traffic, keyword_discovery, optimization, momentum):
    per_video_stats = {r["video"]: r for r in analytics.get("per_video", [])}
    gaps_by_video = {g["video_id"]: g for g in keyword_discovery.get("per_video_gaps", [])}
    momentum_by_video = {
        d["video_id"]: d for d in momentum.get("gainers", []) + momentum.get("losers", [])
    }
    titles = {v["video_id"]: v for v in video_catalog}

    avg_retention = optimization.get("channel_avg_retention_pct_90d")
    views_list = [s.get("views", 0) for s in per_video_stats.values()]
    avg_views = sum(views_list) / len(views_list) if views_list else 0

    # Channel-wide traffic-source share, as a baseline to compare each video's mix against.
    channel_sources = {r["insightTrafficSourceType"]: r["views"] for r in analytics.get("traffic_sources", [])}
    channel_total = sum(channel_sources.values()) or 1
    channel_share = {k: v / channel_total for k, v in channel_sources.items()}

    results = []
    for video_id, rows in video_traffic.get("by_video", {}).items():
        video = titles.get(video_id)
        if not video:
            continue
        stats = per_video_stats.get(video_id, {})
        views_90d = stats.get("views", 0)
        retention = stats.get("averageViewPercentage")

        video_total = sum(r["views"] for r in rows) or 1
        video_share = {r["insightTrafficSourceType"]: r["views"] / video_total for r in rows}

        source_opportunities = []
        for source_key, label in (
            ("YT_SEARCH", "YouTube Search"),
            ("RELATED_VIDEO", "Suggested videos"),
            ("BROWSE_FEATURES", "Browse/Home feed"),
        ):
            this_share = video_share.get(source_key, 0.0)
            baseline = channel_share.get(source_key, 0.0)
            if baseline > 0 and this_share < baseline * 0.5:
                source_opportunities.append(
                    f"{label} share ({this_share*100:.0f}%) is well below this channel's "
                    f"average ({baseline*100:.0f}%) -- real opportunity to close this gap"
                )
            elif baseline == 0 and source_key not in video_share:
                pass  # no channel baseline at all for this source type; nothing to compare

        keyword_gap = gaps_by_video.get(video_id)
        search_keyword_opportunities = keyword_gap["missing_terms"] if keyword_gap else []

        ctr_proxy_flags = []
        if avg_retention is not None and retention is not None and views_90d >= MIN_VIEWS_FOR_CTR_PROXY:
            if views_90d > avg_views and retention < avg_retention * LOW_RETENTION_HIGH_REACH_RETENTION_MULT:
                ctr_proxy_flags.append(
                    "high reach / low retention -- proxy for a title or thumbnail that earns "
                    "clicks but the content under-delivers on the promise (not a real CTR "
                    "measurement -- that data isn't exposed by the API)"
                )
            elif (views_90d < avg_views * HIGH_RETENTION_LOW_REACH_VIEWS_MULT
                    and retention > avg_retention * HIGH_RETENTION_LOW_REACH_RETENTION_MULT):
                ctr_proxy_flags.append(
                    "low reach / high retention -- proxy for solid content that isn't getting "
                    "discovered or clicked enough; consider a stronger title/thumbnail (not a "
                    "real CTR measurement -- that data isn't exposed by the API)"
                )

        retention_problem = None
        if avg_retention is not None and retention is not None and retention < avg_retention * 0.7:
            retention_problem = f"retention {retention:.1f}% vs channel average {avg_retention:.1f}%"

        view_momentum = momentum_by_video.get(video_id)
        impression_growth_note = None
        if view_momentum:
            direction = "gaining" if view_momentum["delta"] > 0 else "losing"
            impression_growth_note = (
                f"view momentum: {direction} ({view_momentum['delta']:+d} views, 90d window) "
                "-- real view-count trend, not an impressions metric (not exposed by the API)"
            )

        if not any([source_opportunities, search_keyword_opportunities, ctr_proxy_flags,
                    retention_problem, impression_growth_note]):
            continue

        results.append({
            "video_id": video_id,
            "title": video["title"],
            "destination": destinations.label_for(destinations.classify(video)),
            "views_90d": views_90d,
            "retention_pct": retention,
            "traffic_source_opportunities": source_opportunities,
            "search_keyword_opportunities": search_keyword_opportunities,
            "ctr_proxy_flags": ctr_proxy_flags,
            "retention_problem": retention_problem,
            "view_momentum_note": impression_growth_note,
        })

    results.sort(key=lambda r: r["views_90d"], reverse=True)

    return {
        "priority_videos": results,
        "note": (
            "Per-video traffic opportunities for the top-viewed videos with a real per-video "
            "traffic-source breakdown this run. 'ctr_proxy_flags' and the view-momentum note are "
            "explicitly NOT real impressions/CTR data -- the public API doesn't expose that; "
            "they're proxies built from real views + retention only. Retention above 100% on "
            "short clips is real (Shorts get rewatched/looped), not an error. CTR-proxy flags "
            f"only apply above {MIN_VIEWS_FOR_CTR_PROXY} views (90d window) to avoid noise on "
            "videos with near-zero fresh views."
        ),
    }
