"""Compiles collected data + analysis into a dated Markdown growth report."""
import datetime

import config


def generate(channel_snapshot, video_catalog, analytics, seo, optimization, shorts, planning,
             keyword_discovery=None, metadata_rewrites=None, momentum=None,
             retention_patterns=None, destination_performance=None,
             seo_packages=None, new_videos=None):
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

    if new_videos is not None:
        a("## Newly detected videos since last run")
        a(new_videos["note"])
        if new_videos["new_videos"]:
            for v in new_videos["new_videos"]:
                a(f"- {v['title']} (published {v['published_at'][:10]}, id {v['video_id']})")
        else:
            a("- None detected this run.")
        a("")

    if momentum is not None:
        a("## Momentum -- videos gaining or losing views")
        a(momentum["note"])
        a("")
        a("**Gaining:**")
        if momentum["gainers"]:
            for g in momentum["gainers"]:
                a(f"- {g['title']}: +{g['delta']} views (90d window)")
        else:
            a("- None yet.")
        a("")
        a("**Losing steam:**")
        if momentum["losers"]:
            for l in momentum["losers"]:
                a(f"- {l['title']}: {l['delta']} views (90d window)")
        else:
            a("- None flagged.")
        a("")

    if retention_patterns is not None:
        a("## Retention patterns: top vs. bottom performers")
        a(retention_patterns["note"])
        for fmt_key, fmt_label in (("long_form", "Long-form"), ("shorts", "Shorts")):
            fmt = retention_patterns.get(fmt_key, {})
            a("")
            a(f"### {fmt_label}")
            if not fmt.get("top_avg_curve"):
                a(f"- Not enough {fmt_label.lower()} videos with retention curves yet "
                  f"({fmt.get('videos_with_curves', 0)} available).")
                continue
            if fmt.get("insight"):
                a(f"**Insight:** {fmt['insight']}")
            a("")
            a("| Elapsed | Top performers | Bottom performers |")
            a("|---|---|---|")
            for cp in sorted(fmt["top_avg_curve"]):
                top_v = fmt["top_avg_curve"].get(cp)
                bot_v = fmt["bottom_avg_curve"].get(cp)
                top_s = f"{top_v*100:.0f}%" if top_v is not None else "n/a"
                bot_s = f"{bot_v*100:.0f}%" if bot_v is not None else "n/a"
                a(f"| {cp*100:.0f}% | {top_s} | {bot_s} |")
        a("")

    if destination_performance is not None:
        a("## Destination performance & content-planning priority")
        a(destination_performance["note"])
        a("")
        a("| Destination | Videos | Avg views/90d | Retention | Unmet keywords | Momentum | Priority |")
        a("|---|---|---|---|---|---|---|")
        for d in destination_performance["destinations"]:
            ret = f"{d['avg_retention_pct']:.1f}%" if d["avg_retention_pct"] is not None else "n/a"
            a(f"| {d['destination']} | {d['video_count']} | {d['avg_views_90d']} | {ret} | "
              f"{d['unmet_demand_keywords']} | {d['momentum_90d_view_delta']:+d} | {d['priority_score']} |")
        a("")

    if keyword_discovery is not None:
        a("## Keyword discovery by destination")
        a(keyword_discovery["note"])
        a("")
        for dest, gaps in keyword_discovery["gaps_by_destination"].items():
            if not gaps:
                continue
            a(f"**{dest} -- proven demand, not yet targeted:**")
            for g in gaps[:8]:
                a(f"- \"{g['term']}\" ({g['views']} views)")
            a("")
        for dest, opps in keyword_discovery["template_opportunities_by_destination"].items():
            if not opps:
                continue
            a(f"**{dest} -- template keyword ideas (not real search-volume data):**")
            for o in opps[:6]:
                a(f"- {o}")
            a("")

    if metadata_rewrites is not None:
        a("## Metadata rewrite suggestions for existing videos")
        a(metadata_rewrites["note"])
        a("")
        for r in metadata_rewrites["rewrites"]:
            a(f"### {r['current_title']}")
            a(f"Destination: {r['destination']}  |  Video ID: {r['video_id']}")
            a("Flagged because: " + "; ".join(r["reasons_flagged"]))
            a("")
            a("Suggested titles:")
            for t in r["suggested_titles"]:
                a(f"- {t}")
            a("")
            a("Suggested tags: " + ", ".join(r["suggested_tags"]))
            a("Suggested hashtags: " + " ".join(r["suggested_hashtags"]))
            a("")
            a("Suggested description:")
            a("```")
            a(r["suggested_description"])
            a("```")
            a("")

    if seo_packages is not None:
        a("## New-video SEO packages by destination priority")
        a(seo_packages["note"])
        a("")
        for pkg in seo_packages["packages"]:
            a(f"### {pkg['destination']}")
            a("Title options:")
            for t in pkg["title_options"]:
                a(f"- {t}")
            a("")
            a("Tags: " + ", ".join(pkg["tags"]))
            a("Hashtags: " + " ".join(pkg["hashtags"]))
            a("")
            a("Description:")
            a("```")
            a(pkg["description"])
            a("```")
            a("")
            a("Chapter template:")
            for c in pkg["chapters_template"]:
                a(f"- {c}")
            a("")
            a("Thumbnail text ideas: " + " / ".join(pkg["thumbnail_text_ideas"]))
            a("")
            a("Shorts ideas:")
            for s in pkg["shorts_ideas"]:
                a(f"- {s}")
            a("")

    return "\n".join(lines)
