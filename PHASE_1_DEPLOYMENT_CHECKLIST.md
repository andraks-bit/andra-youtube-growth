# Phase 1 Deployment Checklist

**Automated YouTube Growth System**  
**Status:** ✅ READY FOR DEPLOYMENT  
**Date:** 2026-10-03

---

## Pre-Deployment Verification

### Architecture Verification
- [x] Daily Analysis Workflow created (`daily-analysis.yml`)
- [x] Weekly Digest Workflow created (`weekly-digest.yml`)
- [x] Enhanced digest generator implemented (`digest.py`)
- [x] Phase 1 test suite created and passing (7/7 tests)
- [x] Safety gates verified (4 independent approval checks)
- [x] Proposal tracking implemented (`pending_changes.json`)
- [x] GitHub Issue automation configured

### Safety Verification
- [x] YT_WRITES_ENABLED = OFF by default (CRITICAL)
- [x] No YouTube changes possible without explicit approval
- [x] All proposals tracked in GitHub Issues + JSON
- [x] Atomic state tracking (no orphaned issues)
- [x] Pilot proposal mode available for testing
- [x] Complete audit trail maintained

### Test Results
```
✅ Digest Generation ........... PASS
✅ Safety Gates ................ PASS
✅ Proposal Tracking ........... PASS
✅ GitHub Issue Structure ...... PASS
✅ Workflow Schedules .......... PASS
✅ Email Configuration ......... PASS (optional)
✅ Approval Workflow ........... PASS
```

---

## Pre-Deployment Steps (DO THESE FIRST)

### Step 1: Verify GitHub Repository Setup
- [ ] Repository exists: `andraks-bit/andra-youtube-growth`
- [ ] Repository is accessible from this machine
- [ ] Git push permissions verified
- [ ] GitHub branch protection rules configured (if any)

**Verification Command:**
```bash
cd /Users/nunnu/Desktop/boathire
git remote -v  # Should show GitHub remote
git status     # Should show working tree clean or with minimal changes
```

### Step 2: Gather Required Secrets

**YouTube API Credentials:**
- [ ] YT_CLIENT_ID (from Google Cloud Console)
- [ ] YT_CLIENT_SECRET (from Google Cloud Console)
- [ ] YT_REFRESH_TOKEN (from local token file)

**Email Configuration (Optional but Recommended):**
- [ ] SMTP_HOST (e.g., smtp.gmail.com)
- [ ] SMTP_PORT (e.g., 587)
- [ ] SMTP_USER (your email address)
- [ ] SMTP_PASSWORD (app-specific password for Gmail)
- [ ] DIGEST_RECIPIENT_EMAIL (your email)

**Reference:** See `GITHUB_SECRETS_SETUP.md` for detailed instructions

### Step 3: Commit Phase 1 Files

```bash
cd /Users/nunnu/Desktop/boathire

# Stage all Phase 1 files
git add .github/workflows/daily-analysis.yml
git add .github/workflows/weekly-digest.yml
git add youtube-growth-system/PHASE_1_IMPLEMENTATION.md
git add youtube-growth-system/test_phase1.py
git add youtube-growth-system/digest.py

# Verify what will be committed
git status

# Create commit
git commit -m "Phase 1: Implement automated daily analysis and weekly digest with approval-only workflow

- Add daily-analysis.yml (runs 9am UTC daily)
- Add weekly-digest.yml (runs Mondays 9am UTC)
- Enhance digest.py with better formatting and quick wins
- Add PHASE_1_IMPLEMENTATION.md (comprehensive documentation)
- Add test_phase1.py (7 verification tests, all passing)
- GitHub Issues auto-created for all proposals
- All proposals tracked in pending_changes.json
- YT_WRITES_ENABLED = false (approval-only mode)"
```

---

## Deployment Steps (IN ORDER)

### Step 1: Add GitHub Secrets

**URL:** https://github.com/andraks-bit/andra-youtube-growth/settings/secrets/actions

**Required Secrets:**
```
Name                         Value
────────────────────────────────────────────────────────────
YT_CLIENT_ID                 (from Google Cloud)
YT_CLIENT_SECRET             (from Google Cloud)
YT_REFRESH_TOKEN             (from local token file)
```

