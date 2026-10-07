# Daily Operations Guide

**Phase 1: Automated YouTube Analysis with Approval-Only Workflow**

---

## What Happens Every Day (Automatically)

### 🌅 9:00 AM UTC
```
┌─────────────────────────────────────────┐
│  Daily Analysis Workflow Triggers       │
│  (daily-analysis.yml)                   │
└─────────────────────────────────────────┘
           │
           ├─→ Collect Channel Data
           │   ├─ Subscriber count
           │   ├─ Video catalog
           │   └─ Analytics (90-day window)
           │
           ├─→ Run Analysis Modules
           │   ├─ SEO analysis
           │   ├─ Optimization opportunities
           │   ├─ Keyword discovery
           │   ├─ Destination performance
           │   ├─ Traffic growth analysis
           │   └─ ... 10+ more analysis modules
           │
           ├─→ Generate Proposals
           │   ├─ Metadata updates (titles/descriptions/tags)
           │   └─ Playlist recommendations
           │
           ├─→ Create GitHub Issues
           │   └─ Auto-created for each proposal
           │       Status: PENDING (awaiting approval)
           │
           ├─→ Save Reports
           │   ├─ reports/generated/latest.md
           │   ├─ reports/generated/YYYY-MM-DD.md
           │   └─ data/YYYY-MM-DD/growth_analysis.json
           │
           └─→ Update Tracking
               └─ data/pending_changes.json
                   (auto-updated with GitHub sync)

⏱️  Duration: 10-30 minutes
🔒 Safety: YT_WRITES_ENABLED = OFF (no YouTube changes)
```

### 📧 Monday 9:00 AM UTC
```
┌─────────────────────────────────────────┐
│  Weekly Digest Workflow Triggers        │
│  (weekly-digest.yml)                    │
└─────────────────────────────────────────┘
           │
           ├─→ Generate Digest
           │   ├─ Channel performance summary
           │   ├─ Week vs week comparison
           │   ├─ Top destinations ranked
           │   ├─ Keyword opportunities
           │   ├─ Top 5 quick wins
           │   ├─ Approval status counts
           │   └─ Recommended actions
           │
           └─→ Send Email
               ├─ To: DIGEST_RECIPIENT_EMAIL
               ├─ Via: SMTP (if configured)
               └─ Or: Print to logs (fallback)

⏱️  Duration: 2-5 minutes
📧 Recipient: andra.kiirkivi@gmail.com (configurable)
```

---

## What to Do Every Day

### Morning Checklist (When You Wake Up)

```
☐ Check GitHub Issues
  └─ URL: https://github.com/andraks-bit/andra-youtube-growth/issues
  └─ Look for: New proposals marked "pending-approval"
  └─ Time: 2-3 minutes

☐ Review New Proposals
  └─ Read the proposal details
  └─ Verify: Current → Proposed changes
  └─ Check: Title, description, tags
  └─ Time: 5-10 minutes per proposal

☐ Decision
  └─ Click the issue
  └─ Add label: "approved" OR "rejected"
  └─ Add comment if needed
  └─ Time: 1 minute per issue

☐ Continue with Your Day
  └─ No other action needed
  └─ Status syncs automatically at 9am UTC tomorrow
```

### Typical Day (No Action Required)

```
09:00 UTC  → Workflow runs automatically (you do nothing)
Throughout day → Continue with normal activities
Any time  → Check email for weekly digest (Mondays)
Any time  → Check GitHub Issues at your convenience
           → Add "approved" or "rejected" labels
```

### Special: When Ready to Deploy

```
1. Review all "approved" proposals
   └─ Check they all look good

2. Enable YouTube writes (TEMPORARY)
   └─ export YT_WRITES_ENABLED=true

3. Run deployment script
   └─ python youtube-growth-system/deploy_approved.py

4. Monitor YouTube changes
   └─ Check that changes were applied correctly

5. Disable YouTube writes (IMMEDIATELY)
   └─ export YT_WRITES_ENABLED=false
   └─ Or just close the terminal (environment resets)

⏱️  Total time: 15-20 minutes
🔒 Safety: Writes are ONLY enabled for this manual step
```

---

## Understanding Your Daily Email (Mondays)

### Digest Email Contains:

