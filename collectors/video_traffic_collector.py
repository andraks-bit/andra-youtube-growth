"""
Per-video traffic-source breakdown for the channel's top videos -- real
YouTube Analytics data (insightTrafficSourceType filtered to one video at a
time), not available from the channel-wide query already in
analytics_collector.py. Bounded to config.PRIORITY_VIDEO_COUNT videos
because it's one new API call per video.
"""
import datetime

import config


def collect(client, video_catalog, window_days=None):
    window_days = window_days or config.ANALYTICS_WINDOW_DAYS
    end = datetime.date.today().isoformat()
    start = (datetime.date.today() - datetime.timedelta(days=window_days)).isoformat()

    priority_videos = sorted(video_catalog, key=lambda v: v["view_count"], reverse=True)
    priority_videos = priority_videos[:config.PRIORITY_VIDEO_COUNT]

    result = {}
    for v in priority_videos:
        report = client.analytics_query(
            startDate=start, endDate=end,
            metrics="views", dimensions="insightTrafficSourceType",
            filters=f"video=={v['video_id']}", sort="-views",
        )
        cols = [c["name"] for c in report.get("columnHeaders", [])]
        rows = [dict(zip(cols, row)) for row in report.get("rows", [])]
        result[v["video_id"]] = rows

    return {
        "window_start": start,
        "window_end": end,
        "by_video": result,
        "note": (
            f"Real per-video traffic-source breakdown (YouTube Analytics) for the "
            f"top {len(priority_videos)} videos by lifetime views."
        ),
    }
