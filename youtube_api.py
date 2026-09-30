"""
Thin, explicitly read-only wrapper around YouTube Data API v3 and
YouTube Analytics API v2.

Every function here issues a GET request against a .list or reports.query
endpoint. There is no function in this file capable of modifying, deleting,
publishing, or uploading anything -- that is a deliberate structural
guardrail, not just a policy note.
"""
import requests

import auth
import config

DATA_API = "https://www.googleapis.com/youtube/v3"
ANALYTICS_API = "https://youtubeanalytics.googleapis.com/v2/reports"


class ApiError(RuntimeError):
    pass


def _get(url, token, params):
    resp = requests.get(url, params=params, headers={"Authorization": f"Bearer {token}"})
    if resp.status_code != 200:
        raise ApiError(f"GET {url} failed (HTTP {resp.status_code}): {resp.text}")
    return resp.json()


class YouTubeClient:
    def __init__(self):
        self.token, self.token_source = auth.get_access_token()

    # ---- Data API (read-only: .list calls only) ----

    def get_my_channel(self):
        data = _get(f"{DATA_API}/channels", self.token, {
            "part": "snippet,statistics,contentDetails",
            "mine": "true",
        })
        return data["items"][0]

    def list_uploads(self, uploads_playlist_id, max_results=50, page_token=None):
        params = {
            "part": "contentDetails",
            "playlistId": uploads_playlist_id,
            "maxResults": max_results,
        }
        if page_token:
            params["pageToken"] = page_token
        return _get(f"{DATA_API}/playlistItems", self.token, params)

    def get_videos(self, video_ids):
        """video_ids: list of up to 50 IDs per call (Data API limit)."""
        out = []
        for i in range(0, len(video_ids), 50):
            chunk = video_ids[i:i + 50]
            data = _get(f"{DATA_API}/videos", self.token, {
                "part": "snippet,statistics,contentDetails,status",
                "id": ",".join(chunk),
            })
            out.extend(data.get("items", []))
        return out

    # ---- Analytics API (read-only: reports.query only) ----

    def analytics_query(self, **params):
        # Explicit channel ID rather than the "MINE" token: the shared OAuth
        # client behind this token has been used for other accounts too
        # (see Step 1 audit), so we pin to the verified Andra Kiirkivi
        # channel rather than trusting whichever token happens to be active.
        params.setdefault("ids", f"channel=={config.CHANNEL_ID}")
        return _get(ANALYTICS_API, self.token, params)
