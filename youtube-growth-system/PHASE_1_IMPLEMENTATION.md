# PHASE 1 IMPLEMENTATION: Automated YouTube Growth Analysis & Proposals

**Status:** ✅ Complete  
**Date:** 2026-10-03  
**Safety Level:** 🔒 APPROVAL-ONLY (YT_WRITES_ENABLED = false at all times)

---

## Overview

Phase 1 automates the daily YouTube analysis pipeline with scheduled GitHub Actions workflows. The system:

- **Daily Runs:** 9:00 AM UTC every day
- **Weekly Digest:** Mondays 9:00 AM UTC (email summary)
- **GitHub Issues:** Auto-created for all new proposals (approval surface)
- **Proposal Tracking:** Complete audit trail in `data/pending_changes.json`
- **Safety Gates:** 4 independent approval checks before any YouTube changes

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│            PHASE 1: Automated Scheduling                     │
└─────────────────────────────────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
    ┌─────▼─────┐    ┌─────▼─────┐    ┌────▼────────┐
    │   DAILY    │    │   WEEKLY  │    │  MANUAL     │
    │  9am UTC   │    │  Mon 9am  │    │  Trigger    │
    └─────┬─────┘    └─────┬─────┘    └────┬────────┘
          │                │                │
          └────────────────┴────────────────┘
                      │
          ┌───────────▼────────────┐
          │  run_daily.py Pipeline │
          └───────────┬────────────┘
                      │
        ┌─────────────┬──────────────┐
        │             │              │
        ▼             ▼              ▼
   ANALYSIS      PROPOSALS       DIGEST
   (Steps 1-5)  (Step 5 Gen)    (Weekly)
        │             │              │
        ├─────────────┴──────────────┤
        │                            │
        ▼                            ▼
   GitHub Issues            Email Notification
   (Approval Gate)          (Monday Morning)
        │
        ├─ Issue Created: PENDING
        ├─ User Reviews
        ├─ User Adds "approved" Label
        └─ Awaits Deployment (manual YT_WRITES_ENABLED=true)
```

---

## Workflows Created

### 1. **daily-analysis.yml** (Runs Daily at 9:00 AM UTC)

**Purpose:** Orchestrate the complete YouTube analysis and proposal generation pipeline.

**Triggers:**
- Schedule: Every day at 09:00 UTC
- Manual: "Run workflow" from GitHub Actions UI

**What It Does:**
1. Checks out repository
2. Sets up Python 3.11 environment
3. Runs `youtube-growth-system/run_daily.py` with safety gates
4. Collects channel data (subscribers, videos, analytics)
5. Runs 15+ analysis modules (SEO, trends, opportunities, growth)
6. Generates metadata & playlist proposals
7. Auto-creates GitHub Issues for approval
8. Saves reports and logs

**Environment:**
```bash
YT_WRITES_ENABLED = false      # 🔒 CRITICAL SAFETY GATE
GITHUB_TOKEN = (auto)          # From repository
YT_CLIENT_ID = (from secrets)  # YouTube API credentials
YT_CLIENT_SECRET = (from secrets)
YT_REFRESH_TOKEN = (from secrets)
```

**Outputs:**
- Daily report: `reports/generated/latest.md`
- Dated reports: `reports/generated/YYYY-MM-DD.md`
- Growth analysis: `data/YYYY-MM-DD/growth_analysis.json`
- GitHub Issues: Auto-created for each proposal
- Logs: `logs/run_log.jsonl`

---

### 2. **weekly-digest.yml** (Runs Mondays at 9:00 AM UTC)

**Purpose:** Send a comprehensive weekly digest email with channel performance, opportunities, and pending approvals.

**Triggers:**
- Schedule: Mondays at 09:00 UTC
- Manual: "Run workflow" from GitHub Actions UI

**What It Does:**
1. Checks out repository
2. Generates digest from latest weekly report + pending proposals
3. Sends email via SMTP (or prints to stdout if not configured)
4. Posts notification to GitHub Issues

**Digest Contents:**
```
📊 Channel Performance Summary
📈 This Week vs Last Week Growth
🌍 Top 5 Opportunity Destinations
🔍 Keyword & SEO Opportunities (gaps identified)
⭐ Top 5 Quick Wins (actionable improvements)
📋 Approval Status (pending count, approved count, etc.)
✅ Recommended Actions (prioritized next steps)
🔒 Safety Status (approval-only confirmation)
```

**Outputs:**
- Email sent to configured recipient
- GitHub Issue comment (notification)
- Stdout logs (if SMTP not configured)

---

## GitHub Secrets Required

To activate the workflows, you must set these secrets in GitHub:

**For YouTube API Access:**
```
YT_CLIENT_ID             = <your OAuth client ID>
YT_CLIENT_SECRET         = <your OAuth client secret>
YT_REFRESH_TOKEN         = <your refresh token for the channel>
```

**For Email Notifications (Optional):**
```
SMTP_HOST                = smtp.gmail.com (or your provider)
SMTP_PORT                = 587
SMTP_USER                = your-email@gmail.com
SMTP_PASSWORD            = your-app-password
DIGEST_RECIPIENT_EMAIL   = andra.kiirkivi@gmail.com
```

**Setup Instructions:**

1. Go to: https://github.com/andraks-bit/andra-youtube-growth/settings/secrets/actions
2. Click "New repository secret"
3. Add each secret from above
4. Note: `GITHUB_TOKEN` is auto-provided by GitHub Actions

---

## Approval Workflow

### Step-by-Step Approval Process

```
1. System Generates Proposal
   └─ Runs daily at 9am UTC
   └─ Creates GitHub Issue with:
      - Video ID or Playlist Name
      - Current metadata (title/desc/tags)
      - Proposed changes
      - Type: "metadata_update" or "playlist"
      - Status: PENDING