**Optional but Recommended:**
```
SMTP_HOST                    smtp.gmail.com
SMTP_PORT                    587
SMTP_USER                    your-email@gmail.com
SMTP_PASSWORD                (app-specific password)
DIGEST_RECIPIENT_EMAIL       andra.kiirkivi@gmail.com
```

**Verification:**
- [ ] All secrets entered correctly
- [ ] No typos in secret names
- [ ] Secrets are not visible in repository code

### Step 2: Push Code to GitHub

```bash
cd /Users/nunnu/Desktop/boathire
git push origin main  # or current branch
```

**Verify:**
- [ ] Code pushed successfully to GitHub
- [ ] No merge conflicts
- [ ] GitHub Actions workflows are visible at: https://github.com/andraks-bit/andra-youtube-growth/actions

### Step 3: Verify Workflows in GitHub Actions

**URL:** https://github.com/andraks-bit/andra-youtube-growth/actions

**Check:**
- [ ] "Daily YouTube Analysis & Proposals" workflow is visible
- [ ] "Weekly Growth Digest Email" workflow is visible
- [ ] Both show as "Active" (not disabled)
- [ ] Workflow files have green checkmarks (valid YAML)

### Step 4: Manual Test Run

**Trigger:**
1. Go to: https://github.com/andraks-bit/andra-youtube-growth/actions
2. Select: "Daily YouTube Analysis & Proposals"
3. Click: "Run workflow" → "Run workflow" (green button)

**Monitor:**
- [ ] Workflow starts in < 1 minute
- [ ] Workflow completes in < 30 minutes
- [ ] Check for any errors in logs
- [ ] Verify artifacts are generated:
  - `daily-logs-{run-number}.zip`
  - `daily-reports-{run-number}.zip`

