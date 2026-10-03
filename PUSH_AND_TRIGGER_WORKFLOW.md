# Push to GitHub and Trigger Daily Digest Workflow

**Objective:** Push code to GitHub and manually trigger the daily workflow to test digest email delivery  
**Time Required:** 5 minutes to push + 10-30 minutes for workflow to run  
**Email Arrival:** 1-5 minutes after workflow completes

---

## 🚀 Step 1: Push Code to GitHub

### Option A: Using GitHub CLI (Easiest)

```bash
# Install GitHub CLI if needed: brew install gh
# Authenticate first: gh auth login

cd /Users/nunnu/Desktop/boathire
git push origin main
```

**Expected output:**
```
Enumerating objects: X, done.
Counting objects: 100% (X/X), done.
Delta compression using up to 8 threads
Compressing objects: 100% (X/X), done.
Writing objects: 100% (X/X), X.XX MiB | X.XX MiB/s, done.
Total X (delta X), reused 0 (delta 0), pack-reused 0
To https://github.com/andraks-bit/andra-youtube-growth.git
   xxxxxxx..xxxxxxx  main -> main
```

### Option B: Using SSH

```bash
# First, set up SSH key (one time):
ssh-keygen -t ed25519 -C "andra.kiirkivi@gmail.com"
# Then add to GitHub: https://github.com/settings/ssh/new

# Change remote to SSH:
git remote set-url origin git@github.com:andraks-bit/andra-youtube-growth.git

# Push:
cd /Users/nunnu/Desktop/boathire
git push -u origin main
```

### Option C: Using Personal Access Token (PAT)

```bash
# Create PAT: https://github.com/settings/tokens
# Scopes: repo (all), workflow

cd /Users/nunnu/Desktop/boathire

# Option 1: One-time push
git push -u origin main
# When prompted for password, paste your PAT

# Option 2: Cache credentials
git config --global credential.helper osxkeychain
git push -u origin main
# Enter PAT once, it will be remembered
```

---

## ✅ Step 2: Verify Code Pushed Successfully

Go to GitHub and verify:

```
https://github.com/andraks-bit/andra-youtube-growth
```

Check:
- [ ] Latest commit visible on main branch
- [ ] Commit message includes "daily digest" changes
- [ ] .github/workflows/daily-analysis.yml visible
- [ ] Files updated recently

---

## 🔧 Step 3: Trigger the Workflow Manually

### Navigate to GitHub Actions

**URL:** https://github.com/andraks-bit/andra-youtube-growth/actions

### Select the Workflow

Look for: **"Daily YouTube Analysis & Proposals"**

If you don't see it:
1. Click on "Workflows" in left sidebar
2. Find "daily-analysis.yml"
3. Click on it

### Click "Run workflow"

1. Click the **"Run workflow"** button (usually in top right)
2. Select branch: **main** (should be default)
3. Click green **"Run workflow"** button at bottom

**Expected:** Workflow will be queued and start within seconds

---

## 📊 Step 4: Monitor Workflow Execution

### Watch Real-Time Progress

1. Stay on the GitHub Actions page
2. You'll see the workflow appear in the list
3. Click on it to see real-time logs

### Steps to Monitor

```
✅ Checkout repository
✅ Set up Python 3.11
✅ Install dependencies
✅ Run daily YouTube analysis
   (This step: 10-20 minutes, do all the analysis)
   Watch for: "collect_traffic_source_trend" step
   Expected: Either succeeds or shows retry messages
✅ Send daily growth digest email ← WATCH THIS STEP
   Expected: "✅ Daily digest email sent to andra.kiirkivi@gmail.com"
   Or: "⚠️  Digest generated (email not sent - SMTP not configured)"
✅ Upload analysis logs
✅ Upload generated reports
```

### Expected Timeline

```
00:00 - Workflow starts (queued)
00:15 - Analysis running
15:00 - Analysis completes
15:30 - Digest email sent
20:00 - Workflow complete with ✅
```

---

## 📧 Step 5: Verify Digest Email Delivery

### Wait for Email

Expected arrival: **1-5 minutes** after workflow completes

### Check Inbox

1. Open Gmail: https://mail.google.com
2. Look for email from: **andra.kiirkivi@gmail.com**
3. Subject: **"YouTube Growth Digest"**

### Check Spam Folder

If not in inbox after 5 minutes:
1. Go to Spam folder
2. Mark as "Not spam" if found
3. Verify the email content

### Verify Email Content

Email should contain these sections:

```
📊 YouTube Growth Digest – [date]
================================================

📈 CHANNEL PERFORMANCE
----------------------------------------
- Subscribers: X
- Lifetime views: X

📊 GROWTH THIS WEEK vs LAST WEEK
----------------------------------------
- Views: X vs Y (+Z%)
- Watch time: X vs Y (+Z%)

🌍 TOP OPPORTUNITY DESTINATIONS
----------------------------------------
1. [Destination 1] (score X.XX)
2. [Destination 2] (score X.XX)
...

🔍 KEYWORD & SEO OPPORTUNITIES
----------------------------------------
X keyword gaps identified
...

⭐ TOP 5 QUICK WINS THIS WEEK
----------------------------------------
• [Quick win 1]
• [Quick win 2]
...

📋 PROPOSAL APPROVAL STATUS
----------------------------------------
✅ Approved: X
⏳ Pending: X
✓ Applied: X
✗ Rejected: X

✅ RECOMMENDED ACTIONS
----------------------------------------
1️⃣  [Action 1]
2️⃣  [Action 2]
...

🔒 SAFETY STATUS
----------------------------------------
✓ YouTube writes DISABLED
✓ No changes applied without approval
✓ All proposals tracked in GitHub

Resources:
• Review proposals: https://github.com/...
• Full report: reports/generated/weekly_latest.md
• Daily analysis: reports/generated/latest.md
```