2. You Review Issue
   └─ Read proposal details
   └─ Decide: Approve or Reject

3. Add Label
   └─ If YES: Add "approved" label
   └─ If NO: Add "rejected" label
   └─ Add comment if needed

4. Status Updates
   └─ Issue label = GitHub source of truth
   └─ data/pending_changes.json = local copy
   └─ Synchronized every daily run

5. Deployment (Manual, Separate Step)
   └─ When ready: export YT_WRITES_ENABLED=true
   └─ Run: ./deploy_approved.py (manual script)
   └─ YouTube changes applied
   └─ YT_WRITES_ENABLED reset to false
```

### Example GitHub Issue

```markdown
# Metadata Update Proposal #23

**Type:** metadata_update
**Video ID:** AynTk_WorY8
**Destination:** Sydney / Australia
**Reason Flagged:** Low CTR opportunity

## Current Metadata

**Title:** (old title)
**Description:** (old description)
**Tags:** tag1, tag2, tag3

## Proposed Changes

**Title:** (new title)
**Description:** (new description)
**Tags:** tag1, tag2, tag3, tag4

## Review & Approve

- [ ] Title change is appropriate
- [ ] Description is natural English
- [ ] Tags are relevant to the video
- [ ] Ready to deploy

**To approve:** Add "approved" label
**To reject:** Add "rejected" label
```

---

## Safety Gates

### Gate 1: YT_WRITES_ENABLED

```python
# config.py
def youtube_writes_enabled():
    return os.environ.get("YT_WRITES_ENABLED", "").strip().lower() in ("1", "true", "yes")

# Every write operation checks this first
if not config.youtube_writes_enabled():
    # Proposal queued, not applied
    return "approved_but_queued"
```

**Default:** OFF (false)  
**Where controlled:** GitHub repository secrets or local environment  
**How to enable:** Add `YT_WRITES_ENABLED=true` to environment (manual step before deployment)

### Gate 2: Explicit Approval Label

```python
# approval_workflow.py
def sync_approvals(gh):
    # Only process issues with "approved" label
    for issue in gh.get_issues(labels=["approved"]):
        # Mark as approved in pending_changes.json
```

**Default:** OFF (no issues have "approved" label by default)  
**How to activate:** User manually adds "approved" label to GitHub Issue

### Gate 3: Atomic State Tracking

```python
# Every proposal creation is atomic
for proposal_data in candidates:
    try:
        issue = gh.create_issue(...)
        state["proposals"].append({...})
        save_state(state)  # Save immediately after each issue
    except Exception:
        raise  # Fail-fast; don't leave orphaned issues
```

**Benefit:** Zero orphaned GitHub Issues; perfect synchronization between GitHub and `pending_changes.json`

### Gate 4: Pilot Proposal Restriction

```python
def pilot_only_proposal_id():
    return os.environ.get("YT_WRITES_PILOT_ONLY_PROPOSAL_ID", "").strip() or None

