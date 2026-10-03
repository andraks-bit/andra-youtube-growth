"""One-time OAuth authorization for a Google account. Run in two steps:

  python3 auth.py url [marbella|boathire24]
      -> prints the consent URL to open (in the browser logged into that account)

  python3 auth.py exchange [marbella|boathire24] "<redirected-url-or-code>"
      -> exchanges the code from the redirect for tokens, saves token file

After clicking Allow, the browser will try to load http://localhost/?code=...
and fail to connect -- that's expected. Copy the full URL from the address
bar (or just the `code` value) and pass it to the exchange step.
"""

import json
import os
import sys
import urllib.parse

import requests

SCOPES = " ".join([
    "https://www.googleapis.com/auth/blogger",
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/yt-analytics.readonly",
])

HERE = os.path.dirname(os.path.abspath(__file__))
CLIENT_SECRET_FILE = os.path.join(HERE, "credentials", "client_secret.json")

AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
REDIRECT_URI = "http://localhost"


def load_client():
    with open(CLIENT_SECRET_FILE) as f:
        data = json.load(f)["installed"]
    return data["client_id"], data["client_secret"]


def build_url():
    client_id, _ = load_client()
    params = {
        "client_id": client_id,
        "redirect_uri": REDIRECT_URI,
        "response_type": "code",
        "scope": SCOPES,
        "access_type": "offline",
        "prompt": "consent",
    }
    return f"{AUTH_URL}?{urllib.parse.urlencode(params)}"


def extract_code(raw: str) -> str:
    if "code=" not in raw:
        return raw.strip()
    parsed = urllib.parse.urlparse(raw)
    qs = urllib.parse.parse_qs(parsed.query)
    return qs["code"][0]


def exchange(account_label: str, raw: str):
    client_id, client_secret = load_client()
    code = extract_code(raw)
    resp = requests.post(TOKEN_URL, data={
        "client_id": client_id,
        "client_secret": client_secret,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": REDIRECT_URI,
    })
    resp.raise_for_status()
    token_file = os.path.join(HERE, "credentials", f"token_{account_label}.json")
    with open(token_file, "w") as f:
        json.dump(resp.json(), f)
    print(f"Authorized. Token saved to {token_file}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    if sys.argv[1] == "url":
        print(build_url())
    elif sys.argv[1] == "exchange":
        exchange(sys.argv[2], sys.argv[3])
    else:
        print(__doc__)
        sys.exit(1)
