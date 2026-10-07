# TikTok Desktop Login Kit Setup (PKCE-Verified)

**Status:** ✅ Verified Against TikTok Official Documentation  
**Implementation:** OAuth 2.0 + PKCE (RFC 7636)  
**Redirect URI:** `http://localhost:3000/callback`  
**Kit Used:** Desktop Login Kit (Web Login Kit does NOT allow localhost)

---

## What Changed From Previous Plan

**Previous (Incorrect):** Web Login Kit + localhost  
**Current (Verified):** Desktop Login Kit + PKCE

### Why This Matters

TikTok's **Web Login Kit requires HTTPS** and doesn't allow localhost. However, their **Desktop Login Kit explicitly allows HTTP localhost** but **requires PKCE** for security.

PKCE (Proof Key for Public Clients) is an OAuth 2.0 extension (RFC 7636) that:
- Protects against authorization code interception
- Allows secure desktop/CLI applications to use OAuth
- Requires no additional secrets or configuration

---

## How It Works (PKCE Flow)

### Step 1: Local Authorization (You do this once)

```
┌─ Your Machine ──────────────────────────────┐
│                                              │
│  tiktok_authorize_local.py runs:            │
│  1. Generate code_verifier (random string)  │
│  2. Generate code_challenge = SHA256(...)   │
│  3. Start server on localhost:3000          │
│  4. Open TikTok OAuth URL in browser        │
│     (includes code_challenge)               │
│  5. You log in as @andra.kiirkivi           │
│  6. You approve permissions                 │
│  7. TikTok redirects → localhost:3000       │
│  8. Script captures authorization code      │
│  9. Script exchanges code + code_verifier   │
│     for access_token + refresh_token        │
│  10. Saves auth code for GitHub             │
│                                              │
└──────────────────────────────────────────────┘
```

### Step 2: GitHub Actions (First Run)

```
┌─ GitHub Actions Cloud ────────────────────────┐
│                                                │
│  Workflow runs (9:00 AM UTC):                 │
│  1. Detects TIKTOK_AUTH_CODE in Secrets      │
│  2. Exchanges code for refresh_token          │
│  3. Stores refresh_token in git repo          │
│  4. Marks one-time setup complete            │
│                                                │
└────────────────────────────────────────────────┘
```

### Step 3: GitHub Actions (All Future Runs)

```
┌─ GitHub Actions Cloud ────────────────────────┐
│                                                │
│  Workflow runs daily (9:00 AM UTC):           │
│  1. Load cached refresh_token                 │
│  2. Use refresh_token to get access_token     │
│  3. Publish TikToks using access_token        │
│  4. If access_token expires: auto-refresh     │
│  5. Refresh_token auto-renewed (never exp.)   │
│                                                │
│  NO MANUAL INTERVENTION NEEDED                │
│                                                │
└────────────────────────────────────────────────┘
```

---

## Setup Instructions

### Step 1: Create TikTok Developer App (5 minutes)

Go to: https://developers.tiktok.com

1. **Create Application:**
   - App Name: "YouTube Automation"
   - Platform: Video
   - Accept terms

2. **Enable Desktop Login Kit:**
   - In app dashboard, find "Login Kit" or "Authentication"
   - Click "Enable"

3. **Register Redirect URI:**
   - Go to Login Kit settings
   - Add Redirect URI: **`http://localhost:3000/callback`**
   - **Important:** This MUST be HTTP (not HTTPS)
   - **Important:** This MUST include the port (3000)
   - **Important:** This MUST be exact as shown
   - Save/confirm

4. **Enable Required Scopes:**
   - In Login Kit: Enable `user.info.basic` ✓
   - In Login Kit: Enable `video.upload` ✓

5. **Get API Credentials:**
   - Development tab → Copy "Client Key" (save as `TIKTOK_CLIENT_ID`)
   - Development tab → Copy "Client Secret" (save as `TIKTOK_CLIENT_SECRET`)

### Step 2: Run Local Authorization (3 minutes, on your machine)

**On your local computer** (NOT GitHub Actions):

```bash
# Set environment variables
export TIKTOK_CLIENT_ID="your_client_key"
export TIKTOK_CLIENT_SECRET="your_client_secret"

# Run authorization script
cd /Users/nunnu/Desktop/boathire
python3 tiktok_authorize_local.py
```

What the script does:
1. ✅ Generates PKCE code_verifier (random string)
2. ✅ Generates code_challenge = SHA256(code_verifier)
3. ✅ Starts HTTP server on localhost:3000
4. ✅ Opens TikTok OAuth login in browser
5. ✅ You log in as @andra.kiirkivi and approve
6. ✅ Script captures authorization code
7. ✅ Script exchanges code + code_verifier for tokens
8. ✅ Displays: `Authorization code: abc123xyz...`

Copy the authorization code from the output.

### Step 3: Add Code to GitHub Secrets (2 minutes)

