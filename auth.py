"""
OAuth access-token retrieval for the YouTube Growth System.

Read-only by construction: nothing in this codebase ever calls a write
endpoint (videos.update, thumbnails.set, etc). The granted scopes include
youtube/youtube.upload only because they were already granted to the shared
client for the unrelated Blogger/Shorts pipeline -- this system simply never
exercises them.

Credential resolution order:
  1. Environment variables YT_CLIENT_ID / YT_CLIENT_SECRET / YT_REFRESH_TOKEN
     (used in GitHub Actions, populated from repo secrets).
  2. Local files under ../blogger-automation/credentials/ (used for local
     dev/testing on this machine -- reuses the Step 1 Analytics-scoped grant
     instead of duplicating a second OAuth app).
"""
import json
import os

import requests

import config

TOKEN_URL = "https://oauth2.googleapis.com/token"


class AuthError(RuntimeError):
    pass


def _load_local_client():
    with open(config.LEGACY_CLIENT_SECRET_FILE) as f:
        return json.load(f)["installed"]


def _load_local_refresh_token():
    with open(config.LEGACY_TOKEN_FILE) as f:
        return json.load(f)["refresh_token"]


def get_credentials():
    """Return (client_id, client_secret, refresh_token) from env or local files."""
    client_id = os.environ.get("YT_CLIENT_ID")
    client_secret = os.environ.get("YT_CLIENT_SECRET")
    refresh_token = os.environ.get("YT_REFRESH_TOKEN")

    if client_id and client_secret and refresh_token:
        return client_id, client_secret, refresh_token, "environment"

    try:
        client = _load_local_client()
        refresh_token = _load_local_refresh_token()
        return client["client_id"], client["client_secret"], refresh_token, "local_file"
    except FileNotFoundError as e:
        raise AuthError(
            "No credentials found. Set YT_CLIENT_ID/YT_CLIENT_SECRET/YT_REFRESH_TOKEN "
            f"env vars, or ensure {config.LEGACY_TOKEN_FILE} exists locally."
        ) from e


def get_access_token():
    """Refresh and return a fresh access token. Raises AuthError on failure."""
    client_id, client_secret, refresh_token, source = get_credentials()
    resp = requests.post(TOKEN_URL, data={
        "client_id": client_id,
        "client_secret": client_secret,
        "refresh_token": refresh_token,
        "grant_type": "refresh_token",
    })
    if resp.status_code != 200:
        raise AuthError(
            f"Token refresh failed (source={source}, HTTP {resp.status_code}): {resp.text}\n"
            "If this is invalid_grant, the refresh token has expired (Google 'Testing' "
            "publish status expires refresh tokens after 7 days) and needs manual "
            "re-authorization -- see README.md."
        )
    return resp.json()["access_token"], source
