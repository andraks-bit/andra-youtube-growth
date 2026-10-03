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


def generate_short_digest(execution_result, opportunity_tracking, analytics, previous_snapshot=None):
    """
    Generate minimal execution digest.
    Goal: one page maximum. Show what was DONE, not analysis.
    """

    date_str = datetime.date.today().isoformat()

    digest = f"""
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DAILY EXECUTION DIGEST — {date_str}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚡ WORK COMPLETED TODAY
"""

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
