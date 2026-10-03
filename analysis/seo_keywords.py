"""
SEO / keyword-gap analysis.

Compares search terms that are *already* driving real YT_SEARCH views
(ground truth from Analytics) against what's actually present in recent
video titles/tags/descriptions, to surface keywords worth deliberately
targeting that aren't being targeted yet.
"""


def _text_corpus(video):
    return " ".join([
        video["title"],
        video["description"],
        " ".join(video.get("tags", [])),
    ]).lower()


def analyze(video_catalog, analytics):
    recent = video_catalog[:20]
    corpus = " ".join(_text_corpus(v) for v in recent)

    search_terms = analytics.get("top_search_terms", [])
    gaps = []
    already_targeted = []
    for row in search_terms:
        term = row.get("insightTrafficSourceDetail", "")
        views = row.get("views", 0)
        if not term:
            continue
        if term.lower() in corpus:
            already_targeted.append({"term": term, "views": views})
        else:
            gaps.append({"term": term, "views": views})

    return {
        "keyword_gaps": gaps,
        "already_targeted_keywords": already_targeted,
        "note": (
            "keyword_gaps = search queries that already bring real views "
            "(per YouTube Analytics, last 90 days) but do not appear in any "
            "of the 20 most recent videos' title/description/tags -- "
            "candidates to explicitly target in upcoming titles/tags."
        ),
    }
