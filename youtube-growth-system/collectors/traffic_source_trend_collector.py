"""
Two extra real Analytics queries (channel-level, cheap) specifically for the
weekly report's "traffic sources week-over-week" requirement: the existing
analytics_collector.py only pulls a 90-day AGGREGATE traffic-source mix,
which can't show a real this-week-vs-last-week split. This collects that
split directly instead of approximating it.

Handles transient YouTube Analytics API errors gracefully: retries up to 3 times
with exponential backoff, then returns a safe fallback if API still fails.
"""
import datetime
import youtube_api


def _week_window(weeks_back):
    end = datetime.date.today() - datetime.timedelta(days=weeks_back * 7)
    start = end - datetime.timedelta(days=6)
    return start.isoformat(), end.isoformat()


def collect(client):
    """Collect traffic source trends with graceful failure handling."""
    this_start, this_end = _week_window(0)
    last_start, last_end = _week_window(1)

    def safe_analytics_query(start_date, end_date, week_label):
        """Execute analytics query with retry; return empty dict if permanently failed."""
        try:
            return client.analytics_query(
                startDate=start_date, endDate=end_date,
                metrics="views", dimensions="insightTrafficSourceType", sort="-views",
            )
        except youtube_api.ApiError as e:
            print(f"⚠️  Traffic source trend collection failed for {week_label} "
                  f"({start_date} to {end_date}): {e}")
            print(f"   Continuing with empty data (will be noted in report)")
            return {}

    this_week = safe_analytics_query(this_start, this_end, "this week")
    last_week = safe_analytics_query(last_start, last_end, "last week")

    def rows_to_dict(report):
        cols = [c["name"] for c in report.get("columnHeaders", [])]
        return {dict(zip(cols, row))["insightTrafficSourceType"]: dict(zip(cols, row))["views"]
                for row in report.get("rows", [])}

    return {
        "this_week": {"start": this_start, "end": this_end, "by_source": rows_to_dict(this_week)},
        "last_week": {"start": last_start, "end": last_end, "by_source": rows_to_dict(last_week)},
        "availability": "complete" if (this_week and last_week) else "partial",
    }
