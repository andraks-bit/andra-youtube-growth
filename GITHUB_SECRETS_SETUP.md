# GitHub Secrets Setup Guide for Phase 1

**Required for:** Automated YouTube analysis, proposal generation, and digest emails

---

## Quick Start

1. Go to: https://github.com/andraks-bit/andra-youtube-growth/settings/secrets/actions
2. Click **"New repository secret"** for each secret below
3. Copy the exact name and value
4. Save each one

---

## Required Secrets

### YouTube API Credentials (Required)

These enable the system to access your YouTube channel analytics and make approved changes.

#### **YT_CLIENT_ID**
- **Value:** Your Google OAuth client ID
- **Where to find:** Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs
- **Example:** `123456789-abc.apps.googleusercontent.com`
- **Purpose:** Identifies the application to Google

#### **YT_CLIENT_SECRET**
- **Value:** Your Google OAuth client secret
- **Where to find:** Same place as above (keep this secret!)
- **Example:** `GOCSPX-1234567890abcdef`
- **Purpose:** Authenticates the application with Google

#### **YT_REFRESH_TOKEN**
- **Value:** Your YouTube refresh token (for your channel)
- **Where to find:** Generated once during OAuth flow, stored in `blogger-automation/credentials/token_marbella_analytics.json`
- **Example:** `1//0gYrN...`
- **Purpose:** Allows offline access to your channel analytics

**How to get these if you don't have them:**

```bash
# 1. Complete the OAuth flow locally
cd youtube-growth-system
python auth.py

# 2. This will:
#    - Open browser for you to sign in
#    - Save token to: blogger-automation/credentials/token_marbella_analytics.json
#    - Display the credentials

# 3. Extract YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN
```

---

### Email Configuration (Optional, Recommended)

These enable the weekly digest email. If not set, digests will print to workflow logs instead.

#### **SMTP_HOST**
- **Value:** SMTP server for your email provider
- **Common values:**
  - Gmail: `smtp.gmail.com`
  - Outlook: `smtp-mail.outlook.com`
  - Other: Check your email provider's settings
- **Purpose:** Sends digest emails

#### **SMTP_PORT**
- **Value:** SMTP port (usually 587 for TLS or 465 for SSL)
- **Common values:** `587` (TLS) or `465` (SSL)
- **Purpose:** Connection port

#### **SMTP_USER**
- **Value:** Your email address or SMTP username
- **Example:** `andra@gmail.com` or just `andra` (depends on provider)
- **Purpose:** Authenticates with SMTP server

#### **SMTP_PASSWORD**
- **Value:** Your email password or app-specific password
- **⚠️  IMPORTANT:** For Gmail:
  - Enable 2FA on your Google Account
  - Generate an "App Password" at: https://myaccount.google.com/apppasswords
  - Use the 16-character password, NOT your main password
  - Example: `abcd efgh ijkl mnop` (with spaces)
- **Purpose:** Authenticates with SMTP server

#### **DIGEST_RECIPIENT_EMAIL**
- **Value:** Email address to receive the weekly digest
- **Example:** `andra.kiirkivi@gmail.com`
- **Purpose:** Where digests are sent (usually your email)

---

## Step-by-Step Setup

### For Gmail with App Password

1. **Enable 2-Factor Authentication on Google Account**
   - Go to: https://myaccount.google.com/security
   - Click "2-Step Verification"
   - Follow the steps

2. **Generate App Password**
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and "Windows Computer" (or other device)
   - Click "Generate"
   - Copy the 16-character password (with spaces)

3. **Add GitHub Secrets**
   ```
   SMTP_HOST = smtp.gmail.com
   SMTP_PORT = 587
   SMTP_USER = andra.kiirkivi@gmail.com
   SMTP_PASSWORD = abcd efgh ijkl mnop  (copy exactly as shown)
   DIGEST_RECIPIENT_EMAIL = andra.kiirkivi@gmail.com
   ```

### For Other Email Providers

Check your provider's SMTP settings:
- **Outlook:** Check account.microsoft.com → Security → App passwords
- **ProtonMail:** Generate bridge password in settings
- **Other:** Search "{provider name} SMTP settings"

