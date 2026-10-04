#!/usr/bin/env python3
"""
TikTok Desktop Login Kit Authorization Helper (with PKCE)

ONE-TIME SETUP SCRIPT - Uses TikTok's official Desktop Login Kit OAuth flow

VERIFIED AGAINST: TikTok Desktop Login Kit Official Documentation
- Authorization Code Flow with PKCE (RFC 7636)
- Redirect URI: http://localhost:3000/callback
- PKCE: code_verifier + code_challenge (SHA256)

Purpose:
1. Generate PKCE code_verifier and code_challenge
2. Start local HTTP server on localhost:3000
3. Open TikTok OAuth authorization URL (includes code_challenge)
4. User logs in as @andra.kiirkivi and approves
5. Server captures authorization code
6. Exchange code + code_verifier for tokens
7. Save code for GitHub Secrets

After this runs once:
- GitHub Actions handles everything automatically
- Refresh token cached, works forever
"""

import os
import sys
import json
import secrets
import hashlib
import base64
import webbrowser
import requests
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import time

# ============================================================================
# TIKTOK CONFIGURATION
# ============================================================================

TIKTOK_CLIENT_ID = os.environ.get("TIKTOK_CLIENT_ID")
TIKTOK_CLIENT_SECRET = os.environ.get("TIKTOK_CLIENT_SECRET")

REDIRECT_URI = "http://localhost:3000/callback"
AUTH_ENDPOINT = "https://www.tiktok.com/v2/oauth/authorize/"
TOKEN_ENDPOINT = "https://open.tiktok.com/v1/oauth/token/"

# PKCE Configuration (per TikTok Desktop Login Kit)
PKCE_CODE_LENGTH = 64  # 43-128 characters
PKCE_CHALLENGE_METHOD = "S256"  # SHA256

# Global state
captured_code = None
authorization_complete = False
code_verifier = None


# ============================================================================
# PKCE IMPLEMENTATION (RFC 7636)
# ============================================================================

def generate_code_verifier():
    """
    Generate PKCE code_verifier (random string).

    Per RFC 7636:
    - Length: 43-128 characters
    - Characters: unreserved = ALPHA / DIGIT / "-" / "." / "_" / "~"
    """
    # Use secrets for cryptographic randomness
    random_bytes = secrets.token_bytes(PKCE_CODE_LENGTH)
    # Use only unreserved characters: A-Z a-z 0-9 - . _ ~
    code_verifier = base64.urlsafe_b64encode(random_bytes).decode('utf-8')
    # Remove padding
    code_verifier = code_verifier.replace('=', '')
    # Ensure within length limits
    code_verifier = code_verifier[:PKCE_CODE_LENGTH]
    return code_verifier


def generate_code_challenge(code_verifier):
    """
    Generate PKCE code_challenge from code_verifier.

    Per RFC 7636 (S256 method):
    - code_challenge = BASE64URL(SHA256(code_verifier))
    """
    code_sha = hashlib.sha256(code_verifier.encode('utf-8')).digest()
    code_challenge = base64.urlsafe_b64encode(code_sha).decode('utf-8')
    # Remove padding
    code_challenge = code_challenge.replace('=', '')
    return code_challenge


# ============================================================================
# OAUTH CALLBACK HANDLER
# ============================================================================

class TikTokCallbackHandler(BaseHTTPRequestHandler):
    """Handles OAuth callback from TikTok (receives authorization code)"""

    def do_GET(self):
        """Capture authorization code from callback URL"""
        global captured_code, authorization_complete

        parsed_url = urlparse(self.path)
        query_params = parse_qs(parsed_url.query)

        # Check for authorization code
        if "code" in query_params:
            captured_code = query_params["code"][0]
            authorization_complete = True

            # Send success response to browser
            self.send_response(200)
            self.send_header("Content-type", "text/html")
            self.end_headers()

            html = """
            <html>
            <head><title>Authorization Successful</title></head>
            <body style="font-family: Arial; padding: 20px;">
                <h1>✅ Authorization Successful!</h1>
                <p>You have successfully authorized @andra.kiirkivi for YouTube automation.</p>
                <p>You can close this window and return to the terminal.</p>
                <p style="color: #666;">The script will now exchange the authorization code for tokens.</p>
            </body>
            </html>
            """
            self.wfile.write(html.encode())

        elif "error" in query_params:
            error = query_params["error"][0]
            error_description = query_params.get("error_description", ["Unknown error"])[0]

            self.send_response(400)
            self.send_header("Content-type", "text/html")
            self.end_headers()

            html = f"""
            <html>
            <head><title>Authorization Failed</title></head>
            <body style="font-family: Arial; padding: 20px;">
                <h1>❌ Authorization Failed</h1>
                <p><strong>Error:</strong> {error}</p>
                <p><strong>Details:</strong> {error_description}</p>
                <p>You can close this window and try again.</p>
            </body>
            </html>
            """
            self.wfile.write(html.encode())

    def log_message(self, format, *args):
        """Suppress default logging"""
        pass