**Expected Outputs:**
- [ ] New GitHub Issues created (check https://github.com/andraks-bit/andra-youtube-growth/issues)
- [ ] Daily report generated: `reports/generated/latest.md`
- [ ] Run log generated: `logs/run_log.jsonl`
- [ ] Proposal tracking updated: `data/pending_changes.json`

### Step 5: Verify GitHub Issues

**URL:** https://github.com/andraks-bit/andra-youtube-growth/issues

**Check:**
- [ ] New proposals appear as GitHub Issues
- [ ] Each issue has labels: `yt-change-proposal`, `pending-approval`
- [ ] Each issue shows: Type, Video ID, Current → Proposed changes
- [ ] Issues are readable and actionable

**Example Issue Structure:**
```
Title: Metadata Update Proposal #23
Labels: yt-change-proposal, pending-approval
Body:
  - Type: metadata_update
  - Video ID: AynTk_WorY8
  - Destination: Sydney / Australia
  - Current Title: ...
  - Proposed Title: ...
  - Current Tags: ...
  - Proposed Tags: ...
```

### Step 6: Verify Proposal Tracking

**File:** `youtube-growth-system/data/pending_changes.json`

**Check:**
- [ ] File exists and is readable
- [ ] Contains new proposals from test run
- [ ] Each proposal has: proposal_id, github_issue_number, status, type
- [ ] Status values are valid: pending, approved, rejected, applied

### Step 7: Review Digest Email (Optional)

**For Digest Testing:**

1. Manually trigger weekly digest workflow:
   - Go to Actions → "Weekly Growth Digest Email"
   - Click "Run workflow"

2. Check output:
   - [ ] Digest generated successfully
   - [ ] If SMTP configured: Email sent (check inbox)
   - [ ] If SMTP not configured: Digest printed to logs

**Expected Digest Contents:**
- Channel Performance Summary
- This Week vs Last Week Growth
- Top 5 Opportunity Destinations
- Keyword & SEO Opportunities
- Top 5 Quick Wins
- Approval Status (pending/approved/applied count)
- Recommended Actions (prioritized next steps)

---

## Post-Deployment Verification

### Week 1 Monitoring

**Day 1:**
- [ ] First scheduled daily run at 09:00 UTC
- [ ] GitHub Issues created for new proposals
- [ ] Reports generated in `reports/generated/`
- [ ] No errors in workflow logs

**Day 5:**
- [ ] Multiple daily runs completed successfully
- [ ] Proposal status tracking is accurate
- [ ] New proposals queued for approval

**Week 1 Summary:**
- [ ] At least 1 week of daily runs completed
- [ ] 2-4 new proposals generated
- [ ] All safety gates working correctly
- [ ] YT_WRITES_ENABLED confirmed OFF at all times

### First Approval Test

**When Ready:**

1. **Select One Proposal to Approve**
   - Review GitHub Issue thoroughly
   - Verify "Current → Proposed" changes
   - Check subject preservation
   - Verify tags are relevant

2. **Add "approved" Label**
   - Go to GitHub Issue
   - Click "Labels"
   - Select "approved"
   - Issue status changes to "approved"

3. **Monitor Status Sync**
   - Wait for next daily run (9 AM UTC)
   - Check `pending_changes.json`
   - Verify proposal status updated to "approved"
   - GitHub Issue label = source of truth

4. **Deploy (Manual Step)**
   - When satisfied with approved proposals:
   - Set environment: `export YT_WRITES_ENABLED=true`
   - Run: `python youtube-growth-system/deploy_approved.py`
   - Verify YouTube changes were applied
   - Reset: `export YT_WRITES_ENABLED=false`

---

## Scheduled Runs

### Daily Analysis (Every Day at 9:00 AM UTC)

**What Happens:**
1. Workflow triggers automatically
2. `run_daily.py` executes (5-20 min)
3. Analysis modules run (Step 1-5)
4. New proposals generated
5. GitHub Issues created
6. Reports saved
7. Logs archived

**Status:** Visible at https://github.com/andraks-bit/andra-youtube-growth/actions

**No Manual Action Required** ✅

### Weekly Digest (Mondays at 9:00 AM UTC)

**What Happens:**
1. Workflow triggers automatically
2. Digest generated from latest reports
3. Email sent (if SMTP configured)
4. GitHub Issue notified
5. Logs archived

**Status:** Visible at https://github.com/andraks-bit/andra-youtube-growth/actions

**No Manual Action Required** ✅

---

## Approval Workflow Summary

```
Timeline:
├─ 09:00 UTC (Daily)
│  └─ Daily analysis runs
│  └─ New proposals generated → GitHub Issues created
│  └─ Status: "pending"
│
├─ Within 24 hours
│  └─ User reviews GitHub Issues
│  └─ User adds "approved" or "rejected" label
│
├─ 09:00 UTC (Next Daily)
│  └─ Status syncs: GitHub Issue → pending_changes.json
│  └─ Status: "approved" (if labeled)
│
├─ Anytime (Manual)
│  └─ User exports YT_WRITES_ENABLED=true
│  └─ User runs: deploy_approved.py
│  └─ YouTube changes applied
│  └─ Status: "applied"
│  └─ YT_WRITES_ENABLED reset to false
│
└─ 09:00 UTC (Monday)
   └─ Weekly digest email sent
   └─ All status counts updated
```

---

## Emergency Procedures

### If Workflow Fails

1. Go to Actions → Select failed run
2. Download logs artifact (run_log.jsonl)
3. Check error message in logs
4. Review PHASE_1_IMPLEMENTATION.md troubleshooting section
5. Common issues:
   - Missing secret: Add to GitHub Secrets
   - YouTube API error: Verify credentials
   - GitHub API error: Verify GITHUB_TOKEN
   - SMTP error: SMTP is optional (falls back to stdout)

### If Something Goes Wrong Before Deployment

- [ ] YT_WRITES_ENABLED is OFF (confirms no YouTube damage)
- [ ] All proposals are in GitHub Issues (complete audit trail)
- [ ] Proposal status in `pending_changes.json` (recovery point)
- [ ] No YouTube changes applied (because writes disabled)
- [ ] Review logs to understand what happened
- [ ] Fix root cause in code or config
- [ ] Manual test run to verify fix
- [ ] Resume normal operation

### If YouTube Changes Were Applied Incorrectly

1. **Immediate Actions:**
   - Set `YT_WRITES_ENABLED=false` (prevents more changes)
   - Stop all workflows (go to Actions → disable)
   - Do NOT re-run daily analysis

2. **Recovery:**
   - Manually revert changes on YouTube.com
   - Review what happened in logs/pending_changes.json
   - Identify root cause
   - Fix issue in code or approval process
   - Re-enable workflows only after fix

3. **Prevention:**
   - Always review proposals before approving
   - Use pilot mode to test 1 proposal first
   - Keep YT_WRITES_ENABLED=false by default
   - Never enable YT_WRITES_ENABLED permanently

---

## Success Criteria

Phase 1 is complete and successful when:

- [x] Daily analysis workflow runs at 9am UTC ✅
- [x] Weekly digest email scheduled for Mondays ✅
- [x] GitHub Issues created for all proposals ✅
- [x] Proposal tracking in pending_changes.json ✅
- [x] 4 independent safety gates in place ✅
- [x] YT_WRITES_ENABLED defaults to false ✅
- [x] All tests passing (7/7) ✅
- [x] Documentation complete ✅
- [ ] First manual test run successful
- [ ] GitHub secrets configured
- [ ] Code pushed to GitHub
- [ ] First scheduled run at 9am UTC tomorrow
- [ ] GitHub Issues created for new proposals

---

## What's Next

### Immediate (Today)
1. Set up GitHub Secrets (GITHUB_SECRETS_SETUP.md)
2. Push code to GitHub
3. Verify workflows are active

### Tomorrow (Day 1)
1. Monitor first daily run at 9am UTC
2. Review generated GitHub Issues
3. Test approval workflow (add "approved" label to one issue)

### Week 1
1. Review proposals generated by daily runs
2. Test deployment workflow (set YT_WRITES_ENABLED=true)
3. Verify YouTube changes apply correctly
4. Reset YT_WRITES_ENABLED=false

### Week 2 → 5
1. Monitor continuous daily runs
2. Use weekly digest to stay informed
3. Plan Phase 2-5 implementation
4. Review channel metrics and growth

---

## Files Created/Modified

### New Files
```
.github/workflows/daily-analysis.yml              (🆕 New)
.github/workflows/weekly-digest.yml               (🆕 New)
youtube-growth-system/PHASE_1_IMPLEMENTATION.md   (🆕 New)
youtube-growth-system/test_phase1.py              (🆕 New)
GITHUB_SECRETS_SETUP.md                           (🆕 New)
PHASE_1_DEPLOYMENT_CHECKLIST.md                   (🆕 New)
```

### Modified Files
```
youtube-growth-system/digest.py                   (🔧 Enhanced)
```

### Unchanged (Still Work)
```
youtube-growth-system/run_daily.py                (✓ No changes needed)
youtube-growth-system/config.py                   (✓ No changes needed)
youtube-growth-system/approval_workflow.py        (✓ No changes needed)
youtube-growth-system/github_api.py               (✓ No changes needed)
youtube-growth-system/youtube_api.py              (✓ No changes needed)
```

---

## Documentation Reference

- **PHASE_1_IMPLEMENTATION.md** — Complete architecture and setup guide
- **GITHUB_SECRETS_SETUP.md** — Secret configuration step-by-step
- **PHASE_1_DEPLOYMENT_CHECKLIST.md** — This file (deployment verification)
- **test_phase1.py** — Automated verification tests (7/7 passing)

---

## Final Verification

Run this before marking Phase 1 as deployed:

```bash
cd /Users/nunnu/Desktop/boathire

# Verify files exist
ls -la .github/workflows/daily-analysis.yml
ls -la .github/workflows/weekly-digest.yml
ls -la youtube-growth-system/PHASE_1_IMPLEMENTATION.md
ls -la youtube-growth-system/test_phase1.py

# Run test suite
cd youtube-growth-system
python3 test_phase1.py

# Expected: ✅ 7/7 tests passed
```

---

## Sign-Off

**Phase 1 Status:** ✅ **COMPLETE AND READY FOR DEPLOYMENT**

- [x] All architecture components built
- [x] All tests passing (7/7)
- [x] All safety gates verified
- [x] All documentation written
- [x] Ready for GitHub Secrets configuration
- [x] Ready for deployment to production

**Next Action:** Configure GitHub Secrets and push to GitHub

---

**Created:** 2026-10-03  
**Status:** Ready for Deployment  
**Channel:** Andra Kiirkivi (UCNFCKmMFaHUDuKIGub7exhA)
