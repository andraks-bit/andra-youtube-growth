"""
Aggregates performance per destination (views, retention, momentum, unmet
search demand) into a ranked content-planning priority table -- the
"actual channel performance + search demand" combination requested for
content planning.
"""
import config
import destinations


def analyze(video_catalog, analytics, keyword_discovery=None, momentum=None):
    per_video_stats = {r["video"]: r for r in analytics.get("per_video", [])}
    momentum_delta = {}
    if momentum:
        for d in momentum.get("gainers", []) + momentum.get("losers", []):
            momentum_delta[d["video_id"]] = d["delta"]

    by_dest = {}
    for v in video_catalog:
        key = destinations.classify(v)
        by_dest.setdefault(key, []).append(v)

    gap_counts = {}
    if keyword_discovery:
        for label, gaps in keyword_discovery.get("gaps_by_destination", {}).items():
            gap_counts[label] = len(gaps)

    rows = []
    all_keys = set(by_dest.keys()) | set(config.DESTINATIONS.keys())
    for key in all_keys:
        videos = by_dest.get(key, [])
        label = destinations.label_for(key)
        stats = [per_video_stats.get(v["video_id"], {}) for v in videos]
        views_90d = [s.get("views", 0) for s in stats]
        retentions = [s["averageViewPercentage"] for s in stats if "averageViewPercentage" in s]
        momentum_sum = sum(momentum_delta.get(v["video_id"], 0) for v in videos)

        rows.append({
            "destination": label,
            "video_count": len(videos),
            "avg_views_90d": round(sum(views_90d) / len(views_90d), 1) if views_90d else 0,
            "avg_retention_pct": round(sum(retentions) / len(retentions), 1) if retentions else None,
            "momentum_90d_view_delta": momentum_sum,
            "unmet_demand_keywords": gap_counts.get(label, 0),
        })

    # Simple composite priority score: normalize each signal 0-1 across
    # destinations and weight them equally. Transparent, not black-box ML.
    def norm(values):
        lo, hi = min(values), max(values)
        return [0.5 if hi == lo else (v - lo) / (hi - lo) for v in values]

    avg_views_n = norm([r["avg_views_90d"] for r in rows])
    retention_vals = [r["avg_retention_pct"] or 0 for r in rows]
    retention_n = norm(retention_vals)
    demand_n = norm([r["unmet_demand_keywords"] for r in rows])
    momentum_n = norm([r["momentum_90d_view_delta"] for r in rows])

    for i, r in enumerate(rows):
        r["priority_score"] = round(
            0.3 * avg_views_n[i] + 0.25 * retention_n[i] + 0.25 * demand_n[i] + 0.2 * momentum_n[i], 3
        )

    rows.sort(key=lambda r: r["priority_score"], reverse=True)

    return {
        "destinations": rows,
        "note": (
            "priority_score blends this destination's average 90-day views, average "
            "retention, unmet search-demand keyword count, and view momentum -- each "
            "normalized 0-1 across destinations and weighted equally-ish (30/25/25/20). "
            "Destinations with zero videos today (e.g. newly planned ones) still appear, "
            "scored on demand/momentum signal alone."
        ),
    }