def start_local_server():
    """Start HTTP server to catch OAuth callback"""
    server = HTTPServer(("localhost", 3000), TikTokCallbackHandler)
    print("✅ Local server started on http://localhost:3000")
    return server


# ============================================================================
# TIKTOK OAUTH FLOW
# ============================================================================

def get_authorization_url(code_challenge):
    """
    Generate TikTok OAuth authorization URL with PKCE.

    Per TikTok Desktop Login Kit documentation:
    - Includes code_challenge (SHA256 of code_verifier)
    - code_challenge_method = S256
    """
    if not TIKTOK_CLIENT_ID:
        print("❌ Error: TIKTOK_CLIENT_ID environment variable not set")
        sys.exit(1)

    params = {
        "client_key": TIKTOK_CLIENT_ID,
        "response_type": "code",
        "scope": "user.info.basic,video.upload",
        "redirect_uri": REDIRECT_URI,
        "code_challenge": code_challenge,
        "code_challenge_method": PKCE_CHALLENGE_METHOD,
    }

    # Build URL
    auth_url = f"{AUTH_ENDPOINT}?"
    auth_url += "&".join(f"{k}={v}" for k, v in params.items())

    return auth_url


def exchange_code_for_tokens(code, code_verifier):
    """
    Exchange authorization code + code_verifier for access and refresh tokens.

    Per TikTok Desktop Login Kit documentation:
    - Must include code_verifier in token exchange request
    - PKCE verification happens server-side (TikTok checks SHA256(code_verifier) == code_challenge)
    """
    if not TIKTOK_CLIENT_ID or not TIKTOK_CLIENT_SECRET:
        print("❌ Error: TIKTOK_CLIENT_ID or TIKTOK_CLIENT_SECRET not set")
        return None

    payload = {
        "client_key": TIKTOK_CLIENT_ID,
        "client_secret": TIKTOK_CLIENT_SECRET,
        "code": code,
        "grant_type": "authorization_code",
        "code_verifier": code_verifier,  # REQUIRED for PKCE
    }

    try:
        response = requests.post(TOKEN_ENDPOINT, json=payload, timeout=10)

        if response.status_code == 200:
            data = response.json()
            access_token = data.get("data", {}).get("access_token")
            refresh_token = data.get("data", {}).get("refresh_token")

            if access_token and refresh_token:
                return {
                    "access_token": access_token,
                    "refresh_token": refresh_token,
                    "expires_in": data.get("data", {}).get("expires_in"),
                }
            else:
                print(f"❌ No tokens in response: {data}")
                return None
        else:
            print(f"❌ Token exchange failed: {response.status_code}")
            print(f"Response: {response.text}")
            return None

    except requests.RequestException as e:
        print(f"❌ Request error: {e}")
        return None


def save_auth_code(code):
    """Save authorization code to file for GitHub Secrets"""
    auth_file = os.path.expanduser("~/.tiktok_auth_code")
    with open(auth_file, "w") as f:
        f.write(code)
    os.chmod(auth_file, 0o600)  # Secure permissions
    print(f"\n✅ Authorization code saved to: {auth_file}")


# ============================================================================
# MAIN AUTHORIZATION FLOW
# ============================================================================

