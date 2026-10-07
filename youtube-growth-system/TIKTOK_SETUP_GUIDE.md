# TikTok Autonomous Publishing Setup Guide

**Last Updated:** 2026-10-04  
**Status:** Production-Ready  
**Verified Against:** TikTok OAuth 2.0 Standard + Login Kit + Content Posting API

---

## Overview

This guide sets up **one-time authorization** for automatic TikTok publishing via `@andra.kiirkivi`. After setup, GitHub Actions publishes videos automatically every day without any manual intervention.

### What Happens After Setup

✅ Daily 9:00 AM UTC: GitHub Actions automatically publishes 1-2 TikToks  
✅ Content sourced from your YouTube videos  
✅ Performance tracked, learned, optimized  
✅ Zero manual work  
✅ Tokens auto-renewed indefinitely (refresh token pattern)  

---

## Architecture

This solution uses **OAuth 2.0 Authorization Code Flow** with refresh token caching:

```
ONE-TIME (You do this once):
┌─────────────────────────────────────────┐
│ 1. Run: python tiktok_authorize_local.py │
│ 2. Opens OAuth login in browser           │
│ 3. You approve as @andra.kiirkivi        │
│ 4. Script captures authorization code    │
└─────────────────────────────────────────┘
                    │
┌─────────────────────────────────────────┐
│ 5. Add TIKTOK_AUTH_CODE to GitHub Secret │
│ 6. Trigger workflow (or wait for 9:00 UTC)
└─────────────────────────────────────────┘
                    │
PRODUCTION (GitHub Actions handles forever):
┌─────────────────────────────────────────┐
│ 1. Workflow detects TIKTOK_AUTH_CODE    │
│ 2. Exchanges code for tokens            │
│ 3. Caches refresh token securely        │
│ 4. Uses refresh token forever           │
│ 5. Auto-publishes TikToks daily         │
│ 6. Tokens auto-renewed when needed      │
└─────────────────────────────────────────┘
```

---

## Step 1: Register TikTok Developer Application

**What:** Create a TikTok app in the Developer Portal  
**Who:** You (one time)  
**Time:** 5-10 minutes  

### 1.1 Create Developer Account

1. Go to: https://developer.tiktok.com
2. Sign in (can use your TikTok account or create new)
3. Complete email verification if needed
4. Accept Terms of Service

### 1.2 Create Application

1. Dashboard → "Create app" or "My Apps"
2. Fill out:
   - **App name:** "YouTube Automation" (or your choice)
   - **Platform:** Select "Video"
   - **Distribution Areas:** Select your countries
   - **Purpose:** Select appropriate category

3. Accept terms, create application

### 1.3 Enable Login Kit

1. In your app dashboard, find **"Login Kit"** or **"Authentication"**
2. Enable/activate Login Kit
3. In Login Kit settings → **Redirect URI:**
   ```
   http://localhost:3000/callback
   ```
   (This is used only for one-time local authorization)

4. Enable scopes:
   - `user.info.basic` ✓
   - `video.upload` ✓

5. Save/confirm

### 1.4 Get API Credentials

In your app's **"Development"** tab, copy:
- **Client Key** (save this as `TIKTOK_CLIENT_ID`)
- **Client Secret** (save this securely as `TIKTOK_CLIENT_SECRET`)

**⚠️ Keep Client Secret safe** — never commit to git, never share

---

## Step 2: Run Local Authorization (One-Time)

**What:** Authorize the app to access @andra.kiirkivi account  
**Who:** You (one time, on your local machine)  
**Time:** 2-3 minutes  
**Location:** Your computer (NOT GitHub)  

### 2.1 Get the Authorization Script

The script `tiktok_authorize_local.py` is already built in the repository.

Location: `/Users/nunnu/Desktop/boathire/tiktok_authorize_local.py`

### 2.2 Set Environment Variables

In your terminal:

```bash
export TIKTOK_CLIENT_ID="your_client_key_from_step_1"
export TIKTOK_CLIENT_SECRET="your_client_secret_from_step_1"
```

