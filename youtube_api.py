"""
YouTube Data API v3 and YouTube Analytics API v2 client.

Through Step 5 this file was structurally read-only (.list / reports.query
only). Step 6 adds a small, explicit set of write methods (update_video_
snippet, create_playlist, add_video_to_playlist) needed for the approval
workflow to actually apply a human-approved change -- but every write
method here is only ever called from approval_workflow.apply_approved(),
which is the single point in this codebase that checks
config.youtube_writes_enabled() before calling any of them. Nothing else
in this codebase calls a write method, and the OAuth scope that makes this
possible (`youtube`, full manage) was already granted back in Step 1 --
no new consent was needed.
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


def _post(url, token, params=None, json_body=None):
    resp = requests.post(url, params=params or {}, json=json_body,
                          headers={"Authorization": f"Bearer {token}"})
    if resp.status_code not in (200, 201):
        raise ApiError(f"POST {url} failed (HTTP {resp.status_code}): {resp.text}")
    return resp.json()


def _put(url, token, params=None, json_body=None):
    # videos.update is documented as HTTP PUT, unlike the .insert endpoints
    # (playlists.insert, playlistItems.insert) which are POST. Caught this
    # via code review before the Step 7 pilot write -- POST would very
    # likely have 405'd or behaved unpredictably against this endpoint.
    resp = requests.put(url, params=params or {}, json=json_body,
                         headers={"Authorization": f"Bearer {token}"})
    if resp.status_code != 200:
        raise ApiError(f"PUT {url} failed (HTTP {resp.status_code}): {resp.text}")
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

    # ---- Write methods (Step 6) -- only ever called from
    # approval_workflow.apply_approved() after it has verified
    # config.youtube_writes_enabled() AND human approval. Never call these
    # directly from anywhere else. ----

    def get_video_snippet(self, video_id):
        """Current snippet, needed before any update -- videos.update replaces
        the whole `snippet` part, so fields not being changed must be re-sent
        unchanged or YouTube will blank them."""
        data = _get(f"{DATA_API}/videos", self.token, {"part": "snippet", "id": video_id})
        items = data.get("items", [])
        if not items:
            raise ApiError(f"video {video_id} not found")
        return items[0]["snippet"]

    def update_video_snippet(self, video_id, title=None, description=None, tags=None):
        current = self.get_video_snippet(video_id)
        # Start from every writable field YouTube returned (not just the 3-4
        # we usually touch) so nothing already set -- e.g. defaultLanguage --
        # gets silently dropped by the full-object replace semantics of
        # videos.update. Only output-only fields (channelId, publishedAt,
        # thumbnails, localized, etc.) are excluded.
        writable_fields = ("title", "description", "tags", "categoryId",
                            "defaultLanguage", "defaultAudioLanguage")
        snippet = {k: current[k] for k in writable_fields if k in current}
        if title is not None:
            snippet["title"] = title
        if description is not None:
            snippet["description"] = description
        if tags is not None:
            snippet["tags"] = tags
        snippet.setdefault("tags", [])
        return _put(f"{DATA_API}/videos", self.token, params={"part": "snippet"},
                    json_body={"id": video_id, "snippet": snippet})

    def list_playlists(self, max_results=50):
        data = _get(f"{DATA_API}/playlists", self.token, {
            "part": "snippet", "mine": "true", "maxResults": max_results,
        })
        return data.get("items", [])

    def create_playlist(self, title, description=""):
        return _post(f"{DATA_API}/playlists", self.token, params={"part": "snippet,status"},
                     json_body={
                         "snippet": {"title": title, "description": description},
                         "status": {"privacyStatus": "public"},
                     })

    def add_video_to_playlist(self, playlist_id, video_id):
        return _post(f"{DATA_API}/playlistItems", self.token, params={"part": "snippet"},
                     json_body={"snippet": {
                         "playlistId": playlist_id,
                         "resourceId": {"kind": "youtube#video", "videoId": video_id},
                     }})
