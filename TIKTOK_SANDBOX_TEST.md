# TikTok Sandbox Integration - Real OAuth Testing

Complete end-to-end automation for testing real TikTok OAuth 2.0 + Content Posting API with your Sandbox account.

## Prerequisites ✅ (Already Completed)

- [x] TikTok Developer app created
- [x] Sandbox environment created and saved
- [x] Your TikTok account (@andra.kiirkivi) added as Target User
- [x] Redirect URI registered in app settings
- [x] GitHub Pages callback handler deployed at: https://andraks-bit.github.io/andra-youtube-growth/tiktok-callback.html

## What This Does

The automation script performs a complete real-world integration test:

1. **Real OAuth Authorization** - Opens TikTok's actual login page
2. **User Authenticates** - You authorize with your Sandbox account  
3. **Real Token Exchange** - Exchanges authorization code for access/refresh tokens (server-side)
4. **Real Video Upload** - Uploads an MP4 to TikTok Sandbox via Content Posting API
5. **Real Publishing** - Publishes the video to your Sandbox account
6. **Verification** - Video appears live on your Sandbox profile

## How to Test

### Step 1: Set Your Credentials

In your terminal, set your TikTok app credentials:

```bash
export TIKTOK_CLIENT_ID="your_sandbox_client_id"
export TIKTOK_CLIENT_SECRET="your_sandbox_client_secret"
```

### Step 2: Prepare a Test Video

You need a small MP4 video file to test with. Example:
```bash
# Create a simple test video using ffmpeg if needed
ffmpeg -f lavfi -i testsrc=s=1280x720:d=5 -f lavfi -i sine=f=440:d=5 ~/test-video.mp4
```

### Step 3: Run the Real Integration Test

```bash
./tiktok-integration-demo.sh ~/test-video.mp4
```

The script will:

1. **Verify credentials and video file** - Checks everything is ready
2. **Open TikTok OAuth page** - Browser opens automatically
3. **You authorize** - Sign in with @andra.kiirkivi, approve permissions
4. **Capture callback** - You paste the callback URL from browser
5. **Auto-exchange tokens** - Script exchanges code for tokens (no secrets shown)
6. **Auto-upload video** - Script uploads video to Sandbox
7. **Auto-publish** - Script publishes video to your account
8. **Show results** - Displays publish ID, confirms video is live

## What You'll See

```
══════════════════════════════════════════════════════════
🔐 TikTok Sandbox Integration - Real End-to-End Demo
══════════════════════════════════════════════════════════

→ Verification
✓ Credentials loaded
✓ Video file verified (100KB)

→ Step 1: Real TikTok OAuth Authorization
→ Opening TikTok Sandbox login in browser...
→ You will be redirected to: https://andraks-bit.github.io/...

ℹ After you authorize, you'll be redirected to a page showing the authorization code
Paste the FULL callback URL (starting with https://): [PASTE HERE]

→ Authorization code captured
✓ Code (hidden): ****XXXX

→ Step 2: Exchange Authorization Code for Tokens
→ Sending token exchange to TikTok servers...
✓ Token exchange successful
ℹ Access Token: ****XXXX
ℹ Refresh Token: ****XXXX
ℹ Expires In: 3600 seconds

→ Step 3: Upload Video to TikTok Sandbox
→ Uploading video to Sandbox API...
✓ Video uploaded successfully
ℹ Upload ID: abc123xyz...

→ Step 4: Publish Video to Sandbox Account
→ Publishing video to Sandbox account...
✓ Video published successfully
ℹ Publish ID: xyz789abc...
✓ Video is now LIVE on your Sandbox account!

✅ Complete Integration Demo Successful
✓ Real OAuth + Upload + Publish completed
ℹ Log into your Sandbox account to verify the video is live
```

## Security Notes

- ✅ **Client Secret never shown** - Only used server-side in token exchange
- ✅ **Access tokens shown only as preview** (last 4 digits)
- ✅ **Authorization codes shown only as preview** (last 4 digits)
- ✅ **No credentials stored** - All tokens only in memory during script execution
- ✅ **Safe for app review** - Demonstrates real integration without exposing secrets

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "No authorization code found in URL" | Make sure you copied the FULL callback URL from browser (starting with https://) |
| "Video upload failed: Invalid upload_id" | Video format might not be supported; ensure it's a valid MP4 |
| "Token exchange failed" | Verify your Client ID and Secret are correct; check Sandbox is enabled |
| Browser doesn't open automatically | Manually copy and open the Authorization URL shown in terminal |

## Next Steps

Once this test succeeds:
1. The integration is verified as real and working
2. You can submit the app for review with confidence
3. For production, only the redirect URI needs to change
4. For automation, tokens can be stored securely and refreshed as needed
