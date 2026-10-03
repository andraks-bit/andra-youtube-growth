"""
Two extra real Analytics queries (channel-level, cheap) specifically for the
weekly report's "traffic sources week-over-week" requirement: the existing
analytics_collector.py only pulls a 90-day AGGREGATE traffic-source mix,
which can't show a real this-week-vs-last-week split. This collects that
split directly instead of approximating it.
"""
import datetime


def _week_window(weeks_back):
    end = datetime.date.today() - datetime.timedelta(days=weeks_back * 7)
    start = end - datetime.timedelta(days=6)
    return start.isoformat(), end.isoformat()


def collect(client):
    this_start, this_end = _week_window(0)
    last_start, last_end = _week_window(1)

    this_week = client.analytics_query(
        startDate=this_start, endDate=this_end,
        metrics="views", dimensions="insightTrafficSourceType", sort="-views",
    )
    last_week = client.analytics_query(
        startDate=last_start, endDate=last_end,
        metrics="views", dimensions="insightTrafficSourceType", sort="-views",
    )

    def rows_to_dict(report):
        cols = [c["name"] for c in report.get("columnHeaders", [])]
        return {dict(zip(cols, row))["insightTrafficSourceType"]: dict(zip(cols, row))["views"]
                for row in report.get("rows", [])}

    return {
        "this_week": {"start": this_start, "end": this_end, "by_source": rows_to_dict(this_week)},
        "last_week": {"start": last_start, "end": last_end, "by_source": rows_to_dict(last_week)},
    }
