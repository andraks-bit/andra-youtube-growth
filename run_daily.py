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
from collectors import channel_snapshot, video_catalog, analytics_collector
from analysis import seo_keywords, optimization_opportunities, shorts_opportunities, content_planning
from reports import report_generator


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
            step.set_produced(f"data/{today}/*.json")

    if all(x is not None for x in (snapshot, catalog, analytics, seo, optimization, shorts, planning)):
        with logger.step("generate_report") as step:
            report_md = report_generator.generate(
                snapshot, catalog, analytics, seo, optimization, shorts, planning
            )
            report_path = os.path.join(config.REPORTS_DIR, f"{today}.md")
            with open(report_path, "w") as f:
                f.write(report_md)
            latest_path = os.path.join(config.REPORTS_DIR, "latest.md")
            with open(latest_path, "w") as f:
                f.write(report_md)
            step.set_produced(report_path)

    summary = logger.finalize()
    print(json.dumps(summary, indent=2))

    if summary["overall_status"] != "success":
        sys.exit(1)


if __name__ == "__main__":
    main()
