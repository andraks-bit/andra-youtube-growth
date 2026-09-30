"""Compiles collected data + analysis into a dated Markdown growth report."""
import datetime

import config


def generate(channel_snapshot, video_catalog, analytics, seo, optimization, shorts, planning):
    today = datetime.date.today().isoformat()
    lines = []
    a = lines.append

    a(f"# YouTube Growth Report -- {config.CHANNEL_TITLE} ({today})")
    a("")
    a("**This report is analysis and recommendations only. No titles, "
      "descriptions, tags, thumbnails, visibility, or videos were changed "
      "on YouTube by this run.**")
    a("")

    a("## Channel snapshot")
    a(f"- Subscribers: {channel_snapshot['subscriber_count']}")
    a(f"- Lifetime views: {channel_snapshot['view_count']}")
    a(f"- Video count: {channel_snapshot['video_count']}")
    a("")

    a(f"## Last {config.ANALYTICS_WINDOW_DAYS} days")
    daily = analytics.get("daily", [])
    total_views = sum(d.get("views", 0) for d in daily)
    total_minutes = sum(d.get("estimatedMinutesWatched", 0) for d in daily)
    subs_gained = sum(d.get("subscribersGained", 0) for d in daily)
    subs_lost = sum(d.get("subscribersLost", 0) for d in daily)
    a(f"- Views: {total_views}")
    a(f"- Watch time: {total_minutes} minutes")
    a(f"- Subscribers gained / lost: +{subs_gained} / -{subs_lost}")
    a("")

    a("### Traffic sources")
    for row in analytics.get("traffic_sources", [])[:8]:
        a(f"- {row.get('insightTrafficSourceType')}: {row.get('views')} views")
    a("")

    a("### Top search terms (YT_SEARCH)")
    if analytics.get("top_search_terms"):
        for row in analytics["top_search_terms"][:10]:
            a(f"- \"{row.get('insightTrafficSourceDetail')}\": {row.get('views')} views")
    else:
        a("- No search-term data in this window.")
    a("")

    a("### Audience")
    a("Countries: " + ", ".join(
        f"{r.get('country')} ({r.get('views')})" for r in analytics.get("geography", [])[:5]
    ) or "n/a")
    a("Devices: " + ", ".join(
        f"{r.get('deviceType')} ({r.get('views')})" for r in analytics.get("devices", [])
    ) or "n/a")
    a("")

    a("## SEO keyword gaps")
    a(seo["note"])
    a("")
    if seo["keyword_gaps"]:
        for g in seo["keyword_gaps"][:15]:
            a(f"- \"{g['term']}\" ({g['views']} views driving this already, not targeted yet)")
    else:
        a("- None detected this run.")
    a("")

    a("## Optimization opportunities (existing videos)")
    a(optimization["note"])
    if optimization.get("channel_avg_retention_pct_90d") is not None:
        a(f"Channel average retention (90d): {optimization['channel_avg_retention_pct_90d']:.1f}%")
    a("")
    if optimization["opportunities"]:
        for o in optimization["opportunities"][:15]:
            a(f"### {o['title']}")
            a(f"- Video ID: {o['video_id']}  |  Lifetime views: {o['lifetime_views']}")
            for r in o["reasons"]:
                a(f"  - {r}")
    else:
        a("- None flagged this run.")
    a("")

    a("## Shorts vs long-form")
    a(shorts["note"])
    a(f"- Shorts: {shorts['shorts']}")
    a(f"- Long-form: {shorts['long_form']}")
    if shorts["repurpose_candidates"]:
        a("- Repurpose-into-Shorts candidates (high-retention long-form clips):")
        for c in shorts["repurpose_candidates"]:
            a(f"  - {c['title']} (retention {c['retention_pct_90d']:.1f}%, {c['duration_seconds']}s)")
    a("")

    a("## Content planning signal")
    a(planning["note"])
    a("Recurring words in top performers: " + ", ".join(
        f"{w}({c})" for w, c in planning["recurring_words_in_top_performers"]
    ) or "n/a")
    a("")

    a("## New-video SEO package template")
    a("For the next upload, combine the keyword gaps above with the recurring "
      "words from top performers to draft:")
    a("- Title: include one keyword-gap term naturally, keep 40-70 chars")
    a("- Description: first 2 lines should restate the main keyword + a CTA link")
    a("- Tags: mix broad channel tags with the specific keyword-gap terms")
    a("- (This package is a template for you to fill in manually -- this "
      "system does not generate or publish video metadata automatically.)")
    a("")

    return "\n".join(lines)
