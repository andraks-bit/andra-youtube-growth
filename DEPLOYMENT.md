# TikTok Sandbox Demo - Persistent Deployment

The demo is now configured for one-click deployment to Railway.app (persistent, always-on, free tier).

## One-Click Deploy to Railway

**[Deploy to Railway →](https://railway.app/new)**

Follow these steps:

### Step 1: Create Railway Account
1. Click the Deploy to Railway link above
2. Sign in with GitHub
3. Authorize Railway to access your repositories

### Step 2: Connect Your Repository
1. Select the `andra-youtube-growth` repository
2. Railway will auto-detect the Node.js app

### Step 3: Add Environment Variables
Railway will prompt you for environment variables. Add:
- `TIKTOK_CLIENT_ID` = Your TikTok Sandbox Client ID
- `TIKTOK_CLIENT_SECRET` = Your TikTok Sandbox Client Secret
- `PUBLIC_URL` = (Leave blank, Railway will set this automatically)

### Step 4: Deploy
1. Click "Deploy"
2. Wait 2-3 minutes for deployment
3. Railway will show you the live URL (e.g., `https://your-app-production.up.railway.app`)

## Update TikTok OAuth Configuration

Once deployed, update your TikTok Developer Console:

1. Go to your TikTok app settings
2. Find "Web Redirect URIs"
3. Update to: `https://your-app-production.up.railway.app/callback`
4. Save changes

## Update Frontend Configuration

The frontend will auto-detect the correct backend URL at runtime, so no code changes needed.

## Deploy Steps Summary

1. Click "Deploy to Railway" link above
2. Connect GitHub repo
3. Add `TIKTOK_CLIENT_ID` and `TIKTOK_CLIENT_SECRET` env variables
4. Wait for deployment (2-3 min)
5. Copy the Railway app URL
6. Update TikTok redirect URI to `{railway-url}/callback`
7. Test at `{railway-url}` (frontend hosted locally for now)

## Accessing the Demo

Once deployed to Railway:

- **Backend URL**: `https://your-app-production.up.railway.app`
- **Frontend URL**: Deploy `tiktok-sandbox-demo.html` to GitHub Pages OR run locally
- **Full Demo**: `https://your-app-production.up.railway.app/callback` (backend handles OAuth)

## Testing the Complete Flow

After Railway deployment:

1. Run frontend locally: `python3 -m http.server 3000`
2. Open: `http://localhost:3000/tiktok-sandbox-demo.html`
3. Click "Sign in with TikTok"
4. Authorize
5. Should redirect back and show "Authentication successful!"

## Next Steps

- Deploy frontend to GitHub Pages for persistent frontend hosting
- Update OAuth redirect URI in TikTok console
- Record the complete TikTok app review video with the permanent URL

## Why Railway?

✓ Always-on (24/7, unlike GitHub Actions)
✓ Free tier generous ($5/month credits)
✓ Auto-deploys on every GitHub push
✓ HTTPS with custom domain support
✓ Environment variable management
✓ Persistent across sessions

This is now a **permanent, production-ready solution**.