```
📊 YouTube Growth Digest – 2026-10-03
================================================================

📈 CHANNEL PERFORMANCE
──────────────────────────────────────
Subscribers: 12,450
Lifetime views: 1,234,567
Video count: 207

What This Means:
  • Your channel size and reach
  • Used for benchmarking week-over-week

📊 GROWTH THIS WEEK vs LAST WEEK
──────────────────────────────────────
Views: +8.3% (↑ 1,245 views)
Watch time: +12.1% (↑ 3,456 hours)
Subscribers: +127 (↑ 1.0%)

What This Means:
  • Positive numbers = channel growing
  • Use to identify trending videos
  • Plan content around growth trends

🌍 TOP OPPORTUNITY DESTINATIONS
──────────────────────────────────────
1. Sydney / Australia (score 8.92)
2. Dubai (score 7.45)
3. Bali (score 6.78)
4. Marbella (score 5.21)
5. New York (score 4.89)

What This Means:
  • Where your audience wants to see more videos
  • Film in these locations for guaranteed interest
  • Plan your next video destinations here

🔍 KEYWORD & SEO OPPORTUNITIES
──────────────────────────────────────
20 real-demand keyword gaps identified
Top gap: "things to do in Sydney" (high intent, 0 videos)

What This Means:
  • Audience searches for these terms
  • You have 0 videos ranking for them
  • Opportunity to create new content
  • Or reoptimize existing videos

⭐ TOP 5 QUICK WINS THIS WEEK
──────────────────────────────────────
• Update 2 Sydney videos with SEO-optimized titles
• Create "Top 10 Sydney Attractions" playlist
• Add 3 missing destination tags to Dubai videos
• Refresh 1 video with improved thumbnail recommendations
• Publish "Things to Do in Bali" guide video

What This Means:
  • Easiest improvements to make this week
  • Ranked by impact (highest ROI first)
  • Quick to implement (30 min each)
  • Expected result: +2-5% views

📋 PROPOSAL APPROVAL STATUS
──────────────────────────────────────
✅ Approved (ready to deploy): 2
⏳ Pending your approval: 5
✓ Recently applied: 12
✗ Rejected: 1

What This Means:
  • 2 proposals waiting for you to deploy them
  • 5 proposals waiting for your approval/rejection
  • 12 were already deployed this week
  • 1 you rejected (no action)

Awaiting your action:
  Issue #23: Sydney / Australia
  Issue #24: Dubai
  Issue #25: Bali Playlist
  ... and 2 more

👉 Review & approve at: https://github.com/...

What to Do:
  • Click the GitHub link
  • Review each issue
  • Add "approved" or "rejected" label
  • Deployment happens when you enable YT_WRITES_ENABLED

✅ RECOMMENDED ACTIONS
──────────────────────────────────────
1️⃣  DEPLOY: 2 approved proposal(s) waiting to go live
2️⃣  REVIEW: 5 pending proposal(s) need your approval
3️⃣  ANALYZE: Check destination performance trends above
4️⃣  CREATE: Use keyword opportunities for next video titles
5️⃣  SCHEDULE: Plan filming for top opportunity destinations

What to Do:
  • Do these in order for maximum impact
  • Each takes 15-30 minutes
  • Together = 2-3 hours of growth work for the week

🔒 SAFETY STATUS
──────────────────────────────────────
✓ YouTube writes DISABLED
✓ No changes applied without approval
✓ All proposals tracked in GitHub

What This Means:
  • No accidental YouTube changes possible
  • You're in full control
  • Everything is reversible
```

---

## Common Scenarios & What to Do

### Scenario 1: New Proposals Generated (Every Day)

```
What Happens:
  • At 9am UTC, new GitHub Issues are created
  • Status: "pending-approval"
  • Labels: "yt-change-proposal", "pending-approval"

What to Do:
  1. Check GitHub Issues
  2. Read each proposal
  3. Verify current vs. proposed changes
  4. Add "approved" or "rejected" label
  5. Done (system handles the rest)

Expected:
  • 2-4 new proposals per day
  • Mix of metadata and playlist proposals
  • Takes 5-10 min to review all
```

### Scenario 2: You Want to Approve Proposals