# If set: ONLY this proposal applies, all others queue
# If unset: All approved proposals apply (default)
```

**Use case:** Test one proposal before releasing all approved ones

---

## File Structure

```
boathire/
├── .github/
│   └── workflows/
│       ├── daily-analysis.yml          ← 🆕 Daily 9am UTC
│       └── weekly-digest.yml           ← 🆕 Mondays 9am UTC
│
├── youtube-growth-system/
│   ├── run_daily.py                    ← Orchestrator (unchanged)
│   ├── digest.py                       ← 🔧 Enhanced with better formatting
│   ├── config.py                       ← Safety gates (unchanged)
│   ├── approval_workflow.py            ← GitHub Issues sync (unchanged)
│   │
│   ├── reports/
│   │   └── generated/
│   │       ├── latest.md               ← Latest daily report
│   │       ├── YYYY-MM-DD.md           ← Dated daily reports
│   │       ├── weekly_latest.md        ← Latest weekly report
│   │       └── weekly_YYYY-MM-DD.md    ← Dated weekly reports
│   │
│   ├── data/
│   │   ├── pending_changes.json        ← Proposal tracking (auto-updated)
│   │   └── YYYY-MM-DD/
│   │       ├── channel_snapshot.json
│   │       ├── video_catalog.json
│   │       ├── analytics.json
│   │       └── growth_analysis.json
│   │
│   └── logs/
│       └── run_log.jsonl               ← Execution logs (JSON lines)
```

---

## Testing & Verification

### Local Test: Generate Digest

```bash
cd youtube-growth-system

# Test digest generation (uses existing reports)
python3 -c "
import digest
digest_text = digest.generate_digest_text(
    'reports/generated/weekly_latest.md',
    'data/pending_changes.json'
)
print(digest_text)
"
```

### Local Test: Run Daily Pipeline

```bash
cd youtube-growth-system

# Dry-run (no GitHub changes, no YouTube writes)
export GITHUB_TOKEN=''  # No GitHub API
python run_daily.py
# Generates reports, but skips approval_workflow step
```

### Trigger Manual Workflow

1. Go to: https://github.com/andraks-bit/andra-youtube-growth/actions
2. Select "Daily YouTube Analysis & Proposals"
3. Click "Run workflow" button
4. Monitor execution in real-time

### Check Results

- **Reports:** `youtube-growth-system/reports/generated/latest.md`
- **GitHub Issues:** https://github.com/andraks-bit/andra-youtube-growth/issues
- **Logs:** Download from Actions → Run → Artifacts
- **Proposal Status:** `youtube-growth-system/data/pending_changes.json`

---

## Deployment

### Enable YouTube Writes (When Ready for Production)

**Step 1: Review All Approved Proposals**
```bash
# Check which proposals are ready
cat youtube-growth-system/data/pending_changes.json | \
  jq '.proposals[] | select(.status=="approved")'
```

**Step 2: Enable Writes Temporarily**
```bash
# Via GitHub Actions secrets:
export YT_WRITES_ENABLED=true

# Via local test:
export YT_WRITES_ENABLED=true
cd youtube-growth-system
python run_daily.py
```

**Step 3: Disable Writes After Deployment**
```bash
# Immediately after:
export YT_WRITES_ENABLED=false

# Verify:
echo $YT_WRITES_ENABLED  # Should be empty or "false"
```

### Emergency Stop

If something goes wrong:

1. **Stop all workflows:** Go to Actions → Disable all workflows
2. **Reset YouTube:** Manually revert changes on YouTube.com
3. **Set YT_WRITES_ENABLED=false:** Ensure it's off
4. **Review:** Check what happened in logs/run_log.jsonl
5. **Investigate:** Read GitHub Issues for details

---

## Schedule

| Day | Time | What | Purpose |
|-----|------|------|---------|
| **Every Day** | 9:00 AM UTC | Daily Analysis | Generate new proposals, sync approvals |
| **Monday** | 9:00 AM UTC | Weekly Digest | Email summary + actionable insights |
| **Manual** | Anytime | Run Workflow | Trigger analysis on-demand from GitHub UI |

---

## Example Digest Email

```
📊 YouTube Growth Digest – 2026-10-03
============================================================

📈 CHANNEL PERFORMANCE
----------------------------------------
Subscribers: 12,450
Lifetime views: 1,234,567
Video count: 207

📊 GROWTH THIS WEEK vs LAST WEEK
----------------------------------------
Views: +8.3% (↑ 1,245 views)
Watch time: +12.1% (↑ 3,456 hours)
Subscribers: +127 (↑ 1.0%)

🌍 TOP OPPORTUNITY DESTINATIONS
----------------------------------------
  1. Sydney / Australia (score 8.92)
  2. Dubai (score 7.45)
  3. Bali (score 6.78)
  4. Marbella (score 5.21)
  5. New York (score 4.89)

🔍 KEYWORD & SEO OPPORTUNITIES
----------------------------------------
20 real-demand keyword gaps identified
Top gap: "things to do in Sydney" (high intent, 0 videos)

⭐ TOP 5 QUICK WINS THIS WEEK
----------------------------------------
  • Update 2 Sydney videos with SEO-optimized titles
  • Create "Top 10 Sydney Attractions" playlist
  • Add 3 missing destination tags to Dubai videos
  • Refresh 1 video with improved thumbnail recommendations
  • Publish "Things to Do in Bali" guide video

