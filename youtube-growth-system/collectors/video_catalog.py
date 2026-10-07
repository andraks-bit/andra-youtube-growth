"""Collects the full video catalog (metadata + lifetime stats) via Data API."""
import re

import config

_DURATION_RE = re.compile(
    r"PT(?:(?P<hours>\d+)H)?(?:(?P<minutes>\d+)M)?(?:(?P<seconds>\d+)S)?"
)


def parse_duration_seconds(iso_duration):
    m = _DURATION_RE.match(iso_duration or "")
    if not m:
        return 0
    parts = m.groupdict()
    h = int(parts["hours"] or 0)
    mi = int(parts["minutes"] or 0)
    s = int(parts["seconds"] or 0)
    return h * 3600 + mi * 60 + s


def collect(client, uploads_playlist_id):
    video_ids = []
    page_token = None
    while True:
        page = client.list_uploads(uploads_playlist_id, max_results=50, page_token=page_token)
        video_ids.extend(item["contentDetails"]["videoId"] for item in page.get("items", []))
        page_token = page.get("nextPageToken")
        if not page_token:
            break

    videos = client.get_videos(video_ids)

    catalog = []
    for v in videos:
        snippet = v["snippet"]
        stats = v.get("statistics", {})
        duration_s = parse_duration_seconds(v["contentDetails"]["duration"])
        catalog.append({
            "video_id": v["id"],
            "title": snippet["title"],
            "description": snippet.get("description", ""),
            "published_at": snippet["publishedAt"],
            "tags": snippet.get("tags", []),
            "category_id": snippet.get("categoryId"),
            "duration_seconds": duration_s,
            "is_likely_short": duration_s > 0 and duration_s <= config.SHORTS_MAX_DURATION_SECONDS,
            "view_count": int(stats.get("viewCount", 0)),
            "like_count": int(stats.get("likeCount", 0)),
            "comment_count": int(stats.get("commentCount", 0)),
            "privacy_status": v.get("status", {}).get("privacyStatus"),
        })

    catalog.sort(key=lambda x: x["published_at"], reverse=True)
    return catalog
