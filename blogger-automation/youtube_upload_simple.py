"""
Simple YouTube upload approach - manually verify and run daily
"""

import os
import json
from datetime import datetime

def generate_daily_report():
    """Generate report of what needs to be uploaded"""
    CREDS_DIR = "/Users/nunnu/Desktop/boathire/blogger-automation/credentials"
    HERE = os.path.dirname(os.path.abspath(__file__))

    # Get list of unposted videos
    from googleapiclient.discovery import build
    from google.oauth2.credentials import Credentials

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
    posted_file = os.path.join(CREDS_DIR, "posted_youtube_reels.json")
    if os.path.exists(posted_file):
        with open(posted_file) as f:
            posted = set(json.load(f))

    # Find next unposted reel
    AI_REELS_FOLDER_ID = "1RXU3oytYzEVmmGH15HdzJus94OObFjre"
    results = drive.files().list(
        q=f"'{AI_REELS_FOLDER_ID}' in parents and name contains 'reel_marbella_'",
        orderBy="name desc",
        fields="files(id,name)",
        pageSize=1
    ).execute()

    next_reel = None
    for file in results.get('files', []):
        if file['id'] not in posted:
            next_reel = file
            break

    report = {
        "timestamp": datetime.now().isoformat(),
        "posted_count": len(posted),
        "next_reel": next_reel['name'] if next_reel else None,
        "next_reel_id": next_reel['id'] if next_reel else None,
        "youtube_studio_url": "https://studio.youtube.com/channel/UCu75EPcHSqjpjepdR5nq2iQ/uploads",
        "instructions": [
            "1. Open YouTube Studio link above",
            "2. Click 'Create' → 'Upload video'",
            "3. Select the video from ~/Downloads/ or the file picker",
            "4. Title: 'Boat Rental Marbella | Puerto Banús #Shorts'",
            "5. Description: 'Your perfect boat rental Marbella starts right here in Puerto Banús. Hassle-free -- skipper, fuel & insurance included. https://boatrentalinmarbella.com/'",
            "6. Set to 'Public'",
            "7. Click 'Publish'"
        ]
    }

    return report

if __name__ == "__main__":
    print("=" * 70)
    print("YouTube Daily Upload Report")
    print("=" * 70)

    report = generate_daily_report()
    print(f"\nTimestamp: {report['timestamp']}")
    print(f"Videos posted so far: {report['posted_count']}")
    print(f"Next video to upload: {report['next_reel']}")
    print(f"\nManual Upload Instructions:")
    for instruction in report['instructions']:
        print(f"  {instruction}")
    print(f"\nYouTube Studio: {report['youtube_studio_url']}")
    print("\n" + "=" * 70)