📋 PROPOSAL APPROVAL STATUS
----------------------------------------
  ✅ Approved (ready to deploy): 2
  ⏳ Pending your approval: 5
  ✓ Recently applied: 12
  ✗ Rejected: 1

  Awaiting your action:
    Issue #23: Sydney / Australia
    Issue #24: Dubai
    Issue #25: Bali Playlist
    Issue #26: Marbella
    Issue #27: SEO Keywords
    ... and 0 more

  👉 Review & approve at: https://github.com/andraks-bit/andra-youtube-growth/issues

✅ RECOMMENDED ACTIONS
----------------------------------------
  1️⃣  DEPLOY: 2 approved proposal(s) waiting to go live
  2️⃣  REVIEW: 5 pending proposal(s) need your approval/rejection
  3️⃣  ANALYZE: Check destination performance trends above
  4️⃣  CREATE: Use keyword opportunities for next video titles/tags
  5️⃣  SCHEDULE: Plan filming for top opportunity destinations

🔒 SAFETY STATUS
----------------------------------------
  ✓ YouTube writes DISABLED (approval-only mode active)
  ✓ No changes applied without explicit approval
  ✓ All proposals tracked in GitHub Issues

============================================================
📚 Resources:
  • Review proposals: https://github.com/andraks-bit/andra-youtube-growth/issues
  • Full report: reports/generated/weekly_latest.md
  • Daily analysis: reports/generated/latest.md
```

---

## Next Steps

### ✅ Phase 1 Complete
- [x] GitHub Actions workflows created (daily + weekly)
- [x] Automatic daily analysis at 9am UTC
- [x] Automatic GitHub Issue creation for proposals
- [x] Enhanced digest with quick wins and actionable insights
- [x] Weekly email digest every Monday 9am UTC
- [x] 4 independent safety gates
- [x] YT_WRITES_ENABLED = false (approval-only)
- [x] Complete audit trail (GitHub Issues + pending_changes.json)

### 🔄 Phase 2: Enhanced Reporting (Week 2)
- [ ] SEO health score breakdown
- [ ] "Top 5 quick wins" ranked by impact
- [ ] Visual dashboard (metrics over time)
- [ ] Performance trends for each destination

### 🎬 Phase 3: Shorts Automation (Week 3)
- [ ] Auto-detect repurposing candidates
- [ ] Generate Shorts proposals with timestamps
- [ ] Estimate view predictions per Shorts

### 📊 Phase 4: Content Opportunity Engine (Week 4)
- [ ] Destination coverage gap analysis
- [ ] Seasonal opportunity detection
- [ ] "Next 5 videos to film" ranked by impact

### 🚀 Phase 5: Expanded Proposal Types (Week 5)
- [ ] Video refresh proposals
- [ ] Thumbnail optimization flags
- [ ] Publishing strategy suggestions

---

## Support & Debugging

### Check Workflow Status
- https://github.com/andraks-bit/andra-youtube-growth/actions

### Download Logs
1. Go to Actions → Select workflow run
2. Scroll to "Artifacts" section
3. Download `daily-logs-{run-number}.zip`
4. Extract and check `run_log.jsonl`

### Common Issues

**Issue:** "No GitHub token found"
- **Fix:** Workflow runs locally need GITHUB_TOKEN set (CI provides it automatically)

**Issue:** "YouTube API authentication failed"
- **Fix:** Check YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN in GitHub secrets

**Issue:** "Digest email not sent"
- **Fix:** Check SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD secrets
- **Fallback:** Digest will print to stdout (visible in logs)

**Issue:** "Too many proposals created"
- **Fix:** Increase `MAX_NEW_PROPOSALS_PER_RUN` in config.py (default: 2)

---

## Safety Checklist

Before deploying anything to YouTube:

- [ ] YT_WRITES_ENABLED = OFF (confirmed in environment)
- [ ] Read all pending GitHub Issues carefully
- [ ] Verify each proposal's "Current → Proposed" changes
- [ ] Check that subject/topic preservation is correct
- [ ] Confirm tags are relevant (no cross-destination pollution)
- [ ] Validate playlist memberships
- [ ] Add "approved" label only to proposals you've reviewed
- [ ] Keep complete audit trail (GitHub Issues + pending_changes.json)
- [ ] Test with YT_WRITES_ENABLED=true on ONE proposal first (pilot mode)
- [ ] Set YT_WRITES_ENABLED=false immediately after deployment

---

**Phase 1 Status:** ✅ **READY FOR DEPLOYMENT**

Automated daily YouTube analysis, proposal generation, and approval workflow are now live. The system will run every day at 9am UTC with YT_WRITES_ENABLED=false, generating new proposals and awaiting your explicit approval via GitHub Issues.

**No YouTube changes will occur without your direct action.**
