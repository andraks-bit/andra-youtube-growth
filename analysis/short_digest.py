"""
MINIMAL Execution Digest

Short summary of:
- WORK COMPLETED TODAY
- RESULTS (views/subs gained)
- ITEMS NEEDING YOUR APPROVAL

This replaces the long analysis report. Keep it to < 1 page.
"""

import json
import os
import datetime


def generate_short_digest(execution_result, opportunity_tracking, analytics, growth_engines=None, previous_snapshot=None):
    """
    Generate minimal execution digest with key growth insights.
    Goal: one page maximum. Show what was DONE + KEY METRICS.
    """

    date_str = datetime.date.today().isoformat()

    digest = f"""
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DAILY GROWTH EXECUTION — {date_str}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 SUBSCRIBER GROWTH ENGINE
"""

    if growth_engines and growth_engines.get("subscriber_optimizer"):
        sub_opt = growth_engines["subscriber_optimizer"]
        conv_rate = sub_opt.get("channel_conversion_rate", 0)
        potential = sub_opt.get("total_subscriber_potential", 0)
        digest += f"  Conversion: {conv_rate:.1f} subs/1k views | {potential:,} subs potential from fixes\n"
    else:
        digest += "  (Analysis pending)\n"

    digest += "\n🌐 YOUTUBE DISCOVERY OPTIMIZATION\n"
    if growth_engines and growth_engines.get("discovery_optimizer"):
        disc_opt = growth_engines["discovery_optimizer"]
        browse_suggested = disc_opt.get("total_browse_suggested", 0)
        digest += f"  Browse/Suggested: {browse_suggested:.0f}% of traffic | Potential: 2x views if optimized to 50%\n"
    else:
        digest += "  (Analysis pending)\n"

    digest += "\n📹 SHORTS & DISTRIBUTION PLAN\n"
    if growth_engines and growth_engines.get("shorts_distribution"):
        shorts_opt = growth_engines["shorts_distribution"]
        clips = shorts_opt.get("clips_to_extract", 0)
        reach = shorts_opt.get("strategy_summary", {}).get("monthly_reach_potential", "Unknown")
        digest += f"  {clips} Shorts ready to extract | {reach} potential monthly reach\n"
    else:
        digest += "  (Analysis pending)\n"

    digest += "\n🧪 EXPERIMENTATION\n"
    if growth_engines and growth_engines.get("experimentation"):
        exp = growth_engines["experimentation"]
        hyps = len(exp.get("new_hypotheses_this_week", []))
        proven = len(exp.get("proven_strategies", []))
        digest += f"  {hyps} hypotheses queued | {proven} proven strategies\n"
    else:
        digest += "  (Analysis pending)\n"

    digest += "\n📱 TIKTOK @andra.kiirkivi\n"
    if growth_engines and growth_engines.get("tiktok_publisher"):
        tiktok = growth_engines["tiktok_publisher"]
        status = tiktok.get("status", "unknown")
        if status == "not_authorized":
            digest += f"  ⏳ Awaiting authorization | {tiktok.get('content_prepared', 0)} videos ready to publish\n"
        else:
            posted = tiktok.get("posted_today", 0)
            reach = tiktok.get("weekly_reach", "Unknown")
            digest += f"  ✅ Operational | Posted: {posted} today | {reach} weekly reach\n"
    else:
        digest += "  (Not yet configured)\n"

    digest += "\n⚡ WORK COMPLETED TODAY\n"

    # Show completed work
    completed = execution_result.get("internal_work_completed", [])
    if completed:
        for item in completed[:5]:
            action = item.get("action", "")
            digest += f"\n  ✅ {action}"
            if item.get("count"):
                digest += f" ({item.get('count')} items)"
    else:
        digest += "\n  (None completed yet)"

    digest += "\n\n📊 RESULTS"

    # Show metrics change
    if previous_snapshot:
        current_subs = analytics.get("channel", {}).get("subscribers", 0) if analytics else 0
        prev_subs = previous_snapshot.get("subscribers", 0)
        subs_change = current_subs - prev_subs

        digest += f"\n  Subscribers: {subs_change:+d} since yesterday"

    daily_analytics = analytics.get("daily", [])[-1] if analytics and analytics.get("daily") else {}
    if daily_analytics:
        views = daily_analytics.get("views", 0)
        if views > 0:
            digest += f"\n  Today's views: {views}"

    digest += "\n\n⏳ NEEDS YOUR APPROVAL"

    # Show approval items
    ready = execution_result.get("internal_work_ready_for_approval", [])
    if ready:
        for item in ready[:5]:
            action = item.get("action", "")
            digest += f"\n  • {action}"
    else:
        digest += "\n  (None pending)"

    # Show framework status for external integrations
    external = execution_result.get("external_integrations", {})
    creds_needed = []
    for platform, info in external.items():
        status = info.get("status", "")
        if status == "framework_ready":
            creds_needed.append(platform)

    if creds_needed:
        digest += f"\n\nℹ️  Ready to Execute (needs credentials):\n"
        for platform in creds_needed[:3]:
            digest += f"  • {platform} (waiting for API credentials)\n"

    digest += """
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Details: logs/run_log.jsonl | Full report: data/{date}/
"""

    return digest.format(date=date_str)


def send_short_digest(digest_text, recipient_email=None):
    """Send minimal digest via email (if SMTP configured) or print."""

    import os
    import smtplib
    from email.mime.text import MIMEText

    recipient = recipient_email or os.environ.get("DIGEST_RECIPIENT_EMAIL", "andra.kiirkivi@gmail.com")
    smtp_host = os.environ.get("SMTP_HOST")

    if not smtp_host:
        # No SMTP - print to stdout
        print("\n" + "=" * 60)
        print("DAILY EXECUTION DIGEST")
        print("=" * 60)
        print(digest_text)
        return False

    try:
        msg = MIMEText(digest_text, "plain")
        msg["Subject"] = f"YouTube Growth - Daily Work {datetime.date.today().isoformat()}"
        msg["From"] = os.environ.get("SMTP_USER", "noreply@youtube-growth")
        msg["To"] = recipient

        with smtplib.SMTP(smtp_host, int(os.environ.get("SMTP_PORT", "587"))) as server:
            server.starttls()
            server.login(os.environ.get("SMTP_USER"), os.environ.get("SMTP_PASSWORD"))
            server.send_message(msg)

        return True
    except Exception as e:
        print(f"Failed to send digest: {e}")
        return False
