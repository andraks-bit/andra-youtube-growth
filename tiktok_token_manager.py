#!/usr/bin/env python3
"""
TikTok Token Manager - Automatic Refresh Token Handling

Manages TikTok OAuth tokens for Production Content Posting API.
Automatically refreshes access tokens using stored refresh token.

This runs as part of daily YouTube growth automation.
No manual OAuth re-authentication needed after initial Production approval.
"""

import os
import json
import requests
from datetime import datetime, timedelta

class TikTokTokenManager:
    """Manages TikTok OAuth tokens with automatic refresh."""

    def __init__(self):
        # Production credentials (from GitHub Secrets)
        self.client_id = os.environ.get("TIKTOK_CLIENT_ID")
        self.client_secret = os.environ.get("TIKTOK_CLIENT_SECRET")

        # Refresh token from GitHub Secrets (ONE-TIME, set after initial OAuth)
        self.refresh_token = os.environ.get("TIKTOK_REFRESH_TOKEN")

        # Token file for local caching
        self.token_file = "/tmp/tiktok_access_token.json"

        # TikTok token endpoint
        self.token_endpoint = "https://open.tiktokapis.com/v2/oauth/token/"

    def get_access_token(self):
        """
        Get valid access token.
        Returns cached token if still valid, refreshes if expired.
        """
        # Try to load cached token
        if os.path.exists(self.token_file):
            try:
                with open(self.token_file) as f:
                    data = json.load(f)
                    expires_at = datetime.fromisoformat(data.get("expires_at", ""))

                    # If token valid for next 5 minutes, use it
                    if expires_at > datetime.now() + timedelta(minutes=5):
                        return data["access_token"]
            except (json.JSONDecodeError, KeyError, ValueError):
                pass

        # Token missing, expired, or invalid - refresh it
        return self._refresh_access_token()

    def _refresh_access_token(self):
        """
        Refresh access token using refresh token.
        Called automatically when access token expires.
        """
        if not self.refresh_token:
            raise RuntimeError(
                "TikTok refresh token not set in GitHub Secrets.\n"
                "Required setup: TIKTOK_REFRESH_TOKEN (from initial Production OAuth)"
            )

        payload = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "grant_type": "refresh_token",
            "refresh_token": self.refresh_token,
        }

        try:
            response = requests.post(self.token_endpoint, json=payload, timeout=10)
            response.raise_for_status()

            data = response.json()
            access_token = data.get("access_token")
            expires_in = data.get("expires_in", 3600)  # Default 1 hour

            if not access_token:
                raise ValueError("No access_token in TikTok response")

            # Cache token with expiration time
            expires_at = (datetime.now() + timedelta(seconds=expires_in)).isoformat()
            cache = {
                "access_token": access_token,
                "expires_at": expires_at,
                "refreshed_at": datetime.now().isoformat(),
            }

            with open(self.token_file, "w") as f:
                json.dump(cache, f)

            return access_token

        except requests.RequestException as e:
            raise RuntimeError(f"Failed to refresh TikTok token: {e}")

    def is_configured(self):
        """Check if TikTok is properly configured for automatic posting."""
        return bool(
            self.client_id
            and self.client_secret
            and self.refresh_token
        )


def get_tiktok_access_token():
    """Convenience function for getting access token."""
    manager = TikTokTokenManager()
    if not manager.is_configured():
        return None
    return manager.get_access_token()
