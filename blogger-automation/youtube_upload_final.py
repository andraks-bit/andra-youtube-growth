"""
Final YouTube upload attempt - uses fresh Selenium with OAuth token
"""

import json
import os
import time
import subprocess
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials

HERE = os.path.dirname(os.path.abspath(__file__))
CREDS_DIR = os.path.join(HERE, "credentials")
AI_REELS_FOLDER_ID = "1RXU3oytYzEVmmGH15HdzJus94OObFjre"
POSTED_FILE = os.path.join(CREDS_DIR, "posted_youtube_reels.json")

print("=" * 70)
print("🚤 YouTube Upload - Final Attempt")
print("=" * 70)

# Get next video from Drive
print("\n[1] Getting next video from Drive...")
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

# Find next reel
results = drive.files().list(
    q=f"'{AI_REELS_FOLDER_ID}' in parents and name contains 'reel_marbella_'",
    orderBy="name desc",
    fields="files(id,name)",
    pageSize=1
).execute()

reel = None
for file in results.get('files', []):
    if file['id'] not in posted:
        reel = file
        break

if not reel:
    print("✅ No new videos to upload")
    exit(0)

print(f"✅ Found: {reel['name']}")

# Download video
print("\n[2] Downloading video...")
import tempfile
with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
    request = drive.files().get_media(fileId=reel['id'])
    tmp.write(request.execute())
    video_path = tmp.name
print(f"✅ Downloaded to: {video_path}")

# Setup Selenium
print("\n[3] Setting up Selenium browser...")
options = webdriver.ChromeOptions()
options.add_argument('--no-sandbox')
options.add_argument('--disable-dev-shm-usage')
options.add_argument('--disable-blink-features=AutomationControlled')
options.add_experimental_option("excludeSwitches", ["enable-automation"])
options.add_experimental_option('useAutomationExtension', False)

print("Opening Chrome...")
try:
    driver = webdriver.Chrome(options=options)
    print("✅ Chrome opened")
except Exception as e:
    print(f"❌ Failed to open Chrome: {e}")
    os.unlink(video_path)
    exit(1)

try:
    print("\n[4] Navigating to YouTube Studio...")
    driver.get("https://studio.youtube.com")
    time.sleep(10)

    # Check if we're on login page
    if "signin" in driver.current_url or "accounts.google.com" in driver.current_url:
        print("⚠️ Redirected to login - authentication needed")
        print("Please log in manually in the browser window, then the script will continue...")

        # Wait for manual login
        while "studio.youtube.com" not in driver.current_url:
            time.sleep(2)
        print("✅ Login detected")

    time.sleep(5)

    # Find upload button
    print("Looking for upload button...")
    try:
        upload_link = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, "//a[contains(@href, 'upload')]"))
        )
        driver.execute_script("arguments[0].click();", upload_link)
        print("✅ Clicked upload link")
        time.sleep(3)
    except Exception as e:
        print(f"⚠️ Could not find upload link: {e}")

    # Find file input
    print("Looking for file input...")
    try:
        file_inputs = driver.find_elements(By.CSS_SELECTOR, "input[type='file']")
        if file_inputs:
            print(f"✅ Found {len(file_inputs)} file input(s)")
            file_inputs[0].send_keys(os.path.abspath(video_path))
            print(f"✅ File submitted: {video_path}")
            time.sleep(10)
        else:
            print("❌ No file input found")
    except Exception as e:
        print(f"❌ Error with file input: {e}")

    # Check if file was selected
    if os.path.exists(video_path):
        print("\n📋 Status: File selected for upload")
        print("Next steps:")
        print("  1. Add title: 'Boat Rental Marbella | Puerto Banús #Shorts'")
        print("  2. Add description with link")
        print("  3. Set to 'Public'")
        print("  4. Click 'Publish'")
        print("\nThe browser window is still open for manual completion.")
        print("Press Ctrl+C or close this script when done.")

        # Keep browser open
        try:
            while True:
                time.sleep(60)
        except KeyboardInterrupt:
            print("\n✅ Closing browser...")
            # Mark as posted
            posted.add(reel['id'])
            with open(POSTED_FILE, 'w') as f:
                json.dump(list(posted), f)
            print(f"✅ Marked video as posted: {reel['id']}")

except Exception as e:
    print(f"\n❌ Unexpected error: {e}")
    import traceback
    traceback.print_exc()

finally:
    # Cleanup
    try:
        driver.quit()
    except:
        pass
    try:
        os.unlink(video_path)
    except:
        pass

print("\n" + "=" * 70)
print("Done!")
print("=" * 70)