```
What Happens:
  • You see a good proposal
  • Decide it's ready to deploy

What to Do:
  1. Go to GitHub Issue
  2. Click "Labels" (on the right)
  3. Select "approved"
  4. Issue status changes
  5. System tracks the change

Timeline:
  • Approved at 2pm Tuesday
  • Status syncs at 9am Wednesday (next daily run)
  • GitHub Issue = source of truth
  • data/pending_changes.json auto-updated

Deployment (Separate Step):
  • When ready: export YT_WRITES_ENABLED=true
  • Run: python deploy_approved.py
  • YouTube changes applied
  • Reset: export YT_WRITES_ENABLED=false
```

### Scenario 3: You Want to Reject Proposals

```
What Happens:
  • You see a proposal that needs changes
  • Or it's not good quality

What to Do:
  1. Go to GitHub Issue
  2. Click "Labels"
  3. Select "rejected"
  4. Add comment with feedback (optional)
  5. Done

Result:
  • Proposal is not deployed
  • System won't re-propose it
  • Video remains unchanged
  • Feedback helps system improve next time

Example Comment:
  "Good idea but the title needs to preserve 
  the original subject. Suggest: '[Original Subject] | Sydney' format"
```

### Scenario 4: Deploying Approved Proposals

```
When to Deploy:
  • You've reviewed and approved some proposals
  • You're confident in the changes
  • You want to apply them to YouTube

How to Deploy:
  1. List approved proposals
     cat data/pending_changes.json | jq '.proposals[] | select(.status=="approved")'

  2. Optional: Enable pilot mode (test 1 first)
     export YT_WRITES_PILOT_ONLY_PROPOSAL_ID="proposal_id_123"

  3. Enable YouTube writes (TEMPORARY)
     export YT_WRITES_ENABLED=true

  4. Run deployment
     cd youtube-growth-system
     python deploy_approved.py

  5. Monitor changes (check YouTube.com)
     • Verify titles updated
     • Verify descriptions updated
     • Verify tags updated

  6. Disable YouTube writes (CRITICAL)
     export YT_WRITES_ENABLED=false
     # Or just close the terminal

  7. Verify in data file
     cat data/pending_changes.json | jq '.proposals[] | select(.status=="applied")'

⏱️  Time: 15-20 minutes
✅ Result: All approved proposals deployed to YouTube
🔒 Safety: Writes automatically disabled after deployment
```

### Scenario 5: Something Went Wrong

```
If YouTube Changes Applied Incorrectly:
  1. IMMEDIATELY: Set YT_WRITES_ENABLED=false
  2. Manually revert changes on YouTube.com
  3. Review logs to understand what happened
  4. Identify root cause
  5. Fix issue in code or approval process
  6. Re-enable workflows
  7. Re-test before deploying again

If Workflow Failed:
  1. Go to GitHub Actions
  2. Select failed workflow run
  3. Download logs artifact (run_log.jsonl)
  4. Check error message
  5. Review PHASE_1_IMPLEMENTATION.md troubleshooting
  6. Common issues:
     - Missing secret: Add to GitHub Secrets
     - YouTube API error: Verify credentials
     - GitHub API error: Verify GITHUB_TOKEN
     - SMTP error: SMTP is optional (falls back to stdout)

If You Made a Mistake in Approval:
  1. Go to GitHub Issue
  2. Remove the label (e.g., remove "approved")
  3. Add new correct label
  4. Status will update at next daily run (9am UTC)
  5. No damage done (YouTube writes still disabled)
```

---

## Weekly Routine

### Monday Morning
```
☐ Read weekly digest email
  └─ Check channel growth
  └─ Review top opportunity destinations
  └─ Note quick wins to implement

☐ Review pending proposals
  └─ Go to GitHub Issues
  └─ Read each new proposal
  └─ Approve or reject

☐ Plan filming
  └─ Use top opportunity destinations
  └─ Use keyword gaps for video ideas
  └─ Schedule next week's filming
```

### Wednesday (Mid-Week Check)
```
☐ Check GitHub Issues
  └─ Review status of approved proposals
  └─ Ensure labels are correct

☐ Decide on deployment
  └─ Are you ready to deploy approved proposals?
  └─ If yes: Enable YT_WRITES_ENABLED and deploy
  └─ If no: Continue monitoring
```

