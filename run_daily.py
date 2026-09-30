#!/usr/bin/env python3
"""
Orchestrator entrypoint for the Andra Kiirkivi YouTube Growth System.

Runs the full read-only pipeline: collect channel + video + analytics data,
run rule-based analysis, write a dated report, and log exactly what happened.

Never calls a YouTube write endpoint. Exits non-zero if any step failed, so
a scheduled GitHub Actions run shows as a failed workflow run (visible in
the Actions tab / any configured notifications) rather than failing silently.
"""
import datetime
import json
import os
import sys

import config
import youtube_api
from run_logger import RunLogger
from collectors import channel_snapshot, video_catalog, analytics_collector, new_video_detector
from analysis import (
    seo_keywords, optimization_opportunities, shorts_opportunities, content_planning,
    keyword_discovery, metadata_rewriter, momentum_tracker, retention_patterns,
    destination_performance, seo_package_generator,
)
from reports import report_generator, weekly_report_generator


def main():
    logger = RunLogger()
    os.makedirs(config.DATA_DIR, exist_ok=True)
    os.makedirs(config.REPORTS_DIR, exist_ok=True)

    client = None
    snapshot = None
    catalog = None
    analytics = None

    with logger.step("auth") as step:
        client = youtube_api.YouTubeClient()
        step.set_collected(f"token via {client.token_source}")

    if client is None:
        summary = logger.finalize()
        print(json.dumps(summary, indent=2))
        sys.exit(1)

    with logger.step("collect_channel_snapshot") as step:
        snapshot = channel_snapshot.collect(client)
        step.set_collected(f"{snapshot['subscriber_count']} subs, {snapshot['video_count']} videos")

    with logger.step("collect_video_catalog") as step:
        uploads_pl = snapshot["uploads_playlist_id"]
        catalog = video_catalog.collect(client, uploads_pl)
        step.set_collected(f"{len(catalog)} videos")

    with logger.step("collect_analytics") as step:
        analytics = analytics_collector.collect(client, catalog or [])
        step.set_collected(
            f"{len(analytics.get('daily', []))} daily rows, "
            f"{len(analytics.get('retention_curves', {}))} retention curves"
        )

    seo = optimization = shorts = planning = None

    if catalog is not None and analytics is not None:
        with logger.step("analyze_seo_keywords") as step:
            seo = seo_keywords.analyze(catalog, analytics)
            step.set_produced(f"{len(seo['keyword_gaps'])} keyword gaps")

        with logger.step("analyze_optimization_opportunities") as step:
            optimization = optimization_opportunities.analyze(catalog, analytics)
            step.set_produced(f"{len(optimization['opportunities'])} flagged videos")

        with logger.step("analyze_shorts_opportunities") as step:
            shorts = shorts_opportunities.analyze(catalog, analytics)
            step.set_produced(f"{len(shorts['repurpose_candidates'])} repurpose candidates")

        with logger.step("analyze_content_planning") as step:
            planning = content_planning.analyze(catalog, analytics)
            step.set_produced(f"{len(planning['top_performing_recent_videos'])} top videos summarized")

    # --- Step 4: growth engine (pure downstream analysis, no new API calls) ---
    new_videos_result = kw_discovery_result = rewrites_result = None
    momentum_result = retention_result = dest_perf_result = seo_packages_result = None

    if catalog is not None:
        with logger.step("detect_new_videos") as step:
            new_videos_result = new_video_detector.detect(catalog)
            step.set_produced(f"{len(new_videos_result['new_videos'])} new videos since last run")

    if catalog is not None and analytics is not None:
        with logger.step("analyze_keyword_discovery") as step:
            kw_discovery_result = keyword_discovery.analyze(catalog, analytics)
            gap_count = sum(len(v) for v in kw_discovery_result["gaps_by_destination"].values())
            step.set_produced(f"{gap_count} real-demand gaps across destinations")

        with logger.step("analyze_momentum") as step:
            momentum_result = momentum_tracker.analyze(catalog, analytics)
            step.set_produced(
                f"{len(momentum_result['gainers'])} gainers, {len(momentum_result['losers'])} losers "
                f"(history: {momentum_result['history_days_available']} days)"
            )

        with logger.step("analyze_retention_patterns") as step:
            retention_result = retention_patterns.analyze(catalog, analytics)
            step.set_produced(f"{retention_result['videos_with_curves']} videos compared")

    if optimization is not None and kw_discovery_result is not None and planning is not None:
        with logger.step("analyze_metadata_rewrites") as step:
            rewrites_result = metadata_rewriter.analyze(catalog, optimization, kw_discovery_result, planning)
            step.set_produced(f"{len(rewrites_result['rewrites'])} videos rewritten")

    if catalog is not None and analytics is not None:
        with logger.step("analyze_destination_performance") as step:
            dest_perf_result = destination_performance.analyze(
                catalog, analytics, kw_discovery_result, momentum_result
            )
            step.set_produced(f"{len(dest_perf_result['destinations'])} destinations ranked")

    if dest_perf_result is not None and kw_discovery_result is not None and planning is not None:
        with logger.step("generate_seo_packages") as step:
            seo_packages_result = seo_package_generator.analyze(dest_perf_result, kw_discovery_result, planning)
            step.set_produced(f"{len(seo_packages_result['packages'])} destination SEO packages")

    today = datetime.date.today().isoformat()

    if all(x is not None for x in (snapshot, catalog, analytics)):
        with logger.step("save_data_snapshot") as step:
            day_dir = os.path.join(config.DATA_DIR, today)
            os.makedirs(day_dir, exist_ok=True)
            with open(os.path.join(day_dir, "channel_snapshot.json"), "w") as f:
                json.dump(snapshot, f, indent=2)
            with open(os.path.join(day_dir, "video_catalog.json"), "w") as f:
                json.dump(catalog, f, indent=2)
            with open(os.path.join(day_dir, "analytics.json"), "w") as f:
                json.dump(analytics, f, indent=2)
            growth_analysis = {
                "new_videos": new_videos_result,
                "keyword_discovery": kw_discovery_result,
                "momentum": momentum_result,
                "retention_patterns": retention_result,
                "destination_performance": dest_perf_result,
            }
            with open(os.path.join(day_dir, "growth_analysis.json"), "w") as f:
                json.dump(growth_analysis, f, indent=2)
            step.set_produced(f"data/{today}/*.json")

    if all(x is not None for x in (snapshot, catalog, analytics, seo, optimization, shorts, planning)):
        with logger.step("generate_report") as step:
            report_md = report_generator.generate(
                snapshot, catalog, analytics, seo, optimization, shorts, planning,
                keyword_discovery=kw_discovery_result,
                metadata_rewrites=rewrites_result,
                momentum=momentum_result,
                retention_patterns=retention_result,
                destination_performance=dest_perf_result,
                seo_packages=seo_packages_result,
                new_videos=new_videos_result,
            )
            report_path = os.path.join(config.REPORTS_DIR, f"{today}.md")
            with open(report_path, "w") as f:
                f.write(report_md)
            latest_path = os.path.join(config.REPORTS_DIR, "latest.md")
            with open(latest_path, "w") as f:
                f.write(report_md)
            step.set_produced(report_path)

    if all(x is not None for x in (snapshot, new_videos_result, momentum_result, dest_perf_result, kw_discovery_result)):
        with logger.step("generate_weekly_report") as step:
            weekly_md = weekly_report_generator.generate(
                snapshot, momentum_result, dest_perf_result, new_videos_result, kw_discovery_result
            )
            weekly_path = os.path.join(config.REPORTS_DIR, f"weekly_{today}.md")
            with open(weekly_path, "w") as f:
                f.write(weekly_md)
            weekly_latest_path = os.path.join(config.REPORTS_DIR, "weekly_latest.md")
            with open(weekly_latest_path, "w") as f:
                f.write(weekly_md)
            step.set_produced(weekly_path)

    summary = logger.finalize()
    print(json.dumps(summary, indent=2))

    if summary["overall_status"] != "success":
        sys.exit(1)


if __name__ == "__main__":
    main()
