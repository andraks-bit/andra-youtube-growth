# TikTok Sandbox Secure Demo - Ready for Review Recording

## What This Is

A **complete, real, secure** OAuth 2.0 demonstration for TikTok App Review showing:
- ✓ Web-based OAuth authorization (TikTok Login Kit)
- ✓ Secure token exchange (Client Secret never exposed to browser)
- ✓ PKCE-protected authorization flow (RFC 7636)
- ✓ user.info.basic scope retrieval
- ✓ Real TikTok Sandbox API integration

**This is NOT simulated.** Every OAuth call is real, every API call uses actual TikTok Sandbox endpoints.

## Architecture

```
┌─────────────────────┐         ┌──────────────────┐
│  Frontend Browser   │         │  Backend Server  │
│  (localhost:3000)   │         │ (localhost:3001) │
│                     │         │                  │
│  1. Initiates OAuth │────────→│ 2. Receives code │
│     (PKCE enabled)  │         │    Exchanges     │
│                     │         │    securely      │
│  4. Shows result ←──┼─────────│ 3. Returns       │
│     (no secrets)    │         │    user info     │
└─────────────────────┘         └──────────────────┘
         │                              │
         └──────────────────┬───────────┘
                            │
                     ┌──────▼──────┐
                     │  TikTok API │
                     │   Sandbox   │
                     └─────────────┘
```

## How It Works

### Step 1: Setup (One-time, before recording)

Export your TikTok Sandbox credentials:
```bash
export TIKTOK_CLIENT_ID="your-sandbox-client-key"
export TIKTOK_CLIENT_SECRET="your-sandbox-client-secret"
```

### Step 2: Start the Demo Services

```bash
cd ~/Desktop/boathire
chmod +x tiktok-sandbox-launcher.sh
./tiktok-sandbox-launcher.sh
```

This starts:
- **Backend** on http://localhost:3001 (handles OAuth callback securely)
- **Frontend** on http://localhost:3000 (user-facing demo)

### Step 3: Open the Demo in Browser

Open: **http://localhost:3000/tiktok-sandbox-demo.html**

You'll see:
- Backend status check
- "Sign in with TikTok" button

### Step 4: Authorize (What You Record)

**You need to perform ONE action:**

Click the **"Sign in with TikTok (Sandbox)"** button

Then:
1. You're redirected to TikTok's real OAuth page
2. Sign in as @andra.kiirkivi (your Sandbox user)
3. Approve the requested permissions
4. TikTok redirects back to backend callback
5. Backend exchanges the authorization code for tokens (securely)
6. Frontend shows "Authentication successful!"

## What Happens Behind the Scenes (Secure)

1. **Frontend generates PKCE**
   - CODE_VERIFIER (random 128 chars)
   - CODE_CHALLENGE (SHA256(verifier), base64url-encoded)

2. **Frontend sends verifier to backend**
   - Backend stores it (in-memory, cleared on restart)
   - Frontend never sees the Client Secret

3. **Frontend redirects to TikTok OAuth**
   ```
   https://www.tiktok.com/v2/auth/authorize/?
   client_key=YOUR_CLIENT_ID
   &redirect_uri=http://localhost:3001/callback
   &scope=user.info.basic
   &code_challenge=PKCE_CHALLENGE
   &code_challenge_method=S256
   ```

4. **User authorizes on TikTok**
   - TikTok redirects to: `http://localhost:3001/callback?code=AUTH_CODE`

5. **Backend exchanges code securely**
   ```python
   POST /v2/oauth/token/
   - client_id: YOUR_CLIENT_ID
   - client_secret: YOUR_CLIENT_SECRET  ← ONLY on backend, never browser
   - code: AUTH_CODE
   - code_verifier: PKCE_VERIFIER
   ```

6. **Backend gets tokens and user info**
   - access_token (short-lived)
   - refresh_token (long-lived)
   - user info (open_id, display_name, etc.)

7. **Frontend polls backend for result**
   - Gets user info
   - Shows success screen
   - "Demonstration complete!"

## What You Should Record

**For TikTok App Review, record the following sequence:**

1. **Show the application domain**
   - Display URL bar showing: http://localhost:3000/...
   - Shows this is web-based, not mobile-native
   - Your brand/domain visible

2. **Show the OAuth button**
   - Frame showing: "🔓 Sign in with TikTok (Sandbox)" button
   - Shows Web Login Kit branding

3. **Click the button**
   - Browser redirects to TikTok login page
   - Shows real TikTok OAuth flow (not simulated)

4. **TikTok login & approval**
   - Show login as @andra.kiirkivi
   - Show permission approval screen
   - Shows actual TikTok OAuth consent

5. **Successful return & callback**
   - Backend callback processes authorization code
   - Shows "Authentication successful!" message
   - Demonstrates secure token exchange

6. **Show the user info**
   - Display name and TikTok account info
   - Proves user was actually authenticated

**Total recording time: 1-2 minutes**

## The Three Critical Things TikTok Reviewers Check

### 1. ✓ Real OAuth Flow (Not Simulated)
This demo uses:
- Real TikTok authorization endpoint
- Real user authentication
- Real token exchange
- Real Sandbox account testing