### Friday (Week Wrap-Up)
```
☐ Review applied proposals
  └─ Check data/pending_changes.json
  └─ Verify deployments succeeded

☐ Check YouTube metrics
  └─ Are the changes working?
  └─ Any unexpected results?

☐ Plan next week
  └─ Content ideas
  └─ Filming locations
  └─ Video topics
```

---

## Key Things to Remember

### 🔒 Safety First
```
YT_WRITES_ENABLED = false
  ↓
  No YouTube changes happen automatically
  ↓
  Only happens when you explicitly:
    1. Export YT_WRITES_ENABLED=true
    2. Run deploy_approved.py
    3. Reset YT_WRITES_ENABLED=false
```

### ✅ Approval is Required
```
Every proposal requires:
  1. GitHub Issue created (automatic)
  2. You review the changes
  3. You add "approved" label (manual)
  4. Status syncs next daily run
  5. You enable YT_WRITES_ENABLED and deploy (manual)
  
Result: Zero accidental YouTube changes
```

### 📊 Complete Audit Trail
```
Everything is tracked:
  • GitHub Issues (public, permanent)
  • data/pending_changes.json (version-controlled)
  • logs/run_log.jsonl (daily execution logs)
  
Result: 100% transparency, 100% reversible
```

### 🚀 Fully Automated (After Approval)
```
Once you approve:
  • Status syncs automatically
  • Data persists automatically
  • Reports generated automatically
  • No manual work needed
  
Result: Efficient automation with human control
```

---

## Checklist Template

### Daily (30 seconds)
```
☐ Morning: Check email for digest (Mon only)
☐ Anytime: Check GitHub Issues
☐ If proposals present: Approve or reject
☐ That's it!
```

### Weekly (2-3 hours)
```
☐ Review digest email (30 min)
☐ Approve/reject pending proposals (30 min)
☐ Plan filming using opportunities (30 min)
☐ If ready: Deploy approved proposals (20 min)
☐ Check YouTube changes applied correctly (10 min)
☐ Plan next week's content (20 min)
```

### Monthly (Optional)
```
☐ Review all proposals applied so far (15 min)
☐ Check YouTube performance improvements (15 min)
☐ Adjust strategy based on results (15 min)
```

---

## Quick Reference

### URLs You'll Use
```
GitHub Issues:
  https://github.com/andraks-bit/andra-youtube-growth/issues

GitHub Actions:
  https://github.com/andraks-bit/andra-youtube-growth/actions

Local Reports:
  youtube-growth-system/reports/generated/latest.md
  youtube-growth-system/data/pending_changes.json
```

### Commands You Might Use
```bash
# Check pending proposals
cat youtube-growth-system/data/pending_changes.json | jq '.proposals[] | select(.status=="pending")'

# Check approved proposals (ready to deploy)
cat youtube-growth-system/data/pending_changes.json | jq '.proposals[] | select(.status=="approved")'

# Deploy approved proposals (when ready)
export YT_WRITES_ENABLED=true
python youtube-growth-system/deploy_approved.py
export YT_WRITES_ENABLED=false

# Test digest generation
python3 youtube-growth-system/test_phase1.py
```

### GitHub Labels (What They Mean)
```
yt-change-proposal      = This is a proposal issue (auto-added)
pending-approval        = Waiting for you to decide (auto-added)
approved                = You approved it (you add this)
rejected                = You rejected it (you add this)
applied                 = Successfully deployed to YouTube (auto-added)
failed                  = Deployment failed (auto-added)
```

---

## Success Indicators

### Daily Success
```
✅ Workflow runs at 9am UTC
✅ Reports generated
✅ GitHub Issues created
✅ No YouTube changes (YT_WRITES_ENABLED stays off)
```

### Weekly Success
```
✅ Digest email sent (Mon 9am UTC)
✅ 10-20 new proposals generated
✅ 5-10 proposals approved
✅ Keyword opportunities identified
✅ Top destination rankings updated
```

### Monthly Success
```
✅ 40-80 proposals generated and reviewed
✅ 20-40 proposals deployed to YouTube
✅ Channel metrics improving
✅ Video performance metrics up
✅ Subscriber growth consistent
```

---

## You're All Set!

The system runs automatically every day.

**Your only job:** Review proposals and decide yes/no.

**That's it.** Everything else is automated.

Enjoy your growing YouTube channel! 🚀
