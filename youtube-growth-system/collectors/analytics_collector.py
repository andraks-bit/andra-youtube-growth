"""
Collects YouTube Analytics data (read-only reports.query calls).

Capability notes from live Step 2 testing against this channel:
  - Thumbnail-impressions CTR ("impressions" / "impressionsClickThroughRate")
    is NOT exposed by the public Analytics API -- confirmed via a live 400
    ("Unknown identifier (impressions)"). It's Studio-only. We do not pretend
    otherwise anywhere in this system; retention (averageViewPercentage /
    audienceWatchRatio) is used as the available substitute.
  - Per-video retention curves (elapsedVideoTimeRatio) only return rows once
    a video has accumulated enough views (empirically: a video with 167
    views returned a full 100-point curve; videos with low view counts
    returned zero rows). We only request it for videos above
    config.RETENTION_MIN_VIEWS.
"""
import datetime

import config


def _date_window(days):
    end = datetime.date.today()
    start = end - datetime.timedelta(days=days)
    return start.isoformat(), end.isoformat()


def collect(client, video_catalog):
    start, end = _date_window(config.ANALYTICS_WINDOW_DAYS)
    result = {"window_start": start, "window_end": end}

    daily = client.analytics_query(
        startDate=start, endDate=end,
        metrics="views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,"
                "likes,comments,shares,subscribersGained,subscribersLost",
        dimensions="day",
        sort="day",
    )
    result["daily"] = _rows_to_dicts(daily)

    traffic_sources = client.analytics_query(
        startDate=start, endDate=end,
        metrics="views", dimensions="insightTrafficSourceType", sort="-views",
    )
    result["traffic_sources"] = _rows_to_dicts(traffic_sources)

    search_terms = client.analytics_query(
        startDate=start, endDate=end,
        metrics="views", dimensions="insightTrafficSourceDetail",
        filters="insightTrafficSourceType==YT_SEARCH",
        sort="-views", maxResults=25,
    )
    result["top_search_terms"] = _rows_to_dicts(search_terms)

    per_video = client.analytics_query(
        startDate=start, endDate=end,
        metrics="views,estimatedMinutesWatched,averageViewPercentage,likes,comments,shares",
        dimensions="video", sort="-views", maxResults=50,
    )
    result["per_video"] = _rows_to_dicts(per_video)

    geography = client.analytics_query(
        startDate=start, endDate=end,
        metrics="views", dimensions="country", sort="-views", maxResults=10,
    )
    result["geography"] = _rows_to_dicts(geography)

    devices = client.analytics_query(
        startDate=start, endDate=end,
        metrics="views", dimensions="deviceType", sort="-views",
    )
    result["devices"] = _rows_to_dicts(devices)

    subscribed_status = client.analytics_query(
        startDate=start, endDate=end,
        metrics="views", dimensions="subscribedStatus",
    )
    result["subscribed_status"] = _rows_to_dicts(subscribed_status)

    # Retention curves only for videos with enough views to have data
    # (view counts come from per_video analytics, which is windowed --
    # use lifetime view_count from the catalog as the gate instead since
    # that's what determines whether YouTube has accumulated a curve).
    by_id = {v["video_id"]: v for v in video_catalog}
    retention_curves = {}
    candidates = [v for v in video_catalog if v["view_count"] >= config.RETENTION_MIN_VIEWS]
    candidates.sort(key=lambda v: v["view_count"], reverse=True)
    for v in candidates[:15]:
        curve = client.analytics_query(
            startDate="2000-01-01", endDate=end,
            metrics="audienceWatchRatio,relativeRetentionPerformance",
            dimensions="elapsedVideoTimeRatio",
            filters=f"video=={v['video_id']}",
        )
        rows = curve.get("rows", [])
        if rows:
            retention_curves[v["video_id"]] = [
                {"elapsed_ratio": r[0], "audience_watch_ratio": r[1],
                 "relative_retention_performance": r[2] if len(r) > 2 else None}
                for r in rows
            ]
    result["retention_curves"] = retention_curves

    return result


def _rows_to_dicts(report):
    cols = [c["name"] for c in report.get("columnHeaders", [])]
    return [dict(zip(cols, row)) for row in report.get("rows", [])]
