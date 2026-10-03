"""
Generates concrete replacement title/description/tag suggestions for videos
already flagged by analysis/optimization_opportunities.py.

Template-based, not LLM-generated -- deterministic and explainable using the
channel's own proven keywords (from content_planning's recurring top words)
and real keyword gaps (from keyword_discovery), rather than a black box.
Nothing here writes to YouTube; this only produces text for the report.
"""
import destinations
from text_utils import to_hashtag, dedupe_ci, thumbnail_text_ideas, GENERIC_CHAPTER_TEMPLATE, clean_tag_parts

_TITLE_TEMPLATES = [
    "{dest} Travel Vlog {extra}",
    "{dest}: {top_word} {extra}",
    "Exploring {dest} -- {extra}",
]

MAX_REWRITES = 12


def _pick_top_word(recurring_words, exclude_words):
    for word, _count in recurring_words:
        if word.lower() not in exclude_words:
            return word.capitalize()
    return "Travel Guide"


def analyze(video_catalog, optimization, keyword_discovery, content_planning):
    by_id = {v["video_id"]: v for v in video_catalog}
    gaps_by_video = {g["video_id"]: g["missing_terms"] for g in keyword_discovery.get("per_video_gaps", [])}
    recurring_words = content_planning.get("recurring_words_in_top_performers", [])

    # Never touch a video that's already a top performer, even if it trips a
    # technical flag (e.g. short description) -- "preserve what's working".
    top_performer_ids = {
        v["video_id"] for v in content_planning.get("top_performing_recent_videos", [])
    }
    preserved = []

    # Rotate through each destination's gap keywords across its flagged videos
    # instead of repeating the same one on every video for that destination.
    used_terms_by_dest = {}

    rewrites = []
    for opp in optimization.get("opportunities", [])[:MAX_REWRITES]:
        if opp["video_id"] in top_performer_ids:
            preserved.append({"video_id": opp["video_id"], "title": opp["title"]})
            continue
        video = by_id.get(opp["video_id"])
        if not video:
            continue
        dest_key = destinations.classify(video)
        dest_label = destinations.label_for(dest_key)
        gap_terms = gaps_by_video.get(opp["video_id"], [])
        used = used_terms_by_dest.setdefault(dest_label, set())
        extra = next((t for t in gap_terms if t not in used), None) or (gap_terms[0] if gap_terms else "2026")
        used.add(extra)

        exclude = {w.lower() for w in dest_label.split()}
        top_word = _pick_top_word(recurring_words, exclude)

        title_options = [
            t.format(dest=dest_label, top_word=top_word, extra=extra)
            for t in _TITLE_TEMPLATES
        ]

        tag_pool = clean_tag_parts(dest_label) + gap_terms[:4] + [w for w, _ in recurring_words[:6]]
        tags = dedupe_ci(tag_pool)[:12]

        hashtags = dedupe_ci([
            to_hashtag(dest_label.split("/")[0].strip()),
            *[to_hashtag(t) for t in gap_terms[:3]],
            "#travelvlog",
        ])
        hashtags = [h for h in hashtags if h]

        description_lines = [
            f"{dest_label} {('-- ' + extra) if extra else ''}".strip(),
            "",
            video.get("description", "")[:200] or "(original description was empty -- add 2-3 sentences here.)",
            "",
            "Follow for more travel vlogs.",
            " ".join(hashtags),
        ]

        dest_short = dest_label.split("/")[0].strip()
        secondary_keywords = [t for t in gap_terms if t != extra][:4] or [w for w, _ in recurring_words[:3]]

        rewrites.append({
            "video_id": opp["video_id"],
            "current_title": opp["title"],
            "destination": dest_label,
            "reasons_flagged": opp["reasons"],
            "target_keyword": extra,
            "secondary_keywords": secondary_keywords,
            "suggested_titles": title_options,
            "suggested_description": "\n".join(description_lines),
            "suggested_tags": tags,
            "suggested_hashtags": hashtags,
            "chapters_template": GENERIC_CHAPTER_TEMPLATE,
            "thumbnail_text_ideas": thumbnail_text_ideas(dest_short),
        })

    return {
        "rewrites": rewrites,
        "preserved_top_performers": preserved,
        "note": (
            "Template-based suggestions built from this channel's own proven "
            "keywords and real search-term gaps -- not LLM-generated copy. "
            "Nothing was changed on YouTube; review and edit before using. "
            "preserved_top_performers lists videos that tripped a technical flag "
            "but were deliberately left out because they're already top performers "
            "-- 'never change a strong-performing video blindly'."
        ),
    }
