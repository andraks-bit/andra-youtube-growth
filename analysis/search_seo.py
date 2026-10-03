"""
YouTube Search SEO: extends Step 4's keyword_discovery with long-tail
templates, a real within-channel "rising search terms" signal (derived from
comparing this channel's own historical Analytics snapshots -- not an
external trends source), and a single list prioritized by realistic traffic
opportunity rather than raw keyword count.

Explicitly NOT provided, because the data doesn't exist for this project:
  - "near-ranking keywords": would require YouTube Search ranking-position
    data, which no API exposes to creators (nothing analogous to Search
    Console for YouTube). Omitted rather than guessed.
  - External/platform-wide "trending" topics: no Trends API is authorized
    for this project (see Step 1 audit). The "trending" signal here is
    strictly this channel's own search-term view-share rising over time.
"""
import datetime
import json
import os

import config
import destinations

NEAR_RANKING_NOTE = (
    "Not available: YouTube exposes no search-ranking-position data to creators via any API "
    "(nothing analogous to Search Console for YouTube) -- omitted rather than estimated."
)
TRENDING_NOTE = (
    "Not available from an external trends source (no Trends API authorized for this project). "
    "'rising_search_terms' below is a real substitute: this channel's own search terms whose "
    "view contribution increased between two of this channel's own Analytics snapshots."
)


def _historical_search_terms(lookback_days=14):
    today = datetime.date.today().isoformat()
    cutoff = (datetime.date.today() - datetime.timedelta(days=lookback_days)).isoformat()
    if not os.path.isdir(config.DATA_DIR):
        return None, {}
    dates = []
    for name in os.listdir(config.DATA_DIR):
        if cutoff <= name < today and os.path.isdir(os.path.join(config.DATA_DIR, name)):
            try:
                datetime.date.fromisoformat(name)
                dates.append(name)
            except ValueError:
                continue
    if not dates:
        return None, {}
    baseline_date = sorted(dates)[0]
    path = os.path.join(config.DATA_DIR, baseline_date, "analytics.json")
    try:
        with open(path) as f:
            baseline = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return None, {}
    terms = {r["insightTrafficSourceDetail"]: r["views"] for r in baseline.get("top_search_terms", [])}
    return baseline_date, terms


def analyze(video_catalog, analytics, keyword_discovery):
    channel_corpus = " ".join(
        " ".join([v.get("title", ""), v.get("description", ""), " ".join(v.get("tags", []))]).lower()
        for v in video_catalog
    )

    by_destination_videos = {}
    for v in video_catalog:
        by_destination_videos.setdefault(destinations.classify(v), []).append(v)

    # Long-tail template expansion, same methodology as keyword_discovery's
    # template_opportunities_by_destination but with longer, more specific phrasing.
    longtail_by_destination = {}
    for dest_key, dest in config.DESTINATIONS.items():
        label = dest["label"]
        dest_videos = by_destination_videos.get(dest_key, [])
        dest_corpus = " ".join(
            " ".join([v.get("title", ""), v.get("description", ""), " ".join(v.get("tags", []))]).lower()
            for v in dest_videos
        )
        candidates = []
        for template in config.LONGTAIL_KEYWORD_TEMPLATES:
            candidate = template.format(dest=label)
            if candidate.lower() not in dest_corpus and candidate.lower() not in channel_corpus:
                candidates.append(candidate)
        if candidates:
            longtail_by_destination[label] = candidates

    # Rising search terms: real, from this channel's own Analytics history.
    baseline_date, baseline_terms = _historical_search_terms()
    rising = []
    if baseline_date:
        for row in analytics.get("top_search_terms", []):
            term = row.get("insightTrafficSourceDetail", "")
            now_views = row.get("views", 0)
            then_views = baseline_terms.get(term, 0)
            if now_views - then_views >= 2:  # small absolute floor to avoid noise on tiny counts
                rising.append({"term": term, "views_then": then_views, "views_now": now_views,
                                "delta": now_views - then_views})
        rising.sort(key=lambda r: r["delta"], reverse=True)

    # Single prioritized list: proven-demand gaps first (ranked by real views),
    # then rising terms, then unproven template ideas last -- "realistic traffic
    # opportunity" ordering rather than alphabetical/raw-count.
    prioritized = []
    for dest_label, gaps in keyword_discovery.get("gaps_by_destination", {}).items():
        for g in gaps:
            prioritized.append({
                "keyword": g["term"], "destination": dest_label, "views": g["views"],
                "tier": "proven_demand_gap",
            })
    for g in keyword_discovery.get("unmatched_gap_terms", []):
        prioritized.append({
            "keyword": g["term"], "destination": None, "views": g["views"],
            "tier": "proven_demand_gap",
        })
    for r in rising:
        prioritized.append({
            "keyword": r["term"], "destination": None, "views": r["delta"],
            "tier": "rising",
        })
    for dest_label, candidates in longtail_by_destination.items():
        for c in candidates[:3]:
            prioritized.append({
                "keyword": c, "destination": dest_label, "views": 0,
                "tier": "template_longtail",
            })
    tier_rank = {"proven_demand_gap": 0, "rising": 1, "template_longtail": 2}
    prioritized.sort(key=lambda p: (tier_rank.get(p["tier"], 3), -p["views"]))

    return {
        "longtail_opportunities_by_destination": longtail_by_destination,
        "rising_search_terms": rising,
        "rising_compared_against_date": baseline_date,
        "prioritized_keywords": prioritized[:25],
        "near_ranking_keywords_note": NEAR_RANKING_NOTE,
        "trending_opportunities_note": TRENDING_NOTE,
        "note": (
            "prioritized_keywords ranks proven-demand gaps (real search terms already driving "
            "views that aren't targeted yet) above rising terms, above template/long-tail ideas "
            "-- realistic opportunity first, not raw keyword count. Long-tail entries are "
            "template-based, not real search-volume data."
        ),
    }
