# Manual Workflow Test Guide

**Purpose:** Test API retry logic + SMTP digest email delivery  
**Safety:** YT_WRITES_ENABLED disabled, approval-only enforced  
**Expected Duration:** 10-30 minutes

---

## 🚀 Start the Test

### Step 1: Trigger Workflow Manually

**Go to:** https://github.com/andraks-bit/andra-youtube-growth/actions

**Select:** "Daily YouTube Analysis & Proposals"

**Click:** "Run workflow" → "Run workflow" button

**Status:** You'll see "Queued" → "In Progress" → "Completed"

---

## 📊 Monitor Workflow Execution

### Watch Real-Time Progress

1. **URL:** https://github.com/andraks-bit/andra-youtube-growth/actions
2. **Select:** Your running workflow
3. **Expand each step:** Click on step name to see logs

### Key Steps to Monitor

```
✅ Checkout repository
✅ Set up Python 3.11
✅ Install dependencies
✅ Run daily YouTube analysis
   ├─ collect_channel_snapshot
   ├─ collect_video_catalog
   ├─ collect_analytics
   ├─ collect_video_traffic
   ├─ collect_traffic_source_trend  ← WATCH THIS STEP
   │  (This is where 500 errors would have crashed before)
   │  Expected: Either succeeds OR shows "⚠️ Retryable error" messages
   │  Then continues normally
   ├─ analyze_seo_keywords
   ├─ analyze_optimization_opportunities
   ├─ generate_change_proposals
   ├─ save_data_snapshot
   ├─ generate_report
   ├─ generate_weekly_report
   └─ send_digest ← WATCH THIS STEP
      (Digest will be sent or noted in logs)
✅ Upload artifacts (logs & reports)
```

---

## 🔍 What to Look For

### Expected Success Signs

**✅ Workflow Completes in 10-30 minutes**

**✅ collect_traffic_source_trend Step:**
- Shows: "this-week vs last-week traffic-source split (complete)"
- OR shows: "skipped -- temporary API error (will retry next run)"
- Either is fine! (Means retry logic worked)

**✅ send_digest Step:**
- Shows: "digest sent to andra.kiirkivi@gmail.com"
- OR shows: "digest generated but not sent (SMTP not configured)"
- (If SMTP configured, email should be queued)

**✅ All steps complete without crashing**

### Logs to Check

After workflow completes:

1. **Download Artifacts**
   - Click: "Artifacts" section at bottom
   - Download: `daily-logs-{number}.zip`
   - Extract: Check `logs/run_log.jsonl`

2. **Look for Retry Messages:**
   ```
   "⚠️  Retryable error on attempt 1/4. Retrying in 1s..."
   "⚠️  Retryable error on attempt 2/4. Retrying in 2s..."
   ```
   (These are GOOD - means retry logic worked!)

3. **Look for Success:**
   ```
   "✓ collect_traffic_source_trend: this-week vs last-week..."
   ```
   (Means API succeeded)

4. **Look for Graceful Failure:**
   ```
   "⚠️  Traffic source trend collection failed... Continuing with empty data"
   ```
   (Means API failed but pipeline continued - GOOD!)

---

## 📧 Test SMTP Digest Email

### If You're Waiting for Email

**Expected Arrival Time:**
- Emails sent: Immediately during "send_digest" step
- Delivery time: Usually within 1-5 minutes
- Check: Inbox AND Spam folder

**What to Look For:**

From: `andra.kiirkivi@gmail.com`  
Subject: `YouTube Growth Digest`  
Body: Contains channel performance, opportunities, approval status

**If Email Arrives:**
✅ SMTP configuration working correctly
✅ Email credentials valid
✅ Digest generation and delivery successful

**If Email Doesn't Arrive:**
- Check: Spam folder
- Check: Log says "sent" or "queued"
- If log says "not configured": SMTP secrets might not be set

---

## 📋 Verification Checklist

After workflow completes:

### Workflow Execution
- [ ] Workflow completes with ✅ (green checkmark)
- [ ] No red ❌ marks or errors
- [ ] Duration: 10-30 minutes
- [ ] All steps executed or marked as skipped

### Traffic Source Step
- [ ] Shows: "complete" OR "skipped -- temporary API error"
- [ ] Does NOT show: Crashed/failed
- [ ] Logs show: Retry attempts if API had error

### Digest Email
- [ ] Email received (check inbox + spam)
- [ ] From: andra.kiirkivi@gmail.com
- [ ] Subject: "YouTube Growth Digest"
- [ ] Content: Channel summary, opportunities, status

### GitHub Issues
- [ ] Check: https://github.com/andraks-bit/andra-youtube-growth/issues
- [ ] Look for: New proposals with "pending-approval" label
- [ ] Expected: 2-4 new issues

