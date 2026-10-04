#!/usr/bin/env python3
"""
TikTok Local Authorization Helper

ONE-TIME SETUP SCRIPT (runs on your local machine, not in GitHub Actions)

Purpose:
1. Start a local web server on http://localhost:3000
2. Open TikTok OAuth authorization URL
3. You login as @andra.kiirkivi and approve the app
4. Script captures the authorization code
5. Exchanges code for tokens
6. Shows you the code to add to GitHub Secrets

After this runs once:
- GitHub Actions handles everything automatically
- No more manual authorization ever needed
- Refresh token stored securely, used indefinitely
"""

import os
import sys
import json
import webbrowser
import requests
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import time

# Configuration
TIKTOK_CLIENT_ID = os.environ.get("TIKTOK_CLIENT_ID")
TIKTOK_CLIENT_SECRET = os.environ.get("TIKTOK_CLIENT_SECRET")
REDIRECT_URI = "http://localhost:3000/callback"
AUTH_ENDPOINT = "https://www.tiktok.com/v2/oauth/authorize/"
TOKEN_ENDPOINT = "https://open.tiktok.com/v1/oauth/token/"

# Global state
captured_code = None
authorization_complete = False


class AuthCallbackHandler(BaseHTTPRequestHandler):
    """Handles OAuth callback from TikTok"""

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
    server = HTTPServer(("localhost", 3000), AuthCallbackHandler)
    print("✅ Local server started on http://localhost:3000")
    return server


def get_authorization_url():
    """Generate TikTok OAuth authorization URL"""
    if not TIKTOK_CLIENT_ID:
        print("❌ Error: TIKTOK_CLIENT_ID environment variable not set")
        sys.exit(1)

    params = {
        "client_key": TIKTOK_CLIENT_ID,
        "response_type": "code",
        "scope": "user.info.basic,video.upload",
        "redirect_uri": REDIRECT_URI,
    }

    # Build URL
    auth_url = f"{AUTH_ENDPOINT}?"
    auth_url += "&".join(f"{k}={v}" for k, v in params.items())

    return auth_url


def exchange_code_for_tokens(code):
    """Exchange authorization code for access and refresh tokens"""
    if not TIKTOK_CLIENT_ID or not TIKTOK_CLIENT_SECRET:
        print("❌ Error: TIKTOK_CLIENT_ID or TIKTOK_CLIENT_SECRET not set")
        return None

    payload = {
        "client_key": TIKTOK_CLIENT_ID,
        "client_secret": TIKTOK_CLIENT_SECRET,
        "code": code,
        "grant_type": "authorization_code",
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


def main():
    """Main authorization flow"""
    print("\n" + "=" * 70)
    print("TIKTOK ONE-TIME AUTHORIZATION SETUP")
    print("=" * 70)

    # Verify environment
    if not TIKTOK_CLIENT_ID or not TIKTOK_CLIENT_SECRET:
        print("\n❌ Error: Missing environment variables")
        print("   Set TIKTOK_CLIENT_ID and TIKTOK_CLIENT_SECRET before running this script")
        print("\n   Example:")
        print("   export TIKTOK_CLIENT_ID='your_client_id'")
        print("   export TIKTOK_CLIENT_SECRET='your_client_secret'")
        sys.exit(1)

    # Start server
    print("\nStarting local authorization server...")
    server = start_local_server()

    # Generate auth URL
    auth_url = get_authorization_url()

    # Show instructions
    print("\n" + "=" * 70)
    print("STEP 1: Open this URL in your browser")
    print("=" * 70)
    print(f"\n{auth_url}\n")

    print("=" * 70)
    print("STEP 2: Login to TikTok")
    print("=" * 70)
    print("""
When the browser opens:
1. Log in as @andra.kiirkivi (if not already logged in)
2. Review the permissions (user.info.basic, video.upload)
3. Click "Authorize" or "Approve"
4. You'll be redirected to http://localhost:3000/callback

The script will automatically capture the authorization code.
""")

    # Attempt to open browser
    try:
        print("Opening browser...")
        webbrowser.open(auth_url)
    except Exception as e:
        print(f"Could not open browser automatically: {e}")
        print("Please copy and paste the URL above into your browser.")

    # Wait for authorization
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

    # Exchange code for tokens
    print("\nExchanging code for tokens...")
    tokens = exchange_code_for_tokens(captured_code)

    if not tokens:
        print("❌ Failed to exchange code for tokens")
        sys.exit(1)

    print("✅ Successfully exchanged code for tokens")

    # Save the code for the user
    save_auth_code(captured_code)

    # Display next steps
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
   - Exchange it for permanent tokens
   - Store tokens securely
   - Begin automatic TikTok publishing
   - You will NEVER need to run this script again

IMPORTANT:
- This code is one-time use
- GitHub Actions will use it to get a refresh token
- The refresh token works indefinitely
- You can delete the TIKTOK_AUTH_CODE secret after the first successful run
""")

    print("\n✅ Authorization setup complete!")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    main()