**NOT** mocked API calls or fake responses.

### 2. ✓ Secure Architecture (Client Secret Protected)
The Client Secret:
- Lives only on the backend server
- NEVER sent to the browser
- NEVER exposed in logs or URLs
- ONLY used for server-to-server token exchange

Frontend NEVER has access to Client Secret.

### 3. ✓ Proper PKCE Implementation (RFC 7636)
The authorization flow uses:
- Random CODE_VERIFIER (128 characters)
- SHA256 CODE_CHALLENGE
- Prevents authorization code interception
- Production-ready security

## Credentials Setup Checklist

Before running the demo, verify in TikTok Developer Console:

- [ ] App created and showing in console
- [ ] Login Kit enabled (Products → Add Product → Login Kit)
- [ ] Content Posting API enabled (Products → Add Product → Posting API)
- [ ] Scopes configured:
  - [ ] user.info.basic
  - [ ] video.upload
  - [ ] video.publish
- [ ] Web Redirect URI saved: `http://localhost:3001/callback`
- [ ] Sandbox user @andra.kiirkivi created
- [ ] Sandbox user added as target user (Sandbox → Target Users)
- [ ] Client ID (client_key) copied
- [ ] Client Secret copied and kept secure

## Testing Checklist

```bash
# 1. Environment set
echo $TIKTOK_CLIENT_ID
echo $TIKTOK_CLIENT_SECRET

# 2. Services start
./tiktok-sandbox-launcher.sh

# 3. Backend health check
curl http://localhost:3001/health
# Should show: {"status":"ok","credentials":true,"client_key":"..."}

# 4. Frontend loads
curl http://localhost:3000/tiktok-sandbox-demo.html | head -5
# Should show HTML

# 5. Browser test
# Open http://localhost:3000/tiktok-sandbox-demo.html
# Click button
# Authorize on TikTok
# See success message
```

## Files Overview

| File | Purpose |
|------|---------|
| `tiktok-sandbox-backend.js` | Secure OAuth callback handler (Node.js) |
| `tiktok-sandbox-demo.html` | Frontend demo UI |
| `tiktok-sandbox-launcher.sh` | Launcher to start both services |
| `TIKTOK_SANDBOX_DEMO_README.md` | This file |

## Environment Variables

```bash
# Required for the demo to work
export TIKTOK_CLIENT_ID="your-sandbox-client-key"
export TIKTOK_CLIENT_SECRET="your-sandbox-client-secret"

# Alternative naming (if using Sandbox-specific credentials)
export TIKTOK_SANDBOX_CLIENT_ID="your-sandbox-client-key"
export TIKTOK_SANDBOX_CLIENT_SECRET="your-sandbox-client-secret"

# Backend looks for TIKTOK_CLIENT_ID first, then TIKTOK_SANDBOX_CLIENT_ID
```

## Troubleshooting

**"Backend not running on http://localhost:3001"**
- Check if Node.js is installed: `node -v`
- Try starting manually: `node tiktok-sandbox-backend.js`
- Make sure ports 3000 and 3001 are available

**"Backend running (no credentials - set env vars)"**
- Export the Client ID: `export TIKTOK_CLIENT_ID=your-key`
- Export the Client Secret: `export TIKTOK_CLIENT_SECRET=your-secret`
- Restart the launcher

**"Authorization timeout"**
- Make sure you're actually logging in on TikTok
- Check browser console for errors (F12)
- Verify redirect URI in TikTok Console is exactly: `http://localhost:3001/callback`

**"OAuth endpoint returns 404"**
- Confirm Client Key/ID is correct
- Verify redirect URI matches TikTok Console exactly
- Check that Sandbox is configured in TikTok Console

## Next Steps After Approval

Once TikTok grants Production approval:

1. Update GitHub Secrets with Production credentials:
   ```
   TIKTOK_CLIENT_ID = [Production Client ID]
   TIKTOK_CLIENT_SECRET = [Production Client Secret]
   ```

2. Run the production OAuth setup:
   ```bash
   python3 tiktok_token_manager.py
   ```
   This stores the refresh token.

3. Production automation starts automatically.

## Production Ready

This demo code is **production-ready**:
- ✓ Proper OAuth 2.0 with PKCE
- ✓ Server-side token exchange
- ✓ Error handling
- ✓ Session state management
- ✓ CORS enabled for cross-domain requests

Minimum changes needed for production:
- Change `localhost:3001` redirect URI to production domain
- Update Client ID/Secret management (env vars → secrets manager)
- Add request logging/monitoring
- Add error monitoring (Sentry, etc.)

## Questions?

For TikTok-specific OAuth issues, see:
- TikTok OAuth Docs: https://developers.tiktok.com/doc/web-login-kit/
- RFC 6749 (OAuth 2.0): https://tools.ietf.org/html/rfc6749
- RFC 7636 (PKCE): https://tools.ietf.org/html/rfc7636

---

**Status: Ready for Review Recording**

This demo satisfies all TikTok App Review requirements for OAuth integration.
