"""
Daily/weekly digest that summarizes TRAFFIC GROWTH ACTIONS and pending
approval proposals, delivered to the user (email by default) so they don't
need to remember to check GitHub Issues.

Used by the scheduled-run workflow to send digests on a cadence (e.g., daily
at 9am, or weekly Monday morning).
"""
import json
import datetime
import os


def _read_json(path):
    """Read a JSON file, return {} if missing."""
    try:
        with open(path) as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def _read_text(path):
    """Read a text file, return '' if missing."""
    try:
        with open(path) as f:
            return f.read()
    except FileNotFoundError:
        return ""


def generate_digest_text(weekly_report_path, pending_changes_path, run_date=None):
    """
    Generate a comprehensive digest combining:
      - Weekly report highlights (top 3 destinations, view trends, keyword gaps)
      - Pending proposals summary (count, key details, approval links)
      - Top 5 quick wins (actionable improvements)
      - Next actions (what to do this week)

    Args:
        weekly_report_path: Path to weekly_latest.md or similar
        pending_changes_path: Path to data/pending_changes.json
        run_date: Date string (YYYY-MM-DD). If None, today's date is used.

    Returns:
        Digest text (plain text, email-safe).
    """
    if run_date is None:
        run_date = datetime.date.today().isoformat()

    weekly_md = _read_text(weekly_report_path)
    pending_state = _read_json(pending_changes_path)

    # Extract key metrics from the weekly report via regex or simple parsing.
    lines = weekly_md.split('\n')
    header = f"📊 YouTube Growth Digest – {run_date}\n"
    header += "=" * 60 + "\n\n"

    # Channel snapshot
    channel_section = "📈 CHANNEL PERFORMANCE\n"
    channel_section += "-" * 40 + "\n"
    channel_found = False
    for line in lines:
        if "Subscribers:" in line or "Lifetime views:" in line or "Video count:" in line:
            channel_section += f"{line.strip()}\n"
            channel_found = True
    if not channel_found:
        channel_section += "Channel metrics (check reports for details)\n"

    # This week vs last week (top-level trends)
    trends_section = "\n📊 GROWTH THIS WEEK vs LAST WEEK\n"
    trends_section += "-" * 40 + "\n"
    in_trends = False
    trends_found = False
    for i, line in enumerate(lines):
        if "This week vs. last week" in line:
            in_trends = True
            continue
        if in_trends:
            if line.startswith("##"):
                break
            if ":" in line and any(c.isdigit() for c in line):
                trends_section += f"{line.strip()}\n"
                trends_found = True
    if not trends_found:
        trends_section += "(Trends analyzed in full report)\n"

    # Top destinations
    dest_section = "\n🌍 TOP OPPORTUNITY DESTINATIONS\n"
    dest_section += "-" * 40 + "\n"
    in_dests = False
    dest_count = 0
    for line in lines:
        if "Destination priority" in line or "Top destination" in line:
            in_dests = True
            continue
        if in_dests and ("**" in line or "- " in line):
            if dest_count < 5:
                # Clean up and add destination
                clean_line = line.replace("- **", "").replace("**", "").strip()
                if clean_line and any(c.isalpha() for c in clean_line):
                    dest_section += f"  {dest_count + 1}. {clean_line}\n"
                    dest_count += 1
            if line.startswith("##") or (in_dests and dest_count >= 5):
                break

    # Keyword gaps
    keyword_section = "\n🔍 KEYWORD & SEO OPPORTUNITIES\n"
    keyword_section += "-" * 40 + "\n"
    keyword_found = False
    for i, line in enumerate(lines):
        if "Keyword opportunities" in line or "keyword gap" in line.lower():
            keyword_found = True
            if i + 1 < len(lines):
                next_line = lines[i + 1].strip()
                if next_line and any(c.isdigit() for c in next_line):
                    keyword_section += f"{next_line}\n"
            break
    if not keyword_found:
        keyword_section += "Check full report for keyword analysis\n"

    # Quick wins section - extract from top actions/recommendations
    quick_wins_section = "\n⭐ TOP 5 QUICK WINS THIS WEEK\n"
    quick_wins_section += "-" * 40 + "\n"
    quick_wins = []
    for i, line in enumerate(lines):
        if ("recommend" in line.lower() or "improve" in line.lower() or "optimize" in line.lower()) and len(quick_wins) < 5:
            clean_line = line.replace("- ", "").replace("**", "").strip()
            if clean_line and len(clean_line) > 10:
                quick_wins.append(f"  • {clean_line}")

    if quick_wins:
        for win in quick_wins[:5]:
            quick_wins_section += f"{win}\n"
    else:
        quick_wins_section += "  • Review and approve pending metadata proposals\n"
        quick_wins_section += "  • Check top destination performance trends\n"
        quick_wins_section += "  • Analyze keyword opportunities for new content\n"

    # Pending proposals
    pending_section = "\n📋 PROPOSAL APPROVAL STATUS\n"
    pending_section += "-" * 40 + "\n"
    approved_count = 0
    pending_count = 0
    applied_count = 0
    rejected_count = 0
    proposals_by_type = {"metadata": [], "playlist": []}

    for p in pending_state.get("proposals", []):
        status = p.get("status", "unknown")
        if status == "approved":
            approved_count += 1
        elif status == "pending":
            pending_count += 1
        elif status == "applied":
            applied_count += 1
        elif status == "rejected":
            rejected_count += 1

        if status in ("approved", "pending"):
            proposal_type = p.get("type", "unknown")
            issue_num = p.get("github_issue_number", "?")

            if proposal_type == "metadata_update":
                dest = p.get("destination", "unknown")
                proposals_by_type["metadata"].append(f"    Issue #{issue_num}: {dest}")
            elif proposal_type == "playlist":
                title = p.get("playlist_title", "unknown")
                proposals_by_type["playlist"].append(f"    Issue #{issue_num}: {title}")

    pending_section += f"  ✅ Approved (ready to deploy): {approved_count}\n"
    pending_section += f"  ⏳ Pending your approval: {pending_count}\n"
    pending_section += f"  ✓ Recently applied: {applied_count}\n"
    pending_section += f"  ✗ Rejected: {rejected_count}\n"

    if pending_count > 0 or approved_count > 0:
        pending_section += "\n  Awaiting your action:\n"
        all_proposals = proposals_by_type["metadata"] + proposals_by_type["playlist"]
        for item in all_proposals[:5]:
            pending_section += f"{item}\n"
        if len(all_proposals) > 5:
            pending_section += f"    ... and {len(all_proposals) - 5} more\n"
        pending_section += f"\n  👉 Review & approve at: https://github.com/andraks-bit/andra-youtube-growth/issues\n"

    # Next actions (prioritized)
    actions_section = "\n✅ RECOMMENDED ACTIONS\n"
    actions_section += "-" * 40 + "\n"
    actions = []

    # Priority order
    if approved_count > 0:
        actions.append(f"  1️⃣  DEPLOY: {approved_count} approved proposal(s) waiting to go live")
    if pending_count > 0:
        actions.append(f"  2️⃣  REVIEW: {pending_count} pending proposal(s) need your approval/rejection")
    actions.append(f"  3️⃣  ANALYZE: Check destination performance trends above")
    if keyword_section.count("Keyword") > 0:
        actions.append(f"  4️⃣  CREATE: Use keyword opportunities for next video titles/tags")
    actions.append(f"  5️⃣  SCHEDULE: Plan filming for top opportunity destinations")

    if actions:
        for action in actions[:5]:
            actions_section += f"{action}\n"

    # Safety status
    safety_section = "\n🔒 SAFETY STATUS\n"
    safety_section += "-" * 40 + "\n"
    safety_section += "  ✓ YouTube writes DISABLED (approval-only mode active)\n"
    safety_section += "  ✓ No changes applied without explicit approval\n"
    safety_section += "  ✓ All proposals tracked in GitHub Issues\n"

    # Footer
    footer = "\n" + "=" * 60 + "\n"
    footer += "📚 Resources:\n"
    footer += "  • Review proposals: https://github.com/andraks-bit/andra-youtube-growth/issues\n"
    footer += "  • Full report: reports/generated/weekly_latest.md\n"
    footer += "  • Daily analysis: reports/generated/latest.md\n"

    # Combine all sections
    digest = (header + channel_section + trends_section + dest_section + keyword_section +
              quick_wins_section + pending_section + actions_section + safety_section + footer)

    return digest


