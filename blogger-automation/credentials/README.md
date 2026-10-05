# Credentials Storage

This directory should contain OAuth tokens and Google API credentials.

⚠️  **NEVER commit credentials to git.** All files here are in `.gitignore`.

## Setup Instructions

### 1. Generate credentials locally (one-time setup)

```bash
cd blogger-automation

# Step 1: Generate consent URL
python3 auth.py url marbella

# Step 2: Open the URL in your browser, grant permissions
# Copy the redirected URL from the address bar (or just the code parameter)

# Step 3: Exchange code for refresh token
python3 auth.py exchange marbella "<redirected-url-or-code>"
```

This creates `credentials/token_marbella.json` locally on your machine.

### 2. Secure credential storage

For CI/CD automation (GitHub Actions):
- Store refresh tokens in **GitHub Secrets** (repository settings)
- Access via environment variables in workflows
- Never store in files that git tracks

For local development:
- Keep `credentials/` directory locally only
- Run scripts directly: `python3 post_daily.py`
- Tokens are cached in `token_*.json` files (gitignored)

### 3. Using credentials in scripts

```python
# Scripts load from:
# 1. Environment variable: YT_REFRESH_TOKEN
# 2. Local file: credentials/token_marbella.json
# 3. Falls back gracefully if neither available

from auth import get_access_token
token = get_access_token()
```

## Files (all gitignored)

- `client_secret.json` — OAuth client credentials (generated in Google Cloud Console)
- `token_marbella.json` — Active refresh token for Marbella account
- `token_boathire24.json` — Active refresh token for BoatHire24 account
- etc.

All are automatically gitignored. Do not commit them.
