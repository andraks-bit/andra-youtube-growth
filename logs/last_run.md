# Run 20261002T063115Z

- Started: 2026-10-02T06:31:15.152843Z
- Finished: 2026-10-02T06:35:32.734092Z
- Overall status: **FAILED**

| Step | Status | Collected | Produced | Duration (s) | Error |
|---|---|---|---|---|---|
| auth | success | token via environment | None | 0.19 |  |
| collect_channel_snapshot | success | 143 subs, 203 videos | None | 0.13 |  |
| collect_video_catalog | success | 205 videos | None | 2.42 |  |
| collect_analytics | success | 88 daily rows, 15 retention curves | None | 247.04 |  |
| collect_video_traffic | success | 15 videos' traffic-source breakdown | None | 3.64 |  |
| collect_traffic_source_trend | success | this-week vs last-week traffic-source split | None | 0.49 |  |
| analyze_seo_keywords | success | None | 17 keyword gaps | 0.00 |  |
| analyze_optimization_opportunities | success | None | 181 flagged videos | 0.00 |  |
| analyze_shorts_opportunities | success | None | 2 repurpose candidates | 0.00 |  |
| analyze_content_planning | success | None | 10 top videos summarized | 0.00 |  |
| detect_new_videos | success | None | 0 new videos since last run | 0.00 |  |
| analyze_keyword_discovery | success | None | 9 real-demand gaps across destinations | 0.01 |  |
| analyze_momentum | success | None | 10 gainers, 2 losers (history: 2 days) | 0.00 |  |
| analyze_retention_patterns | success | None | 15 videos compared | 0.00 |  |
| analyze_metadata_rewrites | success | None | 12 videos rewritten | 0.00 |  |
| analyze_destination_performance | success | None | 10 destinations ranked | 0.00 |  |
| generate_seo_packages | success | None | 6 destination SEO packages | 0.00 |  |
| analyze_traffic_growth | success | None | 15 priority videos assessed | 0.00 |  |
| analyze_search_seo | success | None | 25 prioritized keywords | 0.00 |  |
| analyze_suggested_video_strategy | success | None | 7 topic clusters | 0.00 |  |
| analyze_shorts_to_longform | success | None | 6 funnels | 0.00 |  |
| analyze_content_opportunity | success | None | 8 next-video ideas | 0.00 |  |
| generate_new_video_launch_packages | success | None | 0 launch packages | 0.00 |  |
| analyze_traffic_growth_actions | success | None | 5 ranked actions | 0.00 |  |
| analyze_ctr_optimization | success | None | 0 urgent CTR fixes, 0 high-performing patterns | 0.00 |  |
| analyze_competitor_intelligence | success | None | 0 content gaps identified, 0 opportunities | 0.00 |  |
| detect_trends_and_demand | success | None | 5 urgent trends, 7 seasonal peaks identified | 0.00 |  |
| analyze_distribution_strategy | success | None | 10 distribution opportunities, 315+ expected external views | 0.00 |  |
| analyze_impact_tracking | success | None | Impact tracking initialized for optimization measurement | 0.00 |  |
| calculate_growth_metrics | success | None | Channel Health Score: 50/100 | 0.00 |  |
| sync_change_approvals | success | 0 newly approved, 0 newly rejected | None | 2.32 |  |
| apply_approved_changes | success | None | writes OFF: 0 applied, 0 failed, 0 queued | 0.16 |  |
| generate_change_proposals | success | None | 2 new proposal issue(s) opened | 1.09 |  |
| save_data_snapshot | failed | None | None | 0.02 | TypeError: Object of type set is not JSON serializable |
| generate_report | success | None | /home/runner/work/andra-youtube-growth/andra-youtube-growth/reports/generated/2026-10-02.md | 0.00 |  |
| generate_weekly_report | success | None | /home/runner/work/andra-youtube-growth/andra-youtube-growth/reports/generated/weekly_2026-10-02.md | 0.00 |  |
