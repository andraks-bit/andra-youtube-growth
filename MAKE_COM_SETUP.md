# Make.com YouTube-to-TikTok Automation Setup

## Endpoint Overview

**Production Endpoint:** `https://andra-tiktok-backend-2026.vercel.app/api/publish`

**HTTP Method:** `POST`

**Authentication:** Bearer Token (stored in Vercel environment variable)

**Purpose:** Trigger automated repurposing of YouTube videos to TikTok clips

---

## Step 1: Set Up Vercel Environment Variable

Your webhook requires a secure authentication token.

1. Go to: https://vercel.com/andraks-bit/andra-tiktok-backend-2026
2. Click "Settings" → "Environment Variables"
3. Add new variable:
   - **Name:** `MAKE_WEBHOOK_TOKEN`
   - **Value:** Generate a strong token (example format: `make_webhook_abc123xyz789`)
   - Save changes

**Vercel will auto-redeploy** with the new environment variable.

---

## Step 2: Configure Make.com Webhook

### In Make.com:

1. **Create a new scenario**
2. **Add Module:** Search for "HTTP" → Select "Make a request"
3. **Configure the HTTP Request:**

**URL:**
```
https://andra-tiktok-backend-2026.vercel.app/api/publish
```

**Method:** `POST`

**Headers:**
```
Authorization: Bearer YOUR_MAKE_WEBHOOK_TOKEN
Content-Type: application/json
```

(Replace `YOUR_MAKE_WEBHOOK_TOKEN` with the token you set in Vercel Step 1)

**Body (JSON):**
```json
{
  "action": "preview",
  "videoUrl": "{{youtube_video_url}}",
  "title": "{{video_title}}",
  "description": "{{video_description}}"
}
```

---

## Step 3: Request Parameters

The endpoint accepts these parameters:

| Parameter | Required | Type | Example |
|-----------|----------|------|---------|
| `action` | Yes | string | `"preview"` or `"publish"` |
| `videoUrl` | Yes | string | `"https://youtube.com/watch?v=..."` |
| `title` | No | string | `"My YouTube Video"` |
| `description` | No | string | `"Description text"` |

### Action Types:

- **`preview` or `dry-run`:** Returns what WOULD be published without actually publishing
- **`publish`:** Queues video for publish (requires approval before actual publish)

---

## Step 4: Response Format

### Successful Preview Response (200):
```json
{
  "status": "preview",
  "message": "Automation triggered in preview mode. No videos published.",
  "wouldPublish": {
    "platform": "TikTok",
    "videoUrl": "https://youtube.com/watch?v=...",
    "title": "Video Title",
    "description": "Description",
    "timestamp": "2026-10-09T13:52:52.239Z"
  },
  "nextStep": "Review the preview above, then call with action=publish to publish",
  "credentialsStatus": "✓ TikTok credentials verified"
}
```

### Publish Request Response (202):
```json
{
  "status": "pending_approval",
  "message": "Publish request queued pending manual approval",
  "videoUrl": "https://youtube.com/watch?v=...",
  "requestId": "pub_1728477172239_abc123xyz",
  "timestamp": "2026-10-09T13:52:52.239Z",
  "note": "Video will be published after manual review and approval"
}
```

### Error Responses:

- **401 Unauthorized:** Invalid or missing authentication token
- **403 Forbidden:** Token doesn't match configured value
- **400 Bad Request:** Missing required fields or invalid action
- **503 Service Unavailable:** TikTok credentials not configured in Vercel

---

## Step 5: Complete Make.com Scenario Example

```
Trigger: Schedule (daily)
  ↓
Get YouTube Videos (using YouTube API)
  ↓
For Each Video:
  ↓
  HTTP Request to: https://andra-tiktok-backend-2026.vercel.app/api/publish
  Method: POST
  Headers: Authorization: Bearer YOUR_MAKE_WEBHOOK_TOKEN
  Body: { "action": "preview", "videoUrl": "...", "title": "..." }
  ↓
  Log Response (check if preview is acceptable)
  ↓
  If Approved: Send another request with action=publish
```

---

## Security Notes

✓ Webhook token is NOT exposed in logs or error messages
✓ TikTok Client Secret is never sent to Make.com
✓ All credentials stored securely in Vercel environment
✓ Preview mode prevents accidental publishing
✓ Publish requests require explicit approval

---

## Troubleshooting

**"Authorization failed" error:**
- Verify the token in your Make.com HTTP header exactly matches the token in Vercel environment variables
- Check that the Authorization header format is exactly: `Bearer YOUR_TOKEN`

**"Service unavailable" error:**
- Verify TIKTOK_CLIENT_ID and TIKTOK_CLIENT_SECRET are set in Vercel
- Wait 1-2 minutes after setting environment variables for Vercel to redeploy

**"No videos published" (in preview):**
- This is expected! Preview mode never publishes
- To actually publish, use `"action": "publish"`

---

## After TikTok Production Approval

Once TikTok approves your production app:

1. Update Vercel environment variables with production credentials
2. The Make.com webhook automatically uses production credentials
3. Change scenario from preview to publish actions

No code changes required!

---

## Questions?

Check Vercel logs: https://vercel.com/andraks-bit/andra-tiktok-backend-2026/logs
