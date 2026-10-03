"""
Daily upload helper - downloads video and opens YouTube Studio ready for upload
Run at 6 AM daily via launchd
"""

import json
import os
import time
import subprocess
from datetime import datetime
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials

HERE = os.path.dirname(os.path.abspath(__file__))
CREDS_DIR = os.path.join(HERE, "credentials")
AI_REELS_FOLDER_ID = "1RXU3oytYzEVmmGH15HdzJus94OObFjre"
POSTED_FILE = os.path.join(CREDS_DIR, "posted_youtube_reels.json")
DOWNLOAD_DIR = os.path.expanduser("~/Downloads")

def get_next_reel_and_download():
    """Download next unposted reel from Google Drive"""

    with open(os.path.join(CREDS_DIR, "token_boatrentalinmarbella_full.json")) as f:
        token_data = json.load(f)

    with open(os.path.join(CREDS_DIR, "client_secret.json")) as f:
        client_data = json.load(f)['installed']

    creds = Credentials(
        token=token_data['access_token'],
        refresh_token=token_data.get('refresh_token'),
        token_uri='https://oauth2.googleapis.com/token',
        client_id=client_data['client_id'],
        client_secret=client_data['client_secret'],
    )

    drive = build('drive', 'v3', credentials=creds)

    # Get posted videos
    posted = set()
    if os.path.exists(POSTED_FILE):
        with open(POSTED_FILE) as f:
            posted = set(json.load(f))

    # Find next unposted reel
    results = drive.files().list(
        q=f"'{AI_REELS_FOLDER_ID}' in parents and name contains 'reel_marbella_'",
        orderBy="name desc",
        fields="files(id,name)",
        pageSize=1
    ).execute()

    for file in results.get('files', []):
        if file['id'] not in posted:
            print(f"📹 Found: {file['name']}")

            # Download to Downloads folder
            request = drive.files().get_media(fileId=file['id'])
            local_path = os.path.join(DOWNLOAD_DIR, file['name'])

            print(f"⬇️  Downloading to: {local_path}")
            with open(local_path, 'wb') as f:
                f.write(request.execute())

            return {
                'file_id': file['id'],
                'name': file['name'],
                'local_path': local_path
            }

    print("✅ No new videos to upload")
    return None

def open_youtube_studio():
    """Open YouTube Studio for Boat Rental channel"""
    url = "https://studio.youtube.com/channel/UCu75EPcHSqjpjepdR5nq2iQ"
    print(f"\n🎥 Opening YouTube Studio...")
    subprocess.Popen(['open', url])
    time.sleep(2)

def create_notification(video_info):
    """Create macOS notification"""
    if not video_info:
        return

    title = "Boat Rental Video Ready"
    message = f"Video ready to upload: {video_info['name']}\n\nFile: {video_info['local_path']}"

    script = f"""
    display notification "{message}" with title "{title}" subtitle "Click to upload in YouTube Studio"
    """

    subprocess.run(['osascript', '-e', script])
    print(f"📬 Notification sent")

def main():
    print("=" * 70)
    print("🚤 Daily YouTube Upload Helper")
    print("=" * 70)
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()

    # Get and download next video
    video_info = get_next_reel_and_download()

    if video_info:
        print()
        print("📋 NEXT STEPS:")
        print("1. YouTube Studio will open in your browser")
        print("2. Click 'Create' → 'Upload video'")
        print("3. Select the video from Downloads:")
        print(f"   → {video_info['name']}")
        print("4. Fill in:")
        print("   - Title: Boat Rental Marbella | Puerto Banús #Shorts")
        print("   - Description: Your perfect boat rental Marbella starts right here")
        print("     in Puerto Banús. Hassle-free -- skipper, fuel & insurance")
        print("     included. https://boatrentalinmarbella.com/")
        print("   - Privacy: Public")
        print("5. Click 'Publish'")
        print()

        open_youtube_studio()
        create_notification(video_info)

        # Save metadata for reference
        with open(os.path.join(CREDS_DIR, "current_upload.json"), 'w') as f:
            json.dump(video_info, f)

        print("✅ Video staged and YouTube Studio opened!")
    else:
        print("No new videos to process")

    print("=" * 70)

if __name__ == "__main__":
    main()
