#!/usr/bin/env python3
"""
Orchestrator entrypoint for the Andra Kiirkivi YouTube Growth System.

Runs the full pipeline: collect channel + video + analytics data, run
rule-based analysis, write a dated report, sync/apply any human-approved
change proposals (Step 6), and log exactly what happened.

Collection and analysis (Steps 1-5) never call a write endpoint. Step 6 can,
but only for a specific proposal that a human approved via a GitHub Issue
AND only if config.youtube_writes_enabled() is true -- see
approval_workflow.py. Exits non-zero if any step failed, so a scheduled
GitHub Actions run shows as a failed workflow run rather than failing
silently.
"""
import datetime
import json
import os
import sys

import config
import youtube_api
import github_api
import approval_workflow
import digest
from run_logger import RunLogger
from collectors import (
    channel_snapshot, video_catalog, analytics_collector, new_video_detector,
    video_traffic_collector, traffic_source_trend_collector,
)
from analysis import (
    seo_keywords, optimization_opportunities, shorts_opportunities, content_planning,
    keyword_discovery, metadata_rewriter, momentum_tracker, retention_patterns,
    destination_performance, seo_package_generator,
    traffic_growth, search_seo, suggested_video_strategy, shorts_to_longform,
    content_opportunity_engine, new_video_launch_package, traffic_growth_actions,
    change_proposals, ctr_optimization, growth_backlog,
    competitor_intelligence, trend_detection, content_ideation,
    distribution_strategy, impact_tracking, growth_metrics, growth_digest,
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

    video_traffic_result = None
    if catalog is not None:
        with logger.step("collect_video_traffic") as step:
            video_traffic_result = video_traffic_collector.collect(client, catalog)
            step.set_collected(f"{len(video_traffic_result['by_video'])} videos' traffic-source breakdown")

    traffic_source_trend_result = None
    with logger.step("collect_traffic_source_trend") as step:
        traffic_source_trend_result = traffic_source_trend_collector.collect(client)
        step.set_collected("this-week vs last-week traffic-source split")

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

    # --- Step 5: traffic & growth engine (built on Step 4's outputs) ---
    traffic_growth_result = search_seo_result = suggested_strategy_result = None
    shorts_to_longform_result = content_opportunity_result = None
    new_launch_packages_result = traffic_actions_result = None

    if all(x is not None for x in (catalog, analytics, video_traffic_result, kw_discovery_result,
                                    optimization, momentum_result)):
        with logger.step("analyze_traffic_growth") as step:
            traffic_growth_result = traffic_growth.analyze(
                catalog, analytics, video_traffic_result, kw_discovery_result, optimization, momentum_result
            )
            step.set_produced(f"{len(traffic_growth_result['priority_videos'])} priority videos assessed")

    if catalog is not None and analytics is not None and kw_discovery_result is not None:
        with logger.step("analyze_search_seo") as step:
            search_seo_result = search_seo.analyze(catalog, analytics, kw_discovery_result)
            step.set_produced(f"{len(search_seo_result['prioritized_keywords'])} prioritized keywords")

    if catalog is not None and analytics is not None:
        with logger.step("analyze_suggested_video_strategy") as step:
            suggested_strategy_result = suggested_video_strategy.analyze(catalog, analytics)
            step.set_produced(f"{len(suggested_strategy_result['clusters'])} topic clusters")

        with logger.step("analyze_shorts_to_longform") as step:
            shorts_to_longform_result = shorts_to_longform.analyze(catalog, analytics)
            step.set_produced(f"{len(shorts_to_longform_result['funnels'])} funnels")

    if dest_perf_result is not None and search_seo_result is not None:
        with logger.step("analyze_content_opportunity") as step:
            content_opportunity_result = content_opportunity_engine.analyze(dest_perf_result, search_seo_result)
            step.set_produced(f"{len(content_opportunity_result['next_video_ideas'])} next-video ideas")

    if all(x is not None for x in (new_videos_result, catalog, kw_discovery_result, suggested_strategy_result)):
        with logger.step("generate_new_video_launch_packages") as step:
            new_launch_packages_result = new_video_launch_package.analyze(
                new_videos_result, catalog, kw_discovery_result, suggested_strategy_result
            )
            step.set_produced(f"{len(new_launch_packages_result['packages'])} launch packages")

    if all(x is not None for x in (traffic_growth_result, search_seo_result, momentum_result,
                                    suggested_strategy_result, content_opportunity_result)):
        with logger.step("analyze_traffic_growth_actions") as step:
            traffic_actions_result = traffic_growth_actions.analyze(
                traffic_growth_result, search_seo_result, momentum_result,
                suggested_strategy_result, content_opportunity_result
            )
            step.set_produced(f"{len(traffic_actions_result['actions'])} ranked actions")

    ctr_opt_result = competitor_intel_result = trends_result = growth_backlog_result = shorts_result = None

    if all(x is not None for x in (catalog, analytics, optimization, planning)):
        with logger.step("analyze_ctr_optimization") as step:
            ctr_opt_result = ctr_optimization.analyze(
                catalog, analytics, optimization, planning
            )
            critical_failures = len(ctr_opt_result.get("critical_ctr_failures", []))
            critical_wins = len(ctr_opt_result.get("critical_ctr_wins", []))
            step.set_produced(f"{critical_failures} urgent CTR fixes, {critical_wins} high-performing patterns")

    if all(x is not None for x in (catalog, kw_discovery_result, dest_perf_result)):
        with logger.step("analyze_competitor_intelligence") as step:
            competitor_intel_result = competitor_intelligence.analyze(
                catalog, kw_discovery_result, momentum_result, dest_perf_result
            )
            gap_count = competitor_intel_result.get("gap_analysis", {}).get("gap_count", 0)
            opp_count = len(competitor_intel_result.get("opportunities", {}).get("opportunities", []))
            step.set_produced(f"{gap_count} content gaps identified, {opp_count} opportunities")

    if all(x is not None for x in (catalog, momentum_result, dest_perf_result, kw_discovery_result)):
        with logger.step("detect_trends_and_demand") as step:
            trends_result = trend_detection.analyze(
                catalog, momentum_result, dest_perf_result, kw_discovery_result,
                analytics=analytics, shorts_result=shorts_result
            )
            urgent_count = trends_result.get("total_urgent_count", 0)
            seasonal_peaks = len(trends_result.get("seasonal_opportunities", {}).get("seasonal_opportunities", []))
            step.set_produced(f"{urgent_count} urgent trends, {seasonal_peaks} seasonal peaks identified")

    if all(x is not None for x in (ctr_opt_result, competitor_intel_result, trends_result,
                                    shorts_result, kw_discovery_result, suggested_strategy_result, new_videos_result, traffic_growth_result)):
        with logger.step("build_growth_backlog") as step:
            growth_backlog_result = growth_backlog.build_backlog(
                ctr_opt_result, shorts_result, kw_discovery_result,
                suggested_strategy_result, new_videos_result, traffic_growth_result,
                competitor_intel_result=competitor_intel_result,
                trends_result=trends_result,
            )
            total_opps = growth_backlog_result.get("total_opportunities", 0)
            high_priority = growth_backlog_result.get("high_priority_count", 0)
            step.set_produced(
                f"{total_opps} growth opportunities; {high_priority} high-priority; "
                f"top 5: {', '.join([o['title'][:30] for o in growth_backlog_result.get('top_5_this_week', [])[:2]])}"
            )

    # Phase 4: Distribution Strategy
    distribution_result = None
    if all(x is not None for x in (catalog, dest_perf_result, kw_discovery_result)):
        with logger.step("analyze_distribution_strategy") as step:
            distribution_result = distribution_strategy.analyze(
                catalog, dest_perf_result, kw_discovery_result,
                ctr_opt_result, None
            )
            total_dist = distribution_result.get("total_opportunities", 0)
            expected_traffic = distribution_result.get("total_expected_traffic", 0)
            step.set_produced(f"{total_dist} distribution opportunities, {expected_traffic}+ expected external views")

    # Phase 5: Impact Tracking
    impact_result = None
    with logger.step("analyze_impact_tracking") as step:
        impact_result = impact_tracking.analyze()
        step.set_produced("Impact tracking initialized for optimization measurement")

    # Phase 6: Growth Metrics
    metrics_result = None
    if analytics is not None:
        with logger.step("calculate_growth_metrics") as step:
            metrics_result = growth_metrics.analyze(analytics)
            health_score = metrics_result.get("channel_health_score", 0)
            step.set_produced(f"Channel Health Score: {health_score}/100")

    # Phase 7: Enhanced Growth Digest (generated but not sent until Monday)
    digest_result = None
    if all(x is not None for x in (metrics_result, impact_result, growth_backlog_result, distribution_result)):
        with logger.step("generate_growth_digest") as step:
            digest_result = growth_digest.generate_growth_digest(
                metrics_result, impact_result, growth_backlog_result, distribution_result
            )
            step.set_produced(f"Growth digest prepared ({len(digest_result)} chars)")

    # --- Step 6: approval workflow (GitHub Issues). Gracefully skipped on
    # local runs where GITHUB_TOKEN isn't set -- that's expected, not a
    # failure; verify this part via a real GitHub Actions run instead. ---
    gh = None
    try:
        gh = github_api.GitHubClient(config.GITHUB_REPO)
    except github_api.GitHubError:
        gh = None

    with logger.step("sync_change_approvals") as step:
        if gh is None:
            step.set_collected("skipped -- no GITHUB_TOKEN (expected on local runs)")
        else:
            approved_n, rejected_n = approval_workflow.sync_approvals(gh)
            step.set_collected(f"{approved_n} newly approved, {rejected_n} newly rejected")

    with logger.step("apply_approved_changes") as step:
        if gh is None:
            step.set_collected("skipped -- no GITHUB_TOKEN (expected on local runs)")
        else:
            applied_n, failed_n, queued_n = approval_workflow.apply_approved(youtube_api.YouTubeClient(), gh)
            writes_state = "ON" if config.youtube_writes_enabled() else "OFF"
            step.set_produced(f"writes {writes_state}: {applied_n} applied, {failed_n} failed, {queued_n} queued")

    with logger.step("generate_change_proposals") as step:
        if gh is None:
            step.set_collected("skipped -- no GITHUB_TOKEN (expected on local runs)")
        elif rewrites_result is None or suggested_strategy_result is None:
            step.set_collected("skipped -- upstream analysis unavailable this run")
        else:
            state = approval_workflow.load_state()
            candidates = change_proposals.build(
                rewrites_result, suggested_strategy_result,
                exclude_video_ids=approval_workflow.already_proposed_video_ids(state),
                exclude_playlist_titles=approval_workflow.already_proposed_playlist_titles(state),
                max_count=config.MAX_NEW_PROPOSALS_PER_RUN,
            )
            created_n = approval_workflow.create_new_proposals(gh, candidates)
            step.set_produced(f"{created_n} new proposal issue(s) opened")

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
            if video_traffic_result is not None:
                with open(os.path.join(day_dir, "video_traffic.json"), "w") as f:
                    json.dump(video_traffic_result, f, indent=2)
            growth_analysis = {
                "new_videos": new_videos_result,
                "keyword_discovery": kw_discovery_result,
                "momentum": momentum_result,
                "retention_patterns": retention_result,
                "destination_performance": dest_perf_result,
                "traffic_growth": traffic_growth_result,
                "search_seo": search_seo_result,
                "suggested_video_strategy": suggested_strategy_result,
                "shorts_to_longform": shorts_to_longform_result,
                "content_opportunity": content_opportunity_result,
                "traffic_growth_actions": traffic_actions_result,
                "ctr_optimization": ctr_opt_result,
                "competitor_intelligence": competitor_intel_result,
                "trend_detection": trends_result,
                "growth_backlog": growth_backlog_result,
                "distribution_strategy": distribution_result,
                "impact_tracking": impact_result,
                "growth_metrics": metrics_result,
                "growth_digest": digest_result,
            }
            try:
                with open(os.path.join(day_dir, "growth_analysis.json"), "w") as f:
                    json.dump(growth_analysis, f, indent=2)
                step.set_produced(f"data/{today}/*.json")
            except (TypeError, ValueError) as e:
                step.set_produced(f"growth_analysis JSON serialization skipped ({type(e).__name__})")

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
                traffic_growth_actions=traffic_actions_result,
                traffic_growth=traffic_growth_result,
                search_seo=search_seo_result,
                suggested_video_strategy=suggested_strategy_result,
                shorts_to_longform=shorts_to_longform_result,
                content_opportunity=content_opportunity_result,
                new_video_launch_packages=new_launch_packages_result,
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
                snapshot, momentum_result, dest_perf_result, new_videos_result, kw_discovery_result,
                analytics=analytics, traffic_source_trend=traffic_source_trend_result,
            )
            weekly_path = os.path.join(config.REPORTS_DIR, f"weekly_{today}.md")
            with open(weekly_path, "w") as f:
                f.write(weekly_md)
            weekly_latest_path = os.path.join(config.REPORTS_DIR, "weekly_latest.md")
            with open(weekly_latest_path, "w") as f:
                f.write(weekly_md)
            step.set_produced(weekly_path)

    if os.environ.get("SEND_DIGEST"):
        with logger.step("send_digest") as step:
            digest_text = digest.generate_digest_text(
                os.path.join(config.REPORTS_DIR, "weekly_latest.md"),
                os.path.join(config.DATA_DIR, "pending_changes.json"),
            )
            recipient = os.environ.get("DIGEST_RECIPIENT_EMAIL", "andra.kiirkivi@gmail.com")
            sent = digest.send_digest_email(digest_text, recipient)
            status = "sent" if sent else "queued for manual review (SMTP not configured)"
            step.set_produced(f"digest {status} to {recipient}")

    summary = logger.finalize()
    print(json.dumps(summary, indent=2))

    if summary["overall_status"] != "success":
        sys.exit(1)


if __name__ == "__main__":
    main()
