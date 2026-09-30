"""
Detects videos published since the last run by diffing today's catalog
against the most recent prior daily snapshot -- this is what makes "analyze
new uploads without starting Claude manually" actually true: the scheduled
run itself notices and flags anything new.
"""
import datetime
import json
import os

import config


def _most_recent_prior_snapshot_date():
    today = datetime.date.today().isoformat()
    if not os.path.isdir(config.DATA_DIR):
        return None
    dates = []
    for name in os.listdir(config.DATA_DIR):
        if name < today and os.path.isdir(os.path.join(config.DATA_DIR, name)):
            try:
                datetime.date.fromisoformat(name)
                dates.append(name)
            except ValueError:
                continue
    return max(dates) if dates else None


def detect(video_catalog):
    prior_date = _most_recent_prior_snapshot_date()
    if prior_date is None:
        return {
            "compared_against_date": None,
            "new_videos": [],
            "note": "No prior snapshot yet -- can't detect new uploads until tomorrow's run.",
        }

    prior_path = os.path.join(config.DATA_DIR, prior_date, "video_catalog.json")
    try:
        with open(prior_path) as f:
            prior_catalog = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {
            "compared_against_date": prior_date,
            "new_videos": [],
            "note": f"Found {prior_date}'s snapshot directory but couldn't read its video_catalog.json.",
        }

    prior_ids = {v["video_id"] for v in prior_catalog}
    new_videos = [
        {"video_id": v["video_id"], "title": v["title"], "published_at": v["published_at"]}
        for v in video_catalog
        if v["video_id"] not in prior_ids
    ]

    return {
        "compared_against_date": prior_date,
        "new_videos": new_videos,
        "note": f"Comparing today's catalog against the last snapshot ({prior_date}).",
    }
