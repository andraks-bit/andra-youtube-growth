"""Collects a point-in-time channel-level snapshot (read-only)."""
import datetime


def collect(client):
    ch = client.get_my_channel()
    stats = ch.get("statistics", {})
    return {
        "collected_at": datetime.datetime.utcnow().isoformat() + "Z",
        "channel_id": ch["id"],
        "title": ch["snippet"]["title"],
        "custom_url": ch["snippet"].get("customUrl"),
        "subscriber_count": int(stats.get("subscriberCount", 0)),
        "view_count": int(stats.get("viewCount", 0)),
        "video_count": int(stats.get("videoCount", 0)),
        "uploads_playlist_id": ch["contentDetails"]["relatedPlaylists"]["uploads"],
    }