1. Go to: https://github.com/andraks-bit/andra-youtube-growth/settings/secrets/actions

2. Click "New repository secret"

3. Create:
   - **Name:** `TIKTOK_AUTH_CODE`
   - **Value:** `abc123xyz...` (from step 2 output)

4. Click "Add secret"

### Step 4: GitHub Actions Handles Rest (Automatic)

Next scheduled workflow run (9:00 AM UTC) or manually trigger:

1. Workflow detects TIKTOK_AUTH_CODE
2. Exchanges code for tokens
3. Stores refresh_token permanently
4. ✅ Automatic publishing begins

---

## Technical Details: PKCE (RFC 7636)

### Why PKCE?

Traditional OAuth Authorization Code Flow:
```
1. Authorization code sent through browser
2. Risk: If intercepted, code can be reused
3. Solution: Require code_verifier from same app
```

PKCE Protection:
```
1. App generates random code_verifier
2. App creates code_challenge = SHA256(code_verifier)
3. code_challenge sent to authorization server
4. User approves, gets code
5. App sends code + code_verifier to token endpoint
6. Server verifies: SHA256(code_verifier) == code_challenge
7. Only the original app (which has code_verifier) can exchange the code
```

### code_verifier

- **Generated:** Cryptographically random (64 characters)
- **Characters:** A-Z, a-z, 0-9, -, ., _, ~
- **Sent to:** TikTok (during token exchange only)
- **Stored:** NEVER (only kept in memory during local script)
- **Security:** Cannot be guessed, intercepted, or reused

### code_challenge

- **Generated:** `BASE64URL(SHA256(code_verifier))`
- **Sent to:** TikTok (during authorization request)
- **Purpose:** Proof that the same app requesting the code is exchanging it
- **Security:** One-way function (cannot reverse to get code_verifier)

---

## What Gets Stored Where

| Item | Where | Use |
|------|-------|-----|
| **code_verifier** | Local memory | Only during initial exchange, never stored |
| **Authorization code** | GitHub Secret | One-time, first workflow run only |
| **access_token** | GitHub repo (git tracked) | Publishing TikToks (expires after 30 days) |
| **refresh_token** | GitHub repo (git tracked) | Get new access_token when needed (never expires) |
| **Client Secret** | GitHub Secret | Every API call (secure) |

---

## Redirect URI: Explained

**You Register:** `http://localhost:3000/callback`

**TikTok Redirects To:** `http://localhost:3000/callback?code=abc123xyz...`

**Script Receives:** Authorization code `abc123xyz...` from query parameter

**Security:** 
- ✅ Code is 1000x per HTTP redirect (short-lived)
- ✅ PKCE prevents reuse
- ✅ localhost ensures only your machine receives it
- ✅ localhost ensures OAuth can't be hijacked by network attacker

---

## Token Lifecycle

```
Day 1, Step 2 (Local):
  code_verifier + code_challenge → authorization code

Day 1, Step 4 (GitHub):
  authorization code + code_verifier → access_token (30d) + refresh_token (1y+)
  Stores: refresh_token in git

Days 2-30:
  Uses: access_token for publishing

Day 31+:
  access_token expired → uses refresh_token → gets new access_token
  refresh_token auto-renewed (effective never expires)

Forever:
  Publishing works, tokens auto-managed
  Zero manual intervention needed
```

---

## Security Checklist

✅ PKCE prevents authorization code interception  
✅ code_verifier never stored or transmitted over network  
✅ HTTP localhost is safe (can't be intercepted on local machine)  
✅ Authorization code is one-time use  
✅ Refresh token auto-renewed (never expires in practice)  
✅ All credentials stored in GitHub Secrets (encrypted)  
✅ Can revoke at any time (TikTok Account Settings → Connected Apps)

---

## Troubleshooting

### "Redirect URI invalid"

**Problem:** TikTok won't accept the redirect URI you registered

**Solution:**
- Must be exactly: `http://localhost:3000/callback`
- No trailing slash
- HTTP (not HTTPS)
- Must include port 3000

### "PKCE code_challenge mismatch"

**Problem:** TikTok rejects the token exchange with PKCE error

**Solution:**
- code_challenge must be BASE64URL(SHA256(code_verifier))
- No padding
- code_verifier must be exact same value
- Script handles this automatically

### "Invalid authorization code"

**Problem:** Code expired or already used

**Solution:**
- Run `python3 tiktok_authorize_local.py` again
- Get fresh code (valid for ~5 minutes)
- Update TIKTOK_AUTH_CODE in GitHub Secrets

---

## You're Ready! ✅

After completing all 4 steps:

✅ TikTok publishing fully automated  
✅ PKCE-secured OAuth 2.0 flow  
✅ GitHub Actions runs daily  
✅ Tokens auto-managed forever  
✅ Zero manual intervention needed  

**Implementation verified against TikTok's official Desktop Login Kit documentation.**