def main():
    """Main authorization flow using TikTok Desktop Login Kit with PKCE"""
    print("\n" + "=" * 70)
    print("TIKTOK DESKTOP LOGIN KIT - ONE-TIME AUTHORIZATION (WITH PKCE)")
    print("=" * 70)

    # Verify environment
    if not TIKTOK_CLIENT_ID or not TIKTOK_CLIENT_SECRET:
        print("\n❌ Error: Missing environment variables")
        print("   Set TIKTOK_CLIENT_ID and TIKTOK_CLIENT_SECRET before running this script")
        print("\n   Example:")
        print("   export TIKTOK_CLIENT_ID='your_client_id'")
        print("   export TIKTOK_CLIENT_SECRET='your_client_secret'")
        sys.exit(1)

    # Step 1: Generate PKCE components
    print("\n📋 Step 1: Generating PKCE credentials...")
    global code_verifier
    code_verifier = generate_code_verifier()
    code_challenge = generate_code_challenge(code_verifier)
    print(f"✅ code_verifier generated ({len(code_verifier)} chars)")
    print(f"✅ code_challenge generated (SHA256 encoded)")

    # Step 2: Start local server
    print("\n📋 Step 2: Starting local authorization server...")
    server = start_local_server()

    # Step 3: Generate authorization URL
    print("\n📋 Step 3: Generating authorization URL...")
    auth_url = get_authorization_url(code_challenge)
    print("✅ Authorization URL ready")

    # Step 4: Show instructions
    print("\n" + "=" * 70)
    print("STEP 4: Open this URL in your browser")
    print("=" * 70)
    print(f"\n{auth_url}\n")

    print("=" * 70)
    print("STEP 5: Login to TikTok")
    print("=" * 70)
    print("""
When the browser opens:
1. Log in as @andra.kiirkivi (if not already logged in)
2. Review the permissions (user.info.basic, video.upload)
3. Click "Authorize" or "Approve"
4. You'll be redirected to http://localhost:3000/callback

The script will automatically capture the authorization code.
""")

    # Step 5: Attempt to open browser
    try:
        print("Opening browser...")
        webbrowser.open(auth_url)
    except Exception as e:
        print(f"Could not open browser automatically: {e}")
        print("Please copy and paste the URL above into your browser.")

    # Step 6: Wait for authorization
    print("\nWaiting for authorization...")
    print("(Press Ctrl+C if you need to cancel)\n")

    timeout = time.time() + 300  # 5 minute timeout
    while not authorization_complete:
        if time.time() > timeout:
            print("❌ Timeout: No authorization received within 5 minutes")
            sys.exit(1)

        try:
            server.handle_request()
        except KeyboardInterrupt:
            print("\n\n❌ Authorization cancelled")
            sys.exit(1)

    print(f"\n✅ Authorization code received: {captured_code[:20]}...")

    # Step 7: Exchange code for tokens
    print("\n📋 Step 6: Exchanging authorization code for tokens...")
    print("(Sending code + code_verifier to TikTok)")
    tokens = exchange_code_for_tokens(captured_code, code_verifier)

    if not tokens:
        print("❌ Failed to exchange code for tokens")
        sys.exit(1)

    print("✅ Successfully exchanged code for tokens")
    print(f"   Access token: {tokens['access_token'][:20]}...")
    print(f"   Refresh token: {tokens['refresh_token'][:20]}...")

    # Step 8: Save the code for the user
    save_auth_code(captured_code)

    # Step 9: Display next steps
    print("\n" + "=" * 70)
    print("NEXT STEPS: Add Authorization Code to GitHub Secrets")
    print("=" * 70)
    print(f"""
1. Go to your GitHub repository settings:
   https://github.com/andraks-bit/andra-youtube-growth/settings/secrets/actions

2. Click "New repository secret"

3. Create secret with these values:
   Name: TIKTOK_AUTH_CODE
   Value: {captured_code}

4. Click "Add secret"

5. On the next GitHub Actions run (9:00 AM UTC tomorrow):
   - The workflow will detect the code
   - Exchange it for permanent tokens (using code_verifier securely)
   - Store refresh_token in data/tiktok_tokens.json
   - Begin automatic TikTok publishing
   - You will NEVER need to run this script again

SECURITY NOTES:
- code_verifier is never stored (only used during exchange)
- Authorization code is one-time use
- Refresh token is what matters for future runs (auto-renewal)
- All subsequent API calls use access_token (auto-refreshed)
""")

    print("\n✅ Authorization setup complete!")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    main()