### Reports Generated
- [ ] Daily report: `reports/generated/latest.md`
- [ ] Weekly report: `reports/generated/weekly_latest.md`
- [ ] Both readable without errors

### Safety Verification
- [ ] No YouTube changes made
- [ ] YT_WRITES_ENABLED confirmed: false
- [ ] Approval-only mode still active
- [ ] All proposals in "pending" status

---

## 🐛 Troubleshooting

### Workflow Fails

**Problem:** Workflow shows ❌ failed

**Check:**
1. Download logs: Click Artifacts → `daily-logs-*.zip`
2. Look for error messages
3. Check which step failed
4. Common issues:
   - YouTube credentials invalid
   - GitHub token missing
   - Network timeout
   - API still returning 500 errors (retry logic working, then gave up)

**Solution:**
- Verify secrets in GitHub
- Check if YouTube API is up (status.developers.google.com)
- Try workflow again in 5 minutes

### Digest Email Doesn't Arrive

**Problem:** Email not in inbox or spam

**Check:**
1. Workflow logs: Did it say "sent" or "not configured"?
2. SMTP_HOST configured in GitHub Secrets?
3. SMTP_PASSWORD correct (should be Gmail App Password)?
4. Check spam folder

**Solution:**
- Verify SMTP secrets are set correctly
- Check: https://myaccount.google.com/apppasswords
- Regenerate Gmail App Password if needed
- Re-add to GitHub Secrets

### Traffic Source Step Fails (Expected)

**Problem:** Step shows "skipped -- temporary API error"

**This is OK!** This means:
- ✅ Retry logic worked
- ✅ API returned 500 error
- ✅ Retried 3 times
- ✅ Still failed
- ✅ Pipeline continued (didn't crash)
- ✅ Analysis and proposals still generated

**Next run** (tomorrow 9am UTC): Will retry collector again

---

## 📝 Test Report

After workflow completes, create a simple summary:

```
WORKFLOW TEST REPORT
====================

Date: [today's date]
Time: [when workflow ran]
Duration: [how long it took]

RESULTS:
  Workflow Status: ✅ PASSED / ❌ FAILED
  All Steps Completed: YES / NO
  Traffic Source Step: SUCCESS / SKIPPED / FAILED
  Digest Email: RECEIVED / NOT RECEIVED / NOT CONFIGURED
  GitHub Issues Created: [number]
  Reports Generated: YES / NO
  YouTube Changes Made: NO (as expected)

LOGS CHECKED:
  ✅ Retry messages found: YES / NO
  ✅ No crash messages: YES / NO
  ✅ All steps logged: YES / NO

CONCLUSION:
  API retry logic: ✅ WORKING / ⚠️  NEEDS REVIEW
  SMTP delivery: ✅ WORKING / ⚠️  NEEDS REVIEW
  Overall: ✅ PASSED / ❌ FAILED
```

---

## 🎯 Expected Outcomes

### Best Case (All Systems Working)

```
✅ Workflow completes in 15 minutes
✅ All steps succeed
✅ 3-4 new proposals created
✅ Digest email arrives in 2-5 minutes
✅ GitHub Issues show pending-approval status
✅ Reports generated and visible
✅ No YouTube changes
✅ YT_WRITES_ENABLED still disabled
```

### Good Case (API Had Issues)

```
✅ Workflow completes in 25 minutes
⚠️  Traffic source step shows retry messages
⚠️  Traffic section skipped in digest/reports
✅ Analysis and proposals still generated
✅ Other digest content present
✅ 2-3 new proposals created
✅ GitHub Issues active
✅ No YouTube changes
✅ YT_WRITES_ENABLED still disabled
```

### If Something Failed

```
❌ Workflow shows error/failed
✅ Check logs for root cause
✅ Verify GitHub Secrets configured
✅ Check YouTube API status
✅ Try again in 5 minutes
✅ No YouTube changes made (safe)
✅ YT_WRITES_ENABLED still disabled
```

---

## ✅ When Test is Complete

### Success Criteria Met:
1. Workflow completes (success or graceful failure)
2. No YouTube changes made
3. YT_WRITES_ENABLED still disabled
4. Either digest email received OR logs explain why
5. Retry logic verified (either API succeeded or graceful fallback)

### Next Steps:
1. Note any issues found
2. Monitor for digest email arrival (may take 5-10 min)
3. Check GitHub Issues for new proposals
4. Wait for next scheduled run (tomorrow 9am UTC)
5. Repeat monitoring weekly

---

**Test Starts:** Go to GitHub Actions and click "Run workflow"  
**Expected Duration:** 10-30 minutes  
**Safety:** YT_WRITES_ENABLED disabled throughout

Good luck! 🚀
