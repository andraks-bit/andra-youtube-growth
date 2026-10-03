"""Daily posting job: publishes one Blogger post on each blog, and uploads
the newest not-yet-posted AI reel to YouTube as a public video. Run once per day
(via launchd/cron). All credentials must already be authorized -- see auth.py.
"""

import json
import os
import tempfile
from datetime import date
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from google.oauth2.credentials import Credentials

HERE = os.path.dirname(os.path.abspath(__file__))
CREDS_DIR = os.path.join(HERE, "credentials")

BLOGS = {
    "marbella": {
        "blog_id": "5347820828408620730",
        "topics_file": "topics.json",
        "label": "BOAT RENTAL IN MARBELLA",
        "link": "https://boatrentalinmarbella.com",
    },
    "boathire24": {
        "blog_id": "4858233363667605156",
        "topics_file": "topics_boathire24.json",
        "label": None,
        "link": "https://boathire24.com",
    },
}

AI_REELS_FOLDER_ID = "1RXU3oytYzEVmmGH15HdzJus94OObFjre"
BOAT_RENTAL_CHANNEL_ID = "UCu75EPcHSqjpjepdR5nq2iQ"


def load_credentials(account_label: str) -> Credentials:
    with open(os.path.join(CREDS_DIR, "client_secret.json")) as f:
        client = json.load(f)["installed"]
    with open(os.path.join(CREDS_DIR, f"token_{account_label}.json")) as f:
        tok = json.load(f)
    return Credentials(
        token=tok["access_token"],
        refresh_token=tok.get("refresh_token"),
        token_uri="https://oauth2.googleapis.com/token",
        client_id=client["client_id"],
        client_secret=client["client_secret"],
    )


def next_topic(account_label: str, topics_file: str) -> dict:
    with open(os.path.join(HERE, topics_file)) as f:
        topics = json.load(f)
    state_file = os.path.join(CREDS_DIR, f"topic_state_{account_label}.json")
    idx = 0
    if os.path.exists(state_file):
        with open(state_file) as f:
            idx = (json.load(f).get("last_index", -1) + 1) % len(topics)
    with open(state_file, "w") as f:
        json.dump({"last_index": idx}, f)
    return topics[idx]


def render_post(topic: dict, link: str) -> str:
    keywords = ", ".join(topic["keywords"])
    return f"""
    <p>{topic['title']} -- here's what to know if you're planning a trip on the water in Marbella.</p>
    <p>Key highlights: {keywords}.</p>
    <p><a href="{link}">Browse our fleet</a> to check availability and book.</p>
    """.strip()


def post_to_blog(account_label: str, config: dict):
    creds = load_credentials(account_label)
    service = build("blogger", "v3", credentials=creds)
    topic = next_topic(account_label, config["topics_file"])
    body = {
        "title": f"{topic['title']} ({date.today().strftime('%B %Y')})",
        "content": render_post(topic, config["link"]),
    }
    if config["label"]:
        body["labels"] = [config["label"]]
    result = service.posts().insert(blogId=config["blog_id"], body=body, isDraft=False).execute()
    print(f"[{account_label}] Published: {result.get('url')}")


def publish_all_drafts():
    """Find and publish all unlisted/draft videos."""
    yt_creds = load_credentials("boatrentalinmarbella_youtube")
    yt = build("youtube", "v3", credentials=yt_creds)

    try:
        channels = yt.channels().list(part='contentDetails', id=BOAT_RENTAL_CHANNEL_ID).execute()
        uploads_id = channels['items'][0]['contentDetails']['relatedPlaylists']['uploads']
    except Exception as e:
        print(f"Could not get channel uploads: {e}")
        return

    unlisted_count = 0
    next_page_token = None

    while True:
        try:
            results = yt.playlistItems().list(
                playlistId=uploads_id,
                part='contentDetails',
                maxResults=50,
                pageToken=next_page_token
            ).execute()

            video_ids = [item['contentDetails']['videoId'] for item in results.get('items', [])]

            if video_ids:
                videos = yt.videos().list(
                    id=','.join(video_ids),
                    part='snippet,status'
                ).execute()

                for item in videos.get('items', []):
                    status = item['status']['privacyStatus']
                    title = item['snippet']['title']
                    vid = item['id']

                    if status in ['unlisted', 'private']:
                        yt.videos().update(
                            part='status',
                            body={'id': vid, 'status': {'privacyStatus': 'public'}}
                        ).execute()
                        print(f"✅ Published draft: {title}")
                        unlisted_count += 1

            next_page_token = results.get('nextPageToken')
            if not next_page_token:
                break
        except Exception as e:
            print(f"Error publishing drafts: {e}")
            break

    if unlisted_count > 0:
        print(f"Published {unlisted_count} draft(s) to public.")
    else:
        print("No drafts found.")


def upload_next_reel():
    """Upload next reel from Google Drive to YouTube"""
    creds = load_credentials("boatrentalinmarbella_full")
    drive = build("drive", "v3", credentials=creds)
    yt = build("youtube", "v3", credentials=creds)

    posted_file = os.path.join(CREDS_DIR, "posted_youtube_reels.json")
    posted = set()
    if os.path.exists(posted_file):
        with open(posted_file) as f:
            posted = set(json.load(f))

    # Get next unposted reel
    results = drive.files().list(
        q=f"'{AI_REELS_FOLDER_ID}' in parents and name contains 'reel_marbella_'",
        orderBy="name desc",
        fields="files(id,name)",
        pageSize=1,
    ).execute()

    reel = None
    for file in results.get("files", []):
        if file["id"] not in posted:
            reel = file
            break

    if not reel:
        print("No new reels to upload.")
        return

    print(f"Uploading reel: {reel['name']}")

    # Download video
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
        request = drive.files().get_media(fileId=reel["id"])
        tmp.write(request.execute())
        tmp_path = tmp.name

    try:
        title = "Boat Rental Marbella | Puerto Banús #Shorts"
        description = (
            "Your perfect boat rental Marbella starts right here in Puerto Banús. "
            "Hassle-free -- skipper, fuel & insurance included. "
            "https://boatrentalinmarbella.com/"
        )

        body = {
            "snippet": {
                "title": title,
                "description": description,
                "categoryId": "19",
                "tags": ["boat rental", "marbella", "puerto banús", "yacht"],
            },
            "status": {"privacyStatus": "public"},
        }

        media = MediaFileUpload(tmp_path, mimetype="video/mp4", resumable=True)
        upload = yt.videos().insert(
            part="snippet,status",
            body=body,
            media_body=media
        ).execute()

        video_id = upload['id']
        print(f"✅ Uploaded: https://youtube.com/watch?v={video_id}")

        # Mark as posted
        posted.add(reel["id"])
        with open(posted_file, "w") as f:
            json.dump(list(posted), f)

    except Exception as e:
        print(f"❌ Upload failed: {e}")

    finally:
        os.unlink(tmp_path)


if __name__ == "__main__":
    print("=" * 60)
    print("🚤 Daily Boat Rental Marbella Automation")
    print("=" * 60)

    # Publish any draft videos first
    print("\n[1/3] Publishing draft videos...")
    publish_all_drafts()

    # Post to blogs
    print("\n[2/3] Posting to blogs...")
    for label, config in BLOGS.items():
        try:
            post_to_blog(label, config)
        except Exception as e:
            print(f"[{label}] Skipped: {e}")

    # Upload new reels
    print("\n[3/3] Uploading new reels...")
    upload_next_reel()

    print("\n" + "=" * 60)
    print("✅ Daily automation complete!")
    print("=" * 60)
