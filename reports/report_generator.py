"""Compiles collected data + analysis into a dated Markdown growth report."""
import datetime

import config


def generate(channel_snapshot, video_catalog, analytics, seo, optimization, shorts, planning,
             keyword_discovery=None, metadata_rewrites=None, momentum=None,
             retention_patterns=None, destination_performance=None,
             seo_packages=None, new_videos=None,
             traffic_growth_actions=None, traffic_growth=None, search_seo=None,
             suggested_video_strategy=None, shorts_to_longform=None,
             content_opportunity=None, new_video_launch_packages=None):
    today = datetime.date.today().isoformat()
    lines = []
    a = lines.append

    a(f"# YouTube Growth Report -- {config.CHANNEL_TITLE} ({today})")
    a("")
    a("**This report is analysis and recommendations only. No titles, "
      "descriptions, tags, thumbnails, visibility, or videos were changed "
      "on YouTube by this run.**")
    a("")

    if traffic_growth_actions is not None:
        a("## TRAFFIC GROWTH ACTIONS")
        a(traffic_growth_actions["note"])
        a("")
        for item in traffic_growth_actions["actions"]:
            a(f"{item['rank']}. **[{item['category']}]** {item['action']}")
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
        if metadata_rewrites.get("preserved_top_performers"):
            a("**Preserved (already top performers, left untouched):** " + ", ".join(
                p["title"][:40] for p in metadata_rewrites["preserved_top_performers"]
            ))
            a("")
        for r in metadata_rewrites["rewrites"]:
            a(f"### {r['current_title']}")
            a(f"Destination: {r['destination']}  |  Video ID: {r['video_id']}")
            a("Flagged because: " + "; ".join(r["reasons_flagged"]))
            a(f"Target keyword: {r['target_keyword']}  |  Secondary: {', '.join(r['secondary_keywords'])}")
            a("")
            a("Suggested titles:")
            for t in r["suggested_titles"]:
                a(f"- {t}")
            a("")
            a("Suggested tags: " + ", ".join(r["suggested_tags"]))
            a("Suggested hashtags: " + " ".join(r["suggested_hashtags"]))
            a("Thumbnail text ideas: " + " / ".join(r["thumbnail_text_ideas"]))
            a("")
            a("Suggested description:")
            a("```")
            a(r["suggested_description"])
            a("```")
            a("")
            a("Chapter template: " + " | ".join(r["chapters_template"]))
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

    if traffic_growth is not None:
        a("## Traffic growth opportunities (priority videos)")
        a(traffic_growth["note"])
        a("")
        for v in traffic_growth["priority_videos"][:12]:
            a(f"### {v['title']}")
            a(f"Destination: {v['destination']}  |  Views (90d): {v['views_90d']}  |  "
              f"Retention: {v['retention_pct']:.1f}%" if v["retention_pct"] is not None
              else f"Destination: {v['destination']}  |  Views (90d): {v['views_90d']}")
            for o in v["traffic_source_opportunities"]:
                a(f"- Traffic source opportunity: {o}")
            for k in v["search_keyword_opportunities"]:
                a(f"- Search keyword opportunity: \"{k}\"")
            for c in v["ctr_proxy_flags"]:
                a(f"- {c}")
            if v["retention_problem"]:
                a(f"- Retention problem: {v['retention_problem']}")
            if v["view_momentum_note"]:
                a(f"- {v['view_momentum_note']}")
            a("")

    if search_seo is not None:
        a("## YouTube Search SEO")
        a(search_seo["note"])
        a("")
        a(f"**Near-ranking keywords:** {search_seo['near_ranking_keywords_note']}")
        a("")
        a(f"**Trending opportunities:** {search_seo['trending_opportunities_note']}")
        a("")
        if search_seo["rising_search_terms"]:
            a(f"**Rising search terms** (vs {search_seo['rising_compared_against_date']}):")
            for r in search_seo["rising_search_terms"][:8]:
                a(f"- \"{r['term']}\": {r['views_then']} -> {r['views_now']} views ({r['delta']:+d})")
            a("")
        a("**Prioritized keyword list** (realistic traffic opportunity, not raw volume):")
        for kw in search_seo["prioritized_keywords"][:15]:
            dest_part = f" [{kw['destination']}]" if kw["destination"] else ""
            a(f"- ({kw['tier']}) \"{kw['keyword']}\"{dest_part} -- {kw['views']}")
        a("")
        for dest, longtails in search_seo["longtail_opportunities_by_destination"].items():
            a(f"**{dest} -- long-tail ideas (template, not real search-volume data):**")
            for lt in longtails:
                a(f"- {lt}")
            a("")

    if suggested_video_strategy is not None:
        a("## Suggested-video / internal linking strategy")
        a(suggested_video_strategy["note"])
        a("")
        for c in suggested_video_strategy["clusters"][:8]:
            a(f"### {c['destination']} ({c['video_count']} videos)")
            a(f"Hub video: {c['hub_video']['title']}")
            if c["playlist_suggestion"]:
                a(f"Playlist suggestion: {c['playlist_suggestion']}")
            a(f"Description link text: {c['description_link_text']}")
            a(f"Pinned comment text: {c['pinned_comment_text']}")
            a("Recommended end-screen/card pairs:")
            for p in c["recommended_pairs"][:5]:
                a(f"- {p['from_title'][:40]} -> {p['to_title'][:40]} ({p['reason']})")
            a("")

    if shorts_to_longform is not None:
        a("## Shorts -> long-form traffic funnels")
        a(shorts_to_longform["note"])
        a("")
        for f in shorts_to_longform["funnels"][:8]:
            a(f"### {f['destination']}")
            a(f"Target long-form video: {f['target_longform_video']['title']}")
            if f["existing_shorts_ctas"]:
                a("Existing Shorts -- add this CTA:")
                for s in f["existing_shorts_ctas"]:
                    a(f"- {s['short_title'][:50]}: \"{s['suggested_cta']}\"")
            a("New Shorts concepts to create:")
            for idea in f["new_shorts_cta_ideas"]:
                a(f"- {idea}")
            a("")

    if content_opportunity is not None:
        a("## Content opportunity engine -- what to film next")
        a(content_opportunity["note"])
        a("")
        for idea in content_opportunity["next_video_ideas"]:
            tag = "NEW DESTINATION" if idea["is_new_destination"] else "EXPAND"
            kw = f" | target keyword: \"{idea['target_keyword']}\"" if idea["target_keyword"] else ""
            a(f"- [{tag}] **{idea['destination']}** (score {idea['priority_score']}){kw} -- {idea['rationale']}")
        a("")

    if new_video_launch_packages is not None and new_video_launch_packages["packages"]:
        a("## New-video launch packages (auto-generated for newly detected uploads)")
        a(new_video_launch_packages["note"])
        a("")
        for pkg in new_video_launch_packages["packages"]:
            a(f"### {pkg['title']}")
            a(f"Destination: {pkg['destination']}  |  Primary keyword: {pkg['primary_keyword']}")
            a(f"Secondary keywords: {', '.join(pkg['secondary_keywords'])}")
            a("")
            a("Title options:")
            for t in pkg["title_options"]:
                a(f"- {t}")
            a("")
            a("Tags: " + ", ".join(pkg["tags"]))
            a("Hashtags: " + " ".join(pkg["hashtags"]))
            a("Thumbnail concepts: " + " / ".join(pkg["thumbnail_concepts"]))
            a("")
            a("Description:")
            a("```")
            a(pkg["description"])
            a("```")
            a("")
            a("Chapter template: " + " | ".join(pkg["chapters_template"]))
            a("Related videos to link: " + ", ".join(pkg["related_videos_to_link"]))
            a(f"Suggested internal links: {pkg['suggested_internal_links']}")
            a("Shorts ideas to promote this video:")
            for s in pkg["shorts_ideas_to_promote_this_video"]:
                a(f"- {s}")
            if pkg["recommended_publishing_optimization"]:
                po = pkg["recommended_publishing_optimization"]
                a(f"Recommended publishing day: {po['day']} (this channel's historical avg "
                  f"{po['avg_lifetime_views']} lifetime views for uploads on that day, "
                  f"n={po['sample_size']})")
            a("")

    return "\n".join(lines)