def send_digest_email(digest_text, recipient_email, smtp_host=None, smtp_port=None,
                      smtp_user=None, smtp_password=None):
    """
    Send the digest via email.

    Falls back to printing to stdout if SMTP is not configured (for local testing).

    Args:
        digest_text: The digest body (plain text)
        recipient_email: Email address to send to
        smtp_host: SMTP server hostname (default: env SMTP_HOST)
        smtp_port: SMTP port (default: env SMTP_PORT or 587)
        smtp_user: SMTP username (default: env SMTP_USER)
        smtp_password: SMTP password (default: env SMTP_PASSWORD)

    Returns:
        True if sent successfully; False if skipped (not configured).
    """
    smtp_host = smtp_host or os.environ.get("SMTP_HOST")
    smtp_port = smtp_port or int(os.environ.get("SMTP_PORT", "587"))
    smtp_user = smtp_user or os.environ.get("SMTP_USER")
    smtp_password = smtp_password or os.environ.get("SMTP_PASSWORD")

    if not smtp_host:
        # No SMTP configured; print to stdout (for local testing)
        print("=" * 60)
        print("DIGEST (email not configured, printing to stdout)")
        print("=" * 60)
        print(digest_text)
        return False

    try:
        import smtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart

        msg = MIMEMultipart()
        msg["From"] = smtp_user
        msg["To"] = recipient_email
        msg["Subject"] = "YouTube Growth Digest"

        msg.attach(MIMEText(digest_text, "plain"))

        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.send_message(msg)

        return True

    except Exception as e:
        print(f"Failed to send digest email: {e}")
        return False


if __name__ == "__main__":
    # For local testing: generate and print a digest
    digest = generate_digest_text(
        "reports/generated/weekly_latest.md",
        "data/pending_changes.json",
    )
    print(digest)
