# Deploy TikTok Sandbox Demo to Vercel

The backend code is now fully configured for Vercel. Follow these steps to deploy:

## Step 1: Create Vercel Account (if needed)
- Go to: https://vercel.com/signup
- Sign in with GitHub (connect your GitHub account)

## Step 2: Deploy This Repository to Vercel
- Go to: https://vercel.com/new
- Click "Select a Git Namespace" → Choose `andraks-bit`
- Select repository: `andra-youtube-growth`
- Click "Import"

## Step 3: Configure Environment Variables
Before clicking "Deploy", you'll see the Environment Variables section:

**Add these two variables:**
1. `TIKTOK_CLIENT_ID` = Your TikTok Sandbox Client ID
2. `TIKTOK_CLIENT_SECRET` = Your TikTok Sandbox Client Secret

**Do NOT share these with anyone.** They're stored securely in Vercel.

## Step 4: Deploy
- Click the "Deploy" button
- Wait 2-3 minutes for deployment to complete
- Vercel will show you the deployment URL (e.g., `https://andra-youtube-growth.vercel.app`)

## Step 5: Update TikTok OAuth Settings
Once deployed, update your TikTok Developer Console:

1. Go to your TikTok app settings
2. Find "Web Redirect URIs"
3. **Update to:** `https://andra-youtube-growth.vercel.app/callback`
4. Save changes

## Step 6: Test the Demo
The demo is now live at:
- **Frontend:** https://andraks-bit.github.io/andra-youtube-growth/docs/
- **Backend:** https://andra-youtube-growth.vercel.app

The frontend auto-detects the Vercel backend and will connect automatically.

Click "Sign in with TikTok" to test the complete OAuth flow.

## What Happens Automatically
- ✓ Vercel auto-deploys every time you push to GitHub main branch
- ✓ Environment variables stay secure and never exposed
- ✓ Backend runs 24/7 on Vercel's reliable infrastructure
- ✓ CORS headers are properly configured for GitHub Pages frontend

## Next Steps After Deployment
Once the demo is working:
1. Record the TikTok OAuth flow for app review submission
2. After TikTok approves production access, enable automated daily publishing
3. Set up GitHub Actions for scheduled posts to TikTok

---

**Questions?** Check the backend logs at: https://vercel.com/dashboard/andra-youtube-growth