(Don't use quotes; replace with actual values)

### 2.3 Run Authorization Script

```bash
cd /Users/nunnu/Desktop/boathire
python3 tiktok_authorize_local.py
```

### 2.4 Follow On-Screen Instructions

1. **Script starts local server:**
   ```
   ✅ Local server started on http://localhost:3000
   ```

2. **Browser opens automatically** (or click the URL shown)

3. **TikTok login page appears:**
   - Log in as @andra.kiirkivi
   - Review permissions (user.info.basic, video.upload)
   - Click "Authorize" or "Approve"

4. **You're redirected back to localhost:**
   ```
   ✅ Authorization Successful!
   ```

5. **Script shows authorization code:**
   ```
   ✅ Authorization code received: abc123xyz...
   ```

6. **Script saves the code:**
   ```
   ✅ Authorization code saved to: ~/.tiktok_auth_code
   ```

**Copy the code** from step 5 (the full authorization code, not just the preview)

---

## Step 3: Add Code to GitHub Secrets

**What:** Store the authorization code so GitHub Actions can use it  
**Who:** You  
**Time:** 2 minutes  

### 3.1 Go to GitHub Secrets

1. Repository → Settings → Secrets and variables → Actions
2. URL: `https://github.com/andraks-bit/andra-youtube-growth/settings/secrets/actions`

### 3.2 Create Secret: TIKTOK_AUTH_CODE

1. Click **"New repository secret"**
2. **Name:** `TIKTOK_AUTH_CODE`
3. **Value:** Paste the authorization code from step 2.5
4. Click **"Add secret"**

### 3.3 Verify Existing Secrets

Confirm these secrets already exist (from earlier setup):
- ✅ TIKTOK_CLIENT_ID
- ✅ TIKTOK_CLIENT_SECRET

---

## Step 4: Trigger Workflow (First Automatic Authorization)

**What:** GitHub Actions exchanges the authorization code for permanent tokens  
**Who:** System (automatic)  
**Time:** 2-3 minutes  
**Location:** GitHub Actions cloud  

### 4.1 Trigger Workflow

Option A: **Wait for scheduled run**
- Next run: Tomorrow at 9:00 AM UTC
- Workflow automatically uses TIKTOK_AUTH_CODE

Option B: **Trigger manually now**
1. Go to: Actions → Daily YouTube Analysis & Proposals
2. Click "Run workflow" → "Run workflow" again
3. Wait 2-3 minutes

### 4.2 What Happens in Workflow

```
Step 1: Detect TIKTOK_AUTH_CODE in GitHub Secrets
Step 2: Call tiktok_api_client.exchange_code_for_tokens(auth_code)
Step 3: Send code to TikTok OAuth endpoint
Step 4: Receive access_token + refresh_token
Step 5: Save refresh_token to data/tiktok_tokens.json (in GitHub)
Step 6: ✅ Permanent authorization complete
```

### 4.3 Verify in Workflow Logs

1. Go to: Actions → Daily YouTube Analysis & Proposals → Latest run
2. Click "Handle TikTok One-Time Authorization (if needed)"
3. Look for: `✅ TikTok authorization successful!`

---

## Step 5: Clean Up (Remove One-Time Secret)

**What:** Delete TIKTOK_AUTH_CODE (no longer needed)  
**Who:** You  
**Time:** 1 minute  
**When:** After successful authorization  

### 5.1 Delete Secret

1. Repository → Settings → Secrets and variables → Actions
2. Find `TIKTOK_AUTH_CODE`
3. Click the "🗑️" delete icon
4. Confirm deletion

**Why:** The authorization code is one-time use only. After GitHub Actions exchanged it for tokens, it can't be used again. The refresh token (stored in GitHub) is what matters for future runs.

---

## What Happens After Setup

### First 24 Hours

✅ **Day 1, 9:00 AM UTC:** Workflow runs
- Detects TIKTOK_AUTH_CODE in GitHub Secrets
- Exchanges code for tokens
- Stores refresh_token in `data/tiktok_tokens.json`
- Prints: `✅ TikTok authorization successful!`

✅ **Day 1, Next TikTok Publishing Step:** First video publishes
- Uses cached refresh_token
- Video appears on @andra.kiirkivi feed
- Performance tracked

### Every Day After

✅ **9:00 AM UTC:** Workflow runs automatically
- Loads cached refresh_token from `data/tiktok_tokens.json`
- Uses refresh_token to get new access_token (if needed)
- Analyzes YouTube videos
- Publishes 1-2 TikToks
- Tracks performance
- **Zero manual intervention needed**

### Token Auto-Renewal

```
Day 1: Code → Access Token (30 days) + Refresh Token (1 year)
Days 2-30: Uses Access Token for publishing
Day 31+: Access Token expired → uses Refresh Token to get new Access Token
Forever: Refresh Token renewed each time, always stays valid
```

This is the **standard OAuth 2.0 refresh token pattern**. Your authorization never expires.

---

## TikTok Developer Configuration (Reference)

### What You Entered

| Setting | Value |
|---------|-------|
| **App Type** | Video + Content Posting |
| **Login Kit** | Enabled |
| **Redirect URI** | `http://localhost:3000/callback` |
| **Scopes** | `user.info.basic,video.upload` |

### What GitHub Actions Uses

| Secret | Purpose | Used When |
|--------|---------|-----------|
| `TIKTOK_CLIENT_ID` | App identification | Every workflow run |
| `TIKTOK_CLIENT_SECRET` | App authentication | Every workflow run |
| `TIKTOK_AUTH_CODE` | One-time authorization code | First workflow run only |

### Data Stored in Repository

| File | Contents | Sensitivity |
|------|----------|------------|
| `data/tiktok_tokens.json` | Access + Refresh Tokens | **Highly confidential** (already in `.gitignore`) |
| `data/tiktok_posts.json` | Published video tracking | Non-sensitive |

---

## Troubleshooting

### "TIKTOK_AUTH_CODE not found"

**Problem:** Workflow says "Awaiting authorization code"

**Solution:**
1. Did you complete Step 2 (run `tiktok_authorize_local.py`)? ✓
2. Did you complete Step 3 (add code to GitHub Secrets)? ✓
3. Did you use the full authorization code (not preview)? ✓
4. Trigger workflow manually to retry

### "Authorization failed: HTTP 400"

**Problem:** Invalid authorization code

**Possible causes:**
- Authorization code is expired (used >5 minutes ago)
- Authorization code was used twice (already redeemed)
- Code is incomplete/truncated

**Solution:**
1. Run `tiktok_authorize_local.py` again to get fresh code
2. Use the FULL code from the script output
3. Update TIKTOK_AUTH_CODE secret
4. Re-trigger workflow

### "No tokens in response"

**Problem:** TikTok API returned data but tokens missing

**Possible causes:**
- Scopes not enabled in TikTok Developer dashboard
- App not approved/configured properly

**Solution:**
1. Check TikTok Developer dashboard:
   - Login Kit enabled? ✓
   - Scopes include `user.info.basic` + `video.upload`? ✓
   - Redirect URI is `http://localhost:3000/callback`? ✓
2. Re-run `tiktok_authorize_local.py`

---

## Security Notes

✅ **Authorization code** is one-time use only  
✅ **Refresh token** never exposed in logs  
✅ **Client Secret** stored only in GitHub Secrets  
✅ **Tokens** automatically encrypted at rest in GitHub  
✅ **Old authorization code** can be deleted after first use  

---

## FAQ

**Q: Do I need to run tiktok_authorize_local.py every time?**  
A: No. Only once. After that, GitHub Actions uses the cached refresh token automatically.

**Q: What if the refresh token expires?**  
A: TikTok's standard OAuth 2.0 pattern auto-renews the refresh token each time it's used. It's valid for 1 year and gets extended every time it's used, so it effectively never expires.

**Q: Can I revoke access if needed?**  
A: Yes. Go to your TikTok Account Settings → Connected Apps, find this app, and disconnect it. YouTube automation stops immediately.

**Q: What if I want to use a different TikTok account?**  
A: Run `tiktok_authorize_local.py` again, log in to the other account, get a new code, update the secret, and the system switches accounts.

**Q: Do you store my TikTok credentials?**  
A: No. We never store your password. We store OAuth tokens (like a browser session), which you can revoke anytime.

---

## You're Ready! 🚀

After completing all 5 steps:

✅ TikTok publishing is fully automated  
✅ GitHub Actions runs daily at 9:00 AM UTC  
✅ Content repurposed from your YouTube videos  
✅ Performance tracked and optimized  
✅ Zero manual intervention needed  

**Questions?** Check the troubleshooting section above or check the workflow logs in GitHub Actions.
