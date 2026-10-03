"""
Synthesizes every Step 5 analysis module into the single highest-signal
list: the TRAFFIC_ACTIONS_COUNT most impactful, specific actions for today.

Ranking is a transparent heuristic (real numbers behind each candidate
action, scaled to be roughly comparable), not a predictive/ROI model -- said
explicitly in the note. One action per category is taken first so the top 5
aren't dominated by a single signal type, then remaining slots fill from
whatever scores highest.
"""
import config


def _candidates(traffic_growth, search_seo, momentum, suggested_video_strategy, content_opportunity):
    candidates = []

    for v in traffic_growth.get("priority_videos", []):
        flags = v["ctr_proxy_flags"] + ([v["retention_problem"]] if v["retention_problem"] else [])
        if not flags:
            continue
        candidates.append({
            "category": "fix_existing_video",
            "text": f"Update the title/thumbnail for \"{v['title'][:60]}\" -- {flags[0]} "
                    f"({v['views_90d']} views in the last 90 days)",
            "score": v["views_90d"],
        })

    proven_gaps = [k for k in search_seo.get("prioritized_keywords", []) if k["tier"] == "proven_demand_gap"]
    for kw in proven_gaps[:3]:
        dest_part = f" in a {kw['destination']} video" if kw["destination"] else ""
        candidates.append({
            "category": "target_keyword_gap",
            "text": f"Add \"{kw['keyword']}\"{dest_part}'s title/tags -- already driving "
                    f"{kw['views']} real search views without being targeted",
            "score": kw["views"] * 15,
        })

    for l in momentum.get("losers", [])[:2]:
        candidates.append({
            "category": "address_declining_video",
            "text": f"Revisit \"{l['title'][:60]}\" -- losing view momentum "
                    f"({l['delta']:+d} views, 90d window, since {momentum['compared_against_date']})",
            "score": abs(l["delta"]) * 20,
        })

    playlist_cluster = next(
        (c for c in suggested_video_strategy.get("clusters", []) if c["playlist_suggestion"]), None
    )
    if playlist_cluster:
        candidates.append({
            "category": "internal_linking",
            "text": f"Create a \"{playlist_cluster['playlist_suggestion']}\" playlist and cross-link "
                    f"the {playlist_cluster['video_count']} videos in that cluster "
                    f"(end-screen/cards to \"{playlist_cluster['hub_video']['title'][:40]}\")",
            "score": 50,
        })

    top_idea = next(iter(content_opportunity.get("next_video_ideas", [])), None)
    if top_idea:
        candidates.append({
            "category": "next_video",
            "text": f"Plan your next {top_idea['destination']} video targeting "
                    f"\"{top_idea['target_keyword'] or top_idea['destination']}\" -- {top_idea['rationale']}",
            "score": top_idea["priority_score"] * 100,
        })

    return candidates


def analyze(traffic_growth, search_seo, momentum, suggested_video_strategy, content_opportunity):
    candidates = _candidates(traffic_growth, search_seo, momentum, suggested_video_strategy, content_opportunity)

    by_category = {}
    for c in candidates:
        by_category.setdefault(c["category"], []).append(c)
    for cat in by_category:
        by_category[cat].sort(key=lambda c: c["score"], reverse=True)

    # Round 1: best from each category, by category's own best score, so the
    # top slots aren't dominated by one signal type.
    picked = []
    remaining = []
    category_order = sorted(by_category, key=lambda cat: by_category[cat][0]["score"], reverse=True)
    for cat in category_order:
        picked.append(by_category[cat][0])
        remaining.extend(by_category[cat][1:])

    remaining.sort(key=lambda c: c["score"], reverse=True)
    actions = (picked + remaining)[:config.TRAFFIC_ACTIONS_COUNT]

    return {
        "actions": [{"rank": i + 1, "category": a["category"], "action": a["text"]} for i, a in enumerate(actions)],
        "note": (
            "Ranked by a transparent heuristic built from real numbers behind each candidate "
            "(views, search-gap views, momentum delta) -- not a predictive ROI model. One action "
            "per category is surfaced first so this isn't dominated by a single signal type."
        ),
    }
