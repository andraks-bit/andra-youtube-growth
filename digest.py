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


def generate_digest_text(weekly_report_path, pending_changes_path, run_date=None,
                        traffic_growth_actions=None):
    """
    Generate a concise digest combining:
      - Weekly report highlights (top 3 destinations, view trends, keyword gaps)
      - TOP 5 GROWTH ACTIONS (ranked by expected impact)
      - Pending proposals summary (count, key details, approval links)
      - Next actions (what to do this week)

    Args:
        weekly_report_path: Path to weekly_latest.md or similar
        pending_changes_path: Path to data/pending_changes.json
        run_date: Date string (YYYY-MM-DD). If None, today's date is used.
        traffic_growth_actions: Result dict from traffic_growth_actions.analyze() (optional)

    Returns:
        Digest text (plain text, email-safe).
    """
    if run_date is None:
        run_date = datetime.date.today().isoformat()

    weekly_md = _read_text(weekly_report_path)
    pending_state = _read_json(pending_changes_path)

    # Extract key metrics from the weekly report via regex or simple parsing.
    lines = weekly_md.split('\n')
    header = f"YouTube Growth Digest -- {run_date}\n"
    header += "=" * 50 + "\n\n"

    # Channel snapshot
    channel_section = "\n📊 CHANNEL SNAPSHOT\n"
    for line in lines:
        if "Subscribers:" in line or "Lifetime views:" in line:
            channel_section += f"  {line.strip()}\n"

    # This week vs last week (top-level trends)
    trends_section = "\n📈 THIS WEEK vs LAST WEEK\n"
    in_trends = False
    for line in lines:
        if "This week vs. last week" in line:
            in_trends = True
            continue
        if in_trends:
            if line.startswith("##") or line.startswith("- ") and ":" in line:
                if ":" in line and any(c.isdigit() for c in line):
                    trends_section += f"  {line.strip()}\n"
                if line.startswith("##"):
                    break

    # Top destinations
    dest_section = "\n🌍 TOP PRIORITY DESTINATIONS\n"
    in_dests = False
    dest_count = 0
    for line in lines:
        if "Destination priority" in line:
            in_dests = True
            continue
        if in_dests and line.startswith("- **"):
            if dest_count < 3:
                # Extract name and score from "- **Name** (score X.XXX):"
                parts = line.split("(score ")
                if len(parts) == 2:
                    name = parts[0].replace("- **", "").replace("**", "").strip()
                    score_rest = parts[1]
                    score = score_rest.split(")")[0]
                    dest_section += f"  • {name}: {score}\n"
                    dest_count += 1
            else:
                break

    # Keyword gaps
    keyword_section = "\n🔍 KEYWORD OPPORTUNITIES\n"
    for line in lines:
        if "Keyword opportunities" in line:
            # Next line should have the count
            idx = lines.index(line)
            if idx + 1 < len(lines):
                keyword_section += f"  {lines[idx + 1].strip()}\n"
            break

    # Pending proposals
    pending_section = "\n📋 PENDING APPROVALS\n"
    approved_count = 0
    pending_count = 0
    applied_count = 0
    proposals_list = []

    for p in pending_state.get("proposals", []):
        status = p.get("status", "unknown")
        if status == "approved":
            approved_count += 1
        elif status == "pending":
            pending_count += 1
        elif status == "applied":
            applied_count += 1

        if status in ("approved", "pending"):
            proposal_type = p.get("type", "unknown")
            if proposal_type == "metadata_update":
                proposals_list.append(
                    f"    Issue #{p['github_issue_number']}: {p['video_id']} -- {p['destination']}"
                )
            elif proposal_type == "playlist":
                proposals_list.append(
                    f"    Issue #{p['github_issue_number']}: Playlist '{p['playlist_title']}' -- {p['destination']}"
                )

    pending_section += f"  Approved (ready to apply): {approved_count}\n"
    pending_section += f"  Pending approval: {pending_count}\n"
    pending_section += f"  Recently applied: {applied_count}\n"

    if proposals_list:
        pending_section += "\n  Items awaiting action:\n"
        for item in proposals_list[:5]:  # Show top 5
            pending_section += f"{item}\n"
        if len(proposals_list) > 5:
            pending_section += f"    ... and {len(proposals_list) - 5} more\n"

    # TOP 5 GROWTH ACTIONS (ranked by expected impact)
    top_actions_section = "\n⭐ TOP 5 GROWTH ACTIONS THIS WEEK\n"
    if traffic_growth_actions and traffic_growth_actions.get("actions"):
        actions_list = traffic_growth_actions.get("actions", [])[:5]
        for i, action in enumerate(actions_list, 1):
            category = action.get("category", "action")
            text = action.get("text", "")
            score = action.get("score", 0)
            top_actions_section += f"  {i}. {text}\n"
            if score > 0:
                top_actions_section += f"     (Impact score: {score:.0f})\n"
    else:
        top_actions_section += "  No growth actions this week. Continue with standard optimization.\n"

    # Next actions
    actions_section = "\n✅ THIS WEEK'S ACTIONS\n"
    actions = []

    # Deduce actions from the data
    if approved_count > 0:
        actions.append(
            f"  1. Review and apply {approved_count} approved proposal(s) to YouTube."
        )
    if pending_count > 0:
        actions.append(
            f"  2. Approve or reject {pending_count} pending proposal(s) in GitHub Issues."
        )
    if keyword_section.count("(") > 0:
        actions.append(
            "  3. Use keyword opportunities to refine upcoming video titles/tags."
        )
    if not actions:
        actions.append("  • No urgent actions this week. Continue monitoring performance.")

    for action in actions:
        actions_section += f"{action}\n"

    # Footer
    footer = "\n" + "=" * 50 + "\n"
    footer += "More details: https://github.com/andraks-bit/andra-youtube-growth/issues\n"
    footer += "Full report: reports/generated/weekly_latest.md\n"

    # Combine all sections
    digest = header + channel_section + trends_section + dest_section + keyword_section + \
             top_actions_section + pending_section + actions_section + footer

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
