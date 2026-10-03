# Weekly Digest Delivery Setup

The YouTube Growth System can send you a **weekly digest** every Monday morning (09:00 UTC) summarizing:
- Channel performance trends (views, watch time, subscribers)
- Top priority destinations
- Keyword opportunities
- Pending approvals awaiting your action

## Enabling Digest Delivery

### Option 1: Email (Recommended)

#### Using Gmail with App Password (easiest)

1. **Generate a Gmail App Password:**
   - Enable 2-factor authentication on your Google account
   - Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
   - Select "Mail" and "Windows Computer"
   - Copy the generated 16-character password

2. **Add GitHub Actions Secrets:**
   - Go to Settings → Secrets and variables → Actions → Secrets
   - Add the following secrets:
     - `DIGEST_RECIPIENT_EMAIL`: Your email (e.g., `andra.kiirkivi@gmail.com`)
     - `SMTP_HOST`: `smtp.gmail.com`
     - `SMTP_PORT`: `587`
     - `SMTP_USER`: Your Gmail address (e.g., `andra.kiirkivi@gmail.com`)
     - `SMTP_PASSWORD`: The 16-character App Password from step 1

3. **Verify:** The next Monday at 09:00 UTC, the digest will be sent to your email.

#### Using Another Email Provider

Configure similar secrets for your SMTP provider:
- **Outlook/Hotmail:** `smtp-mail.outlook.com` port 587
- **Yahoo:** `smtp.mail.yahoo.com` port 587
- **Custom server:** Use your provider's SMTP hostname and port

### Option 2: Print to Console (for testing/local runs)

If no SMTP config is set, the digest will print to stdout when triggered by `SEND_DIGEST=1`.

```bash
SEND_DIGEST=1 python run_daily.py
```

## What's in the Digest

### Channel Snapshot
- Current subscriber count
- Total lifetime views

### Week-over-Week Comparison
- Views, watch time, and subscriber changes
- Traffic source breakdown (YouTube Search, Suggested videos, Browse, etc.)

### Top Priority Destinations
- The 3 highest-priority destinations based on:
  - Average 90-day views
  - Average retention percentage
  - Unmet keyword demand
  - View momentum (growing vs. declining)

### Keyword Opportunities
- Count of proven search keywords not yet in any video
- Actionable keywords to incorporate into upcoming videos

### Pending Approvals
- Count of approved proposals ready to apply
- Count of pending proposals awaiting your approval
- Recent GitHub Issue links to review/approve

### This Week's Actions
- Prioritized list of what to do this week:
  - Apply approved changes if any
  - Review pending proposals
  - Incorporate new keywords into video metadata

## Manual Digest Generation

To generate a digest without sending (for review):

```bash
python digest.py
```

## Scheduling

- **Default:** Every **Monday at 09:00 UTC** (after the daily run completes)
- The digest pulls data from the latest weekly report (`reports/generated/weekly_latest.md`)
- To change the schedule, edit `.github/workflows/youtube-growth.yml` and modify the digest trigger logic

## Customization

### Change Recipient Email (without editing secrets)

The system defaults to `andra.kiirkivi@gmail.com` if `DIGEST_RECIPIENT_EMAIL` is not set. To change it:
1. Add/update the `DIGEST_RECIPIENT_EMAIL` secret in GitHub Actions

### Change Digest Frequency

Edit `.github/workflows/youtube-growth.yml`:
- Currently sends **Monday only** (line with `date -u +%w` check)
- Change the condition to send **daily** or **every Friday**, etc.

Example: Daily digest (change step "Determine if Monday"):
```yaml
      - name: Determine if should send digest
        id: check_send_digest
        run: echo "send_digest=true" >> $GITHUB_OUTPUT
```

### Modify Digest Content

Edit `digest.py`:
- `generate_digest_text()`: Change what metrics are highlighted
- `send_digest_email()`: Customize email subject, formatting, signature

## Troubleshooting

### Digest not arriving?

1. **Check workflow run logs:**
   - Go to Actions → YouTube Growth System (Andra Kiirkivi) → Latest run
   - Look for "Run growth system" step → see if digest was sent

2. **Check SMTP credentials:**
   - Test locally: `SMTP_HOST=smtp.gmail.com SMTP_PORT=587 SMTP_USER=your@gmail.com SMTP_PASSWORD=xxxx python digest.py`
   - Verify all secrets are set in GitHub (Settings → Secrets)

3. **Gmail-specific issues:**
   - If using a Gmail account, ensure you used an App Password (not your regular password)
   - Allow "Less secure apps" if not using App Passwords

### Digest content looks wrong?

- Digest pulls from `reports/generated/weekly_latest.md`
- If the report is missing or incomplete, the digest will show limited data
- Check that `run_daily.py` completed successfully (see workflow logs)

## Example Digest Output

```
YouTube Growth Digest -- 2026-10-02
==================================================

📊 CHANNEL SNAPSHOT
  - Subscribers: 143
  - Lifetime views: 87380

📈 THIS WEEK vs LAST WEEK
  - Views: 36 vs 220 (-83.6%)
  - Watch time: 47 min vs 237 min (-80.2%)

🌍 TOP PRIORITY DESTINATIONS
  • Marbella / Puerto Banus: 0.913
  • Sydney / Australia: 0.746
  • Dubai: 0.492

📋 PENDING APPROVALS
  Approved (ready to apply): 0
  Pending approval: 4
  Recently applied: 1

  Items awaiting action:
    Issue #5: AynTk_WorY8 -- Sydney / Australia
    Issue #6: 0jNKETzdNY0 -- Dubai
    ...
```
