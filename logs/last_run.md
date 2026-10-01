# Run 20261001T055701Z

- Started: 2026-10-01T05:57:01.112585Z
- Finished: 2026-10-01T05:59:15.458750Z
- Overall status: **FAILED**

| Step | Status | Collected | Produced | Duration (s) | Error |
|---|---|---|---|---|---|
| auth | success | token via environment | None | 0.13 |  |
| collect_channel_snapshot | success | 143 subs, 203 videos | None | 0.09 |  |
| collect_video_catalog | success | 204 videos | None | 1.89 |  |
| collect_analytics | failed | None | None | 123.48 | ApiError: GET https://youtubeanalytics.googleapis.com/v2/reports failed (HTTP 500): {
  "error": {
    "code": 500,
    "message": "Internal error encountered.",
    "errors": [
      {
        "messa |
| collect_video_traffic | success | 15 videos' traffic-source breakdown | None | 4.00 |  |
| collect_traffic_source_trend | success | this-week vs last-week traffic-source split | None | 0.38 |  |
| detect_new_videos | success | None | 0 new videos since last run | 0.00 |  |
| sync_change_approvals | success | 0 newly approved, 0 newly rejected | None | 1.80 |  |
| apply_approved_changes | success | None | writes ON: 1 applied, 0 failed, 0 queued | 2.57 |  |
| generate_change_proposals | success | skipped -- upstream analysis unavailable this run | None | 0.00 |  |
