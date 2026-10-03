"""
"What should I film next" -- synthesizes destination_performance (actual
channel performance + unmet search demand) and search_seo (prioritized
keywords) into ranked, specific next-video ideas with a one-line rationale
naming the real numbers behind each one.
"""
import config

MAX_IDEAS = 8


def analyze(destination_performance, search_seo):
    keywords_by_dest = {}
    for kw in search_seo.get("prioritized_keywords", []):
        if kw["destination"]:
            keywords_by_dest.setdefault(kw["destination"], []).append(kw["keyword"])

    ideas = []
    for d in destination_performance.get("destinations", []):
        if d["destination"] == config.UNCLASSIFIED_LABEL:
            continue
        target_keyword = next(iter(keywords_by_dest.get(d["destination"], [])), None)
        is_new = d["video_count"] == 0

        rationale_parts = []
        if is_new:
            rationale_parts.append("not yet covered on the channel")
        else:
            rationale_parts.append(f"{d['video_count']} existing videos, avg {d['avg_views_90d']} views/90d")
        if d["avg_retention_pct"] is not None:
            rationale_parts.append(f"{d['avg_retention_pct']:.1f}% retention")
        if d["unmet_demand_keywords"]:
            rationale_parts.append(f"{d['unmet_demand_keywords']} proven search gap(s)")
        if d["momentum_90d_view_delta"]:
            rationale_parts.append(f"momentum {d['momentum_90d_view_delta']:+d}")

        ideas.append({
            "destination": d["destination"],
            "is_new_destination": is_new,
            "priority_score": d["priority_score"],
            "target_keyword": target_keyword,
            "rationale": "; ".join(rationale_parts),
        })

    ideas.sort(key=lambda i: i["priority_score"], reverse=True)

    return {
        "next_video_ideas": ideas[:MAX_IDEAS],
        "note": (
            "Ranked by destination_performance's priority_score (real views + retention + "
            "momentum, blended with unmet search-demand count). Each rationale names the "
            "actual numbers behind the ranking -- not a generic suggestion."
        ),
    }