---

## Testing Configuration

After adding secrets, test the setup:

```bash
cd youtube-growth-system

# Test digest generation (uses existing reports)
python3 -c "
import os
import digest

# This will print digest to stdout (SMTP fallback)
digest_text = digest.generate_digest_text(
    'reports/generated/weekly_latest.md',
    'data/pending_changes.json'
)
print(digest_text)
"

# Test email would be sent (dry-run)
python3 -c "
import digest
result = digest.send_digest_email('Test message', 'your-email@example.com')
print(f'Email sent: {result}')
"
```

---

## Verification Checklist

After adding all secrets:

- [ ] YT_CLIENT_ID set and valid
- [ ] YT_CLIENT_SECRET set and valid
- [ ] YT_REFRESH_TOKEN set and valid
- [ ] SMTP_HOST set (optional but recommended)
- [ ] SMTP_PORT set (optional but recommended)
- [ ] SMTP_USER set (optional but recommended)
- [ ] SMTP_PASSWORD set correctly (optional but recommended)
- [ ] DIGEST_RECIPIENT_EMAIL set (optional but recommended)

---

## Manual Workflow Test

Once secrets are set:

1. Go to: https://github.com/andraks-bit/andra-youtube-growth/actions
2. Select "Daily YouTube Analysis & Proposals"
3. Click "Run workflow" → "Run workflow"
4. Watch execution in real-time
5. Check logs for any errors
6. View generated GitHub Issues at: https://github.com/andraks-bit/andra-youtube-growth/issues

---

## Troubleshooting

### "Authentication failed"
- Check YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN
- Verify token hasn't expired (may need to regenerate via `python auth.py`)

### "SMTP connection failed"
- Check SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD
- Gmail users: Make sure you used an App Password, not your main password
- Verify email provider allows SMTP (some block it by default)

### "Email not sent"
- SMTP not configured is OK (digest will print to logs)
- Check workflow logs for error details
- Test locally: `python3 -c "import digest; digest.send_digest_email(...)"`

### "No issues created"
- Check GITHUB_TOKEN is available (auto-provided by GitHub Actions)
- Verify `MAX_NEW_PROPOSALS_PER_RUN` in config.py is > 0
- Check for YouTube API errors in logs

---

## Security Best Practices

1. **Never commit secrets to GitHub**
   - Use GitHub Secrets, never hardcode
   - The workflow files do NOT contain secrets

2. **Rotate passwords periodically**
   - Gmail App Passwords: Can be deleted and regenerated
   - SMTP passwords: Change according to your provider's policy

3. **Audit secret access**
   - GitHub logs all secret usage
   - Check who has access to the repository

4. **Use restrictive scopes**
   - YouTube API: Only enables channel-specific access
   - SMTP: Only sends email, cannot read inbox

5. **Monitor for unauthorized changes**
   - Watch GitHub Issues for unexpected proposals
   - Verify YT_WRITES_ENABLED stays OFF until explicitly enabled

---

## Reference: Secret Values for Local Development

If you need to run workflows locally for testing:

```bash
# Set environment variables (temporary, not saved)
export YT_CLIENT_ID="..."
export YT_CLIENT_SECRET="..."
export YT_REFRESH_TOKEN="..."
export GITHUB_TOKEN="ghp_..."
export SMTP_HOST="smtp.gmail.com"
export SMTP_PORT="587"
export SMTP_USER="your-email@gmail.com"
export SMTP_PASSWORD="your-app-password"
export DIGEST_RECIPIENT_EMAIL="andra.kiirkivi@gmail.com"

# Run locally
cd youtube-growth-system
python3 run_daily.py
```

---

## After Setup is Complete

✅ You're ready for Phase 1!

1. Push code to GitHub (workflows are now active)
2. Monitor first run at 09:00 UTC tomorrow
3. Review generated GitHub Issues
4. Approve/reject proposals as needed
5. Deploy when ready (YT_WRITES_ENABLED=true)

See **PHASE_1_IMPLEMENTATION.md** for complete setup instructions.
