# TikTok Sandbox - Secure Credential Setup

## Overview

The TikTok Sandbox integration supports TWO secure methods for storing credentials:

1. **GitHub Secrets** (recommended for CI/CD)
2. **Local .env file** (for local development only)

Both methods keep credentials out of logs and chat. **Never paste your Client Secret into chat, logs, or commit it to git.**

---

## Method 1: GitHub Secrets (Recommended)

Use GitHub Secrets to store credentials securely for GitHub Actions and CI/CD workflows.

### ONE exact action to take:

Go to your GitHub repository settings:

**Step 1:** Open repository → **Settings** → **Secrets and variables** → **Actions**

**Step 2:** Create two new repository secrets:

| Secret Name | Value |
|---|---|
| `TIKTOK_CLIENT_ID` | Your Client ID from Developer Console |
| `TIKTOK_CLIENT_SECRET` | Your Client Secret from Developer Console |

**That's it.** GitHub encrypts and protects these secrets.

### Using GitHub Secrets

The credentials are automatically available in GitHub Actions workflows:

```bash
# In any GitHub Actions workflow, use:
env:
  TIKTOK_CLIENT_ID: ${{ secrets.TIKTOK_CLIENT_ID }}
  TIKTOK_CLIENT_SECRET: ${{ secrets.TIKTOK_CLIENT_SECRET }}
```

Example workflow is already set up in: `.github/workflows/tiktok-sandbox-test.yml`

---

## Method 2: Local .env File (Development Only)

For testing locally on your machine without using GitHub Actions.

### Setup (One-time)

1. Copy the template:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your credentials:
   ```bash
   nano .env
   ```

3. Add your Sandbox credentials:
   ```
   TIKTOK_CLIENT_ID=your_sandbox_client_id
   TIKTOK_CLIENT_SECRET=your_sandbox_client_secret
   ```

4. Save and close

### Using .env File

The scripts automatically load `.env` if it exists:

```bash
# Run the test launcher
./test-tiktok-sandbox.sh

# Or run directly
./tiktok-integration-demo.sh ~/video.mp4
```

The credentials are loaded from `.env`, never typed in terminal, never shown in logs.

### Security

- ✅ `.env` is in `.gitignore` - never committed to git
- ✅ Credentials never appear in terminal output
- ✅ Credentials never appear in command history
- ✅ Only loaded into memory during script execution
- ✅ Safe to commit `.env.example` (no secrets in it)

---

## Security Best Practices

### ✅ DO:
- Store credentials in GitHub Secrets for CI/CD
- Store credentials in `.env` for local development
- Use `[PROTECTED]` placeholders when showing terminal output
- Rotate credentials if they're ever exposed
- Use different credentials for Development/Sandbox vs Production

### ❌ DON'T:
- Paste Client Secret into chat, logs, or pull requests
- Commit `.env` or `credentials.json` to git
- Echo credentials in terminal output
- Share credentials via email or messaging
- Hardcode credentials in scripts

---

## Verify Setup

### For GitHub Secrets:

```bash
# Check that secrets are set (don't show values):
gh secret list -R andraks-bit/andra-youtube-growth
```

### For Local .env:

```bash
# Check that .env exists and is loaded:
if [ -f .env ]; then echo "✓ .env file found"; fi
```

---

## Next Steps

Once credentials are securely stored:

1. **For local testing:**
   ```bash
   ./test-tiktok-sandbox.sh
   ```

2. **For GitHub Actions testing:**
   - Go to repository → **Actions**
   - Select **TikTok Sandbox Integration Test** workflow
   - Click **Run workflow**
   - Credentials are used automatically from GitHub Secrets

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Missing TikTok credentials" | Make sure `.env` file exists and has credentials, OR GitHub Secrets are set |
| "Client Secret appears in logs" | Don't use this method - use GitHub Secrets or local `.env` instead |
| "Can't find .env file" | Run: `cp .env.example .env` |
| ".env is being tracked in git" | Run: `git rm --cached .env` (it shouldn't be in git) |

---

## Files

- `.env.example` - Template file (safe to commit, no secrets)
- `.env` - Your local credentials (NOT in git, in .gitignore)
- `.github/workflows/tiktok-sandbox-test.yml` - GitHub Actions workflow
- `.gitignore` - Already includes `.env` to prevent accidental commits

