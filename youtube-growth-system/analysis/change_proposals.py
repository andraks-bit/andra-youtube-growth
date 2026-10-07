"""
Turns Step 4/5 recommendations into concrete, write-able change proposals
for the Step 6 approval workflow. Each proposal bundles everything for one
video (title + description + tags together, one human decision) or one
playlist -- not one issue per field.

Pure local synthesis, no API calls. Dedup against already-proposed video_ids
/ playlist_titles is the caller's job (approval_workflow.py), since that
requires the persisted state file.
"""
import hashlib
import datetime


def _stable_id(*parts):
    raw = "|".join(str(p) for p in parts)
    return hashlib.sha1(raw.encode()).hexdigest()[:10]


def from_metadata_rewrites(metadata_rewrites, exclude_video_ids):
    candidates = []
    for r in metadata_rewrites.get("rewrites", []):
        if r["video_id"] in exclude_video_ids:
            continue
        candidates.append({
            "proposal_id": _stable_id("metadata_update", r["video_id"]),
            "type": "metadata_update",
            "video_id": r["video_id"],
            "current_title": r["current_title"],
            "proposed_title": r["suggested_titles"][0],
            "proposed_description": r["suggested_description"],
            "proposed_tags": r["suggested_tags"],
            "reasoning": "; ".join(r["reasons_flagged"]),
            "destination": r["destination"],
        })
    return candidates


def from_suggested_video_strategy(suggested_video_strategy, exclude_playlist_titles):
    candidates = []
    for c in suggested_video_strategy.get("clusters", []):
        title = c.get("playlist_suggestion")
        if not title or title in exclude_playlist_titles:
            continue
        video_ids = [c["hub_video"]["video_id"]] + [
            p["from_video_id"] for p in c["recommended_pairs"]
            if p["from_video_id"] != c["hub_video"]["video_id"]
        ]
        video_ids = list(dict.fromkeys(video_ids))
        candidates.append({
            "proposal_id": _stable_id("playlist", title),
            "type": "playlist",
            "playlist_title": title,
            "video_ids": video_ids,
            "destination": c["destination"],
            "reasoning": f"{c['video_count']} videos in the {c['destination']} cluster have no playlist yet",
        })
    return candidates


def build(metadata_rewrites, suggested_video_strategy, exclude_video_ids, exclude_playlist_titles, max_count):
    candidates = (
        from_metadata_rewrites(metadata_rewrites, exclude_video_ids)
        + from_suggested_video_strategy(suggested_video_strategy, exclude_playlist_titles)
    )
    today = datetime.date.today().isoformat()
    for c in candidates:
        c["proposed_on"] = today
    return candidates[:max_count]
