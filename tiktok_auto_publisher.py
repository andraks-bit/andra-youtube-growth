#!/usr/bin/env python3
"""
TikTok Auto Publisher - Automatic Daily Video Publishing

Runs as part of the Daily YouTube Growth Worker.
After each YouTube upload:
1. Gets valid TikTok access token (auto-refreshes if expired)
2. Uploads video to TikTok
3. Publishes to TikTok channel
4. No manual intervention required

This is fully automatic after Production OAuth approval.
"""

import os
import sys
import json
import requests
from pathlib import Path
from tiktok_token_manager import get_tiktok_access_token

class TikTokAutoPublisher:
    """Automatically publishes videos to TikTok Production."""

    def __init__(self):
        self.upload_endpoint = "https://open.tiktokapis.com/v2/post/publish/upload/"
        self.publish_endpoint = "https://open.tiktokapis.com/v2/post/publish/action/publish/"

    def publish_video(self, video_path: str, title: str = "", description: str = "") -> bool:
        """
        Publish video to TikTok Production.

        Args:
            video_path: Path to MP4 video file
            title: Video title
            description: Video description/caption

        Returns:
            True if successful, False otherwise
        """
        # Get valid access token (auto-refreshes if needed)
        access_token = get_tiktok_access_token()
        if not access_token:
            print("❌ TikTok auto-publisher disabled (no refresh token in GitHub Secrets)")
            print("   Set TIKTOK_REFRESH_TOKEN after Production OAuth approval")
            return False

        if not os.path.exists(video_path):
            print(f"❌ Video file not found: {video_path}")
            return False

        try:
            # Step 1: Upload video
            print(f"📤 Uploading video to TikTok: {Path(video_path).name}")
            upload_response = self._upload_video(video_path, access_token)

            if not upload_response:
                return False

            upload_id = upload_response.get("upload_id")
            if not upload_id:
                print("❌ No upload_id in TikTok response")
                return False

            # Step 2: Publish video
            print(f"📢 Publishing to TikTok: {title or 'Video'}")
            publish_response = self._publish_video(
                upload_id, title, description, access_token
            )

            if publish_response:
                publish_id = publish_response.get("publish_id")
                print(f"✅ Successfully published to TikTok (ID: {publish_id})")
                return True

            return False

        except Exception as e:
            print(f"❌ TikTok publishing failed: {e}")
            return False

    def _upload_video(self, video_path: str, access_token: str) -> dict | None:
        """Upload video to TikTok."""
        try:
            with open(video_path, "rb") as f:
                files = {"video": f}
                headers = {"Authorization": f"Bearer {access_token}"}

                response = requests.post(
                    self.upload_endpoint,
                    files=files,
                    headers=headers,
                    timeout=60,
                )
                response.raise_for_status()

                data = response.json()
                if data.get("error"):
                    print(f"❌ Upload error: {data.get('error_description', 'Unknown')}")
                    return None

                return data.get("data", {})

        except requests.RequestException as e:
            print(f"❌ Upload failed: {e}")
            return None

    def _publish_video(
        self, upload_id: str, title: str, description: str, access_token: str
    ) -> dict | None:
        """Publish uploaded video."""
        try:
            payload = {
                "media_type": upload_id,
                "post_info": {
                    "desc": f"{title}\n{description}" if description else title,
                    "disable_comment": False,
                    "disable_duet": False,
                    "disable_stitch": False,
                },
            }

            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            }

            response = requests.post(
                self.publish_endpoint,
                json=payload,
                headers=headers,
                timeout=30,
            )
            response.raise_for_status()

            data = response.json()
            if data.get("error"):
                print(f"❌ Publish error: {data.get('error_description', 'Unknown')}")
                return None

            return data.get("data", {})

        except requests.RequestException as e:
            print(f"❌ Publish failed: {e}")
            return None


def auto_publish_latest_youtube_video():
    """
    Auto-publish the latest YouTube video to TikTok.
    Called by daily YouTube growth automation.
    """
    # Find latest YouTube video
    video_dir = "/tmp"
    video_file = None

    for f in sorted(Path(video_dir).glob("*youtube*.mp4"), reverse=True):
        video_file = str(f)
        break

    if not video_file:
        print("⏭️ No YouTube video found to publish to TikTok")
        return False

    # Get video metadata if available
    title = "Check out this video! 🎬"
    description = "Watch on YouTube: https://youtube.com/@boathire24"

    # Publish to TikTok
    publisher = TikTokAutoPublisher()
    return publisher.publish_video(video_file, title, description)


if __name__ == "__main__":
    success = auto_publish_latest_youtube_video()
    sys.exit(0 if success else 1)
