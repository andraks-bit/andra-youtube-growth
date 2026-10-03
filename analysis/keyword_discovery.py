"""
SEO keyword discovery and keyword-gap analysis, per video and per destination.

Two distinct signal types, kept clearly separate:
  1. Real demand: search terms actually driving YT_SEARCH views (from
     YouTube Analytics -- ground truth, same source as analysis/seo_keywords.py)
     that aren't yet present in that destination's video titles/tags/descriptions.
  2. Template expansion: common high-intent travel-vlog query *patterns*
     (config.KEYWORD_INTENT_TEMPLATES) applied per destination and checked
     against the channel's existing text. This is NOT real search-volume
     data -- no keyword-research API is authorized for this project (see
     Step 1 audit) -- it's a transparent, editable template list standing
     in for keyword research until/unless a real tool is connected.
"""
import config
import destinations


def _corpus_for(video):
    return " ".join([
        video.get("title", ""),
        video.get("description", ""),
        " ".join(video.get("tags", [])),
    ]).lower()


def analyze(video_catalog, analytics):
    channel_corpus = " ".join(_corpus_for(v) for v in video_catalog)

    by_destination_videos = {}
    for v in video_catalog:
        dest = destinations.classify(v)
        by_destination_videos.setdefault(dest, []).append(v)

    # 1. Real demand gaps, grouped by which destination the search term matches.
    gaps_by_destination = {}
    unmatched_gap_terms = []
    for row in analytics.get("top_search_terms", []):
        term = row.get("insightTrafficSourceDetail", "")
        views = row.get("views", 0)
        if not term:
            continue
        dest_key = destinations.classify_text(term)
        corpus = channel_corpus if dest_key is None else _corpus_for_dest(by_destination_videos.get(dest_key, []))
        if term.lower() in corpus:
            continue  # already targeted somewhere relevant
        entry = {"term": term, "views": views}
        if dest_key:
            gaps_by_destination.setdefault(dest_key, []).append(entry)
        else:
            unmatched_gap_terms.append(entry)

    # 2. Template-expansion opportunities per known destination (present or future).
    template_opportunities = {}
    for dest_key, dest in config.DESTINATIONS.items():
        dest_videos = by_destination_videos.get(dest_key, [])
        dest_corpus = _corpus_for_dest(dest_videos)
        label = dest["label"]
        candidates = []
        for template in config.KEYWORD_INTENT_TEMPLATES:
            candidate = template.format(dest=label)
            if candidate.lower() not in dest_corpus and candidate.lower() not in channel_corpus:
                candidates.append(candidate)
        template_opportunities[dest_key] = candidates

    # 3. Per-video gaps: videos missing proven-demand terms relevant to their own destination.
    per_video_gaps = []
    for v in video_catalog:
        dest_key = destinations.classify(v)
        relevant_gaps = gaps_by_destination.get(dest_key, [])
        if not relevant_gaps:
            continue
        video_corpus = _corpus_for(v)
        missing = [g["term"] for g in relevant_gaps if g["term"].lower() not in video_corpus]
        if missing:
            per_video_gaps.append({
                "video_id": v["video_id"],
                "title": v["title"],
                "destination": destinations.label_for(dest_key),
                "missing_terms": missing[:5],
            })

    return {
        "gaps_by_destination": {
            destinations.label_for(k): v for k, v in gaps_by_destination.items()
        },
        "unmatched_gap_terms": unmatched_gap_terms,
        "template_opportunities_by_destination": {
            config.DESTINATIONS[k]["label"]: v for k, v in template_opportunities.items() if v
        },
        "per_video_gaps": per_video_gaps[:20],
        "note": (
            "gaps_by_destination = real search terms already driving views (YouTube "
            "Analytics, last 90 days) not yet present in that destination's video text. "
            "template_opportunities_by_destination = generic high-intent query patterns "
            "(config.KEYWORD_INTENT_TEMPLATES), NOT real search-volume data -- there is no "
            "keyword-research API authorized for this project."
        ),
    }


def _corpus_for_dest(videos):
    return " ".join(_corpus_for(v) for v in videos)
