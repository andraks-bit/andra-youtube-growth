"""
TikTok API Client

Handles publishing to TikTok @andra.kiirkivi account via official TikTok API.

Authorization flow:
1. User provides: TIKTOK_CLIENT_ID + TIKTOK_CLIENT_SECRET
2. System performs one-time OAuth login (user approves in browser)
3. System receives refresh token (stored securely)
4. System uses refresh token to get new access tokens automatically
5. Publishing works without further user interaction
"""

import os
import json
import requests
from datetime import datetime


class TikTokClient:
    """Official TikTok API client for @andra.kiirkivi account"""

    def __init__(self):
        self.client_id = os.environ.get("TIKTOK_CLIENT_ID")
        self.client_secret = os.environ.get("TIKTOK_CLIENT_SECRET")
        self.access_token = os.environ.get("TIKTOK_ACCESS_TOKEN")
        self.refresh_token = os.environ.get("TIKTOK_REFRESH_TOKEN")
        self.api_base = "https://open.tiktok.com/v1"

        self.token_file = os.path.join("data", "tiktok_tokens.json")

    def load_stored_tokens(self):
        """Load previously saved tokens"""
        if os.path.exists(self.token_file):
            with open(self.token_file) as f:
                tokens = json.load(f)
                self.access_token = tokens.get("access_token")
                self.refresh_token = tokens.get("refresh_token")

    def save_tokens(self, access_token, refresh_token):
        """Securely save tokens for next run"""
        os.makedirs("data", exist_ok=True)
        with open(self.token_file, "w") as f:
            json.dump({
                "access_token": access_token,
                "refresh_token": refresh_token,
                "saved_at": datetime.now().isoformat()
            }, f)

    def get_authorization_url(self):
        """
        Generate OAuth login URL for user to authorize.
        User opens this URL, logs in to @andra.kiirkivi, approves the app.

        Flow:
        1. User opens this URL in browser
        2. Logs in as @andra.kiirkivi
        3. Approves the app
        4. Gets redirected to http://localhost:3000/callback?code=XXXXX
        5. Copies the authorization code (XXXXX)
        6. Provides code to system via TIKTOK_AUTH_CODE env variable
        7. System exchanges code for access token
        """
        if not self.client_id:
            return {
                "status": "missing_credentials",
                "message": "TIKTOK_CLIENT_ID not found",
                "action": "Set TIKTOK_CLIENT_ID + TIKTOK_CLIENT_SECRET in GitHub Secrets"
            }

        # Production redirect URI for GitHub Actions (manual code exchange)
        redirect_uri = "http://localhost:3000/callback"

        auth_url = (
            f"https://www.tiktok.com/v2/oauth/authorize"
            f"?client_key={self.client_id}"
            f"&response_type=code"
            f"&scope=user.info.basic,video.upload"
            f"&redirect_uri={redirect_uri}"
        )

        return {
            "status": "authorization_needed",
            "message": "ONE-TIME SETUP: Open this URL to authorize TikTok access",
            "authorization_url": auth_url,
            "next_step": "After login and approval, copy the authorization code from the redirect URL",
            "redirect_uri": redirect_uri,
            "instructions": [
                "1. Click the authorization URL above",
                "2. Log in as @andra.kiirkivi",
                "3. Approve the app",
                "4. TikTok redirects to: http://localhost:3000/callback?code=XXXXX",
                "5. Copy the code value (the part after 'code=')",
                "6. Set TIKTOK_AUTH_CODE environment variable with this code",
                "7. Next workflow run will exchange code for permanent access token"
            ]
        }

    def exchange_code_for_tokens(self, auth_code=None):
        """
        Exchange authorization code for access and refresh tokens.

        PRODUCTION FLOW (GitHub Actions):
        1. User runs tiktok_authorize_local.py once (on their machine)
        2. Script captures authorization code
        3. User adds TIKTOK_AUTH_CODE to GitHub Secrets
        4. GitHub Actions detects it, calls this method
        5. Gets access + refresh tokens
        6. Stores refresh token permanently
        7. Deletes TIKTOK_AUTH_CODE secret (one-time use)
        8. All future publishing uses cached refresh token

        Can be called in two ways:
        1. Direct: exchange_code_for_tokens("code_from_user")
        2. Auto: exchange_code_for_tokens() reads from TIKTOK_AUTH_CODE env var
        """

        # If no code provided, try to get from environment variable (GitHub Actions use case)
        if not auth_code:
            auth_code = os.environ.get("TIKTOK_AUTH_CODE")

        if not auth_code:
            return {
                "status": "no_code",
                "message": "No authorization code provided",
                "action": "Run tiktok_authorize_local.py to get authorization code, then add to GitHub Secrets"
            }

        try:
            response = requests.post(
                f"{self.api_base}/oauth/token",
                json={
                    "client_key": self.client_id,
                    "client_secret": self.client_secret,
                    "code": auth_code,
                    "grant_type": "authorization_code"
                }
            )

            if response.status_code == 200:
                data = response.json()
                access_token = data.get("data", {}).get("access_token")
                refresh_token = data.get("data", {}).get("refresh_token")
                expires_in = data.get("data", {}).get("expires_in")

                if access_token and refresh_token:
                    self.save_tokens(access_token, refresh_token)
                    self.access_token = access_token
                    self.refresh_token = refresh_token

                    return {
                        "status": "success",
                        "message": "✅ TikTok account authorized successfully",
                        "tokens_saved": "Refresh token stored securely in data/tiktok_tokens.json",
                        "next_action": "1) Delete TIKTOK_AUTH_CODE from GitHub Secrets (no longer needed)\n2) Publishing will begin automatically at next workflow run",
                        "expires_in_seconds": expires_in,
                        "automatic_renewal": "Refresh token will be used automatically to renew access token when needed"
                    }
                else:
                    return {
                        "status": "error",
                        "message": f"No tokens in response: {data}"
                    }
            else:
                return {
                    "status": "error",
                    "message": f"Authorization failed: HTTP {response.status_code}",
                    "details": response.text,
                    "action": "Check that authorization code is valid and not expired"
                }

        except Exception as e:
            return {
                "status": "error",
                "message": f"Authorization error: {str(e)}",
                "action": "Check internet connection and try again"
            }

    def refresh_access_token(self):
        """
        Use refresh token to get a new access token.
        Called automatically when access token expires.
        """
        if not self.refresh_token:
            return {
                "status": "no_refresh_token",
                "message": "No refresh token available"
            }

        try:
            response = requests.post(
                f"{self.api_base}/oauth/token",
                json={
                    "client_key": self.client_id,
                    "client_secret": self.client_secret,
                    "refresh_token": self.refresh_token,
                    "grant_type": "refresh_token"
                }
            )

            if response.status_code == 200:
                data = response.json()
                new_access_token = data.get("data", {}).get("access_token")
                new_refresh_token = data.get("data", {}).get("refresh_token")

                if new_access_token:
                    self.access_token = new_access_token
                    if new_refresh_token:
                        self.refresh_token = new_refresh_token
                    self.save_tokens(new_access_token, self.refresh_token)

                    return {
                        "status": "success",
                        "message": "✅ Access token refreshed automatically"
                    }
            else:
                return {
                    "status": "error",
                    "message": f"Token refresh failed: {response.text}"
                }

        except Exception as e:
            return {
                "status": "error",
                "message": f"Token refresh error: {str(e)}"
            }

    def publish_video(self, video_file_path, caption, hashtags):
        """
        Publish a TikTok video from @andra.kiirkivi account.

        Args:
            video_file_path: Path to video file (MP4, H.264 codec)
            caption: Video caption with hooks and CTAs
            hashtags: List of hashtags
        """

        if not self.access_token:
            return {
                "status": "not_authorized",
                "message": "TikTok account not authorized yet",
                "action": "Complete OAuth authorization first"
            }

        try:
            # Upload video
            with open(video_file_path, "rb") as f:
                files = {"file": f}
                upload_response = requests.post(
                    f"{self.api_base}/post/publish/video/init",
                    headers={"Authorization": f"Bearer {self.access_token}"},
                    files=files
                )

            if upload_response.status_code != 200:
                return {
                    "status": "upload_failed",
                    "message": upload_response.text
                }

            # Create post
            post_data = {
                "video_id": upload_response.json().get("data", {}).get("video_id"),
                "caption": caption,
                "post_info": {
                    "desc": caption,
                    "disable_comment": False,
                    "disable_duet": False,
                    "disable_stitch": False
                }
            }

            post_response = requests.post(
                f"{self.api_base}/post/publish/action/publish",
                headers={"Authorization": f"Bearer {self.access_token}"},
                json=post_data
            )

            if post_response.status_code == 200:
                post_id = post_response.json().get("data", {}).get("publish_id")
                return {
                    "status": "published",
                    "message": "Video published to TikTok successfully",
                    "post_id": post_id,
                    "url": f"https://www.tiktok.com/@andra.kiirkivi/video/{post_id}"
                }
            else:
                return {
                    "status": "publish_failed",
                    "message": post_response.text
                }

        except Exception as e:
            return {
                "status": "error",
                "message": f"Publishing error: {str(e)}"
            }

    def get_video_analytics(self, video_id):
        """Get TikTok video performance metrics"""
        try:
            response = requests.get(
                f"{self.api_base}/video/query",
                headers={"Authorization": f"Bearer {self.access_token}"},
                params={"ids": video_id}
            )

            if response.status_code == 200:
                video_data = response.json().get("data", {})
                return {
                    "video_id": video_id,
                    "views": video_data.get("statistics", {}).get("view_count", 0),
                    "likes": video_data.get("statistics", {}).get("like_count", 0),
                    "comments": video_data.get("statistics", {}).get("comment_count", 0),
                    "shares": video_data.get("statistics", {}).get("share_count", 0),
                }
            else:
                return {"status": "error", "message": response.text}

        except Exception as e:
            return {"status": "error", "message": str(e)}

    def is_authorized(self):
        """Check if TikTok account is authorized"""
        return bool(self.access_token)


def analyze():
    """Check TikTok authorization status"""
    client = TikTokClient()
    client.load_stored_tokens()

    if client.is_authorized():
        return {
            "status": "authorized",
            "account": "@andra.kiirkivi",
            "message": "TikTok account is connected and ready to publish",
            "ready_to_publish": True
        }
    else:
        return {
            "status": "not_authorized",
            "message": "TikTok authorization needed",
            "authorization_url": client.get_authorization_url(),
            "ready_to_publish": False
        }