---

## ✅ Success Checklist

After workflow completes:

### Workflow Execution
- [ ] Workflow shows ✅ (green checkmark)
- [ ] "Run daily YouTube analysis" step completed
- [ ] "Send daily growth digest email" step shows success
- [ ] Total duration: 10-30 minutes

### GitHub Issues
- [ ] New GitHub Issues created (2-4 proposals)
- [ ] Issues have "pending-approval" label
- [ ] Issues show CURRENT → PROPOSED changes

### Email Delivery
- [ ] Email received in inbox
- [ ] From: andra.kiirkivi@gmail.com
- [ ] Subject: YouTube Growth Digest
- [ ] Arrival time: Within 5 minutes of workflow completion

### Email Content
- [ ] Channel Performance section present
- [ ] Growth trends (This Week vs Last Week)
- [ ] Top destination rankings
- [ ] Keyword opportunities listed
- [ ] Quick wins identified
- [ ] Approval status count
- [ ] Recommended actions
- [ ] Safety status confirmed

### Safety Verification
- [ ] No YouTube changes made
- [ ] YT_WRITES_ENABLED stays disabled
- [ ] All proposals in "pending" status
- [ ] Approval-only mode still active

---

## 🐛 Troubleshooting

### Workflow Fails

**Problem:** Workflow shows ❌

**Solution:**
1. Click on failed workflow
2. Expand logs to find error
3. Common issues:
   - YouTube API credentials invalid → Check GitHub Secrets
   - Network timeout → Try again in 5 minutes
   - Traffic source API error → Expected, workflow continues

### Email Doesn't Arrive

**Problem:** Workflow succeeds but no email

**Check:**
1. Workflow logs: Does "Send digest email" step show "sent"?
2. SMTP configured: Check GitHub Secrets
3. Spam folder: Check there too
4. Email address: Verify DIGEST_RECIPIENT_EMAIL is correct

**Solutions:**
- If SMTP not configured: That's OK, digest prints to logs
- If misconfigured: Fix secrets and re-run workflow
- If still failing: Check GitHub Actions logs for SMTP error

### Workflow Takes Too Long

**Normal:** 10-30 minutes is expected
- Analysis: 10-20 minutes
- Report generation: 5-10 minutes
- Email sending: < 1 minute

**If over 30 minutes:** Something may have failed, check logs

---

## 📋 Full Command Summary

```bash
# 1. Navigate to project
cd /Users/nunnu/Desktop/boathire

# 2. Verify git status
git status
git log --oneline -5

# 3. Push to GitHub (choose one method):

# Method A: GitHub CLI
gh auth login  # If not already authenticated
git push origin main

# Method B: HTTPS with token
git push origin main
# When prompted: 
# Username: your-github-username
# Password: your-personal-access-token

# Method C: SSH
git push origin main

# 4. Verify on GitHub
echo "Go to: https://github.com/andraks-bit/andra-youtube-growth"

# 5. Trigger workflow
echo "Go to: https://github.com/andraks-bit/andra-youtube-growth/actions"
echo "Click: Daily YouTube Analysis & Proposals"
echo "Click: Run workflow"

# 6. Monitor and wait for email
echo "Workflow: 10-30 minutes"
echo "Email: 1-5 minutes after workflow completes"
```

---

## 🎯 Expected Result

### Success
```
✅ Code pushed to GitHub
✅ Workflow runs successfully (green checkmark)
✅ All analysis steps complete
✅ Digest email sent
✅ Email arrives in inbox within 5 minutes
✅ Email contains all 8 sections
✅ No YouTube changes made
✅ YT_WRITES_ENABLED stays disabled
✅ Approval-only mode active
```

### Status
```
🚀 DAILY DIGEST EMAIL DELIVERY WORKING
📧 Emails will arrive automatically every day at 9:15 AM UTC
✅ Starting tomorrow, no manual action needed
🔒 Safe - YouTube writes disabled throughout
```

---

## 📞 Need Help?

**If GitHub authentication fails:**
- Use GitHub CLI: `gh auth login`
- Or create Personal Access Token: https://github.com/settings/tokens
- Or use SSH keys: https://github.com/settings/ssh

**If workflow fails:**
- Check GitHub Secrets (YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN)
- Check workflow logs for specific errors
- Try again in 5 minutes (transient API errors)

**If email doesn't arrive:**
- Check SMTP secrets (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD)
- Check spam folder
- If no SMTP configured: Digest prints to workflow logs instead

---

**Ready to deploy?** Run the commands above and check your email in 15-35 minutes! 📧✅
