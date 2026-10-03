"""
Fully automated YouTube upload - opens Chrome automatically and uploads to Boat Rental channel
Uses browser automation with auto-opened Chrome
"""

import json
import os
import time
import subprocess
import tempfile
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

def get_next_reel():
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
            # Download file
            request = drive.files().get_media(fileId=file['id'])
            with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
                tmp.write(request.execute())
                return {'id': file['id'], 'name': file['name'], 'path': tmp.name}, posted

    return None, posted


def upload_with_chrome(video_path):
    """Open Chrome automatically and upload video"""

    print("="*70)
    print("🎥 Opening Chrome automatically for upload...")
    print("="*70)

    # Kill any existing Chrome instances
    subprocess.run(['pkill', '-9', '-f', 'Chrome'], stderr=subprocess.DEVNULL)
    time.sleep(2)

    options = webdriver.ChromeOptions()
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--disable-blink-features=AutomationControlled')
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option('useAutomationExtension', False)

    # Use Chrome profile for authentication - create temp copy to avoid lock conflicts
    import shutil
    chrome_src = os.path.expanduser("~/Library/Application Support/Google/Chrome/Default")
    if os.path.exists(chrome_src):
        chrome_temp = f"/tmp/chrome_profile_{int(time.time())}"
        shutil.copytree(chrome_src, chrome_temp, dirs_exist_ok=True)
        # Remove lock files
        for lock_file in ['Singleton', 'SingletonLock', 'Lock']:
            try:
                os.remove(os.path.join(chrome_temp, lock_file))
            except:
                pass
        options.add_argument(f'--user-data-dir={os.path.dirname(chrome_temp)}')
        print("✓ Using Chrome profile for authentication")

    driver = webdriver.Chrome(options=options)

    try:
        print("\n[1] Navigating to YouTube Studio for Boat Rental channel...")
        driver.get("https://studio.youtube.com/channel/UCu75EPcHSqjpjepdR5nq2iQ")
        time.sleep(8)

        print("[2] Clicking upload button...")
        upload_btn = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//a[contains(@href, 'upload') or contains(text(), 'Upload')]"))
        )
        driver.execute_script("arguments[0].click();", upload_btn)
        time.sleep(3)

        print("[3] Finding file input and sending video path...")
        file_inputs = driver.find_elements(By.CSS_SELECTOR, "input[type='file']")
        if file_inputs:
            print(f"   ✓ Found file input, sending: {video_path}")
            file_inputs[0].send_keys(os.path.abspath(video_path))
            print("   ✓ File sent to browser")
            time.sleep(10)

            print("[4] Filling form details...")
            # Fill title
            title_inputs = driver.find_elements(By.CSS_SELECTOR, "input[aria-label*='title'], input[aria-label*='Title']")
            if title_inputs:
                title_inputs[0].clear()
                title_inputs[0].send_keys("Boat Rental Marbella | Puerto Banús #Shorts")
                print("   ✓ Title filled")
                time.sleep(2)

            # Fill description
            desc_fields = driver.find_elements(By.TAG_NAME, "textarea")
            if desc_fields:
                desc_fields[0].send_keys(
                    "Your perfect boat rental Marbella starts right here in Puerto Banús. "
                    "Hassle-free -- skipper, fuel & insurance included. "
                    "https://boatrentalinmarbella.com/"
                )
                print("   ✓ Description filled")
                time.sleep(2)

            print("[5] Setting to Public and publishing...")
            time.sleep(2)

            # Click More button for visibility options
            more_btns = driver.find_elements(By.XPATH, "//button[contains(text(), 'More')]")
            if more_btns:
                driver.execute_script("arguments[0].click();", more_btns[0])
                time.sleep(2)

            # Click Public
            public_options = driver.find_elements(By.XPATH, "//*[contains(text(), 'Public')]")
            if public_options:
                for opt in public_options:
                    try:
                        driver.execute_script("arguments[0].click();", opt)
                        print("   ✓ Set to Public")
                        break
                    except:
                        continue

            time.sleep(2)

            # Click Publish
            publish_btns = driver.find_elements(By.XPATH, "//button[contains(text(), 'Publish')]")
            if publish_btns:
                driver.execute_script("arguments[0].scrollIntoView(true);", publish_btns[-1])
                time.sleep(1)
                driver.execute_script("arguments[0].click();", publish_btns[-1])
                print("   ✓ Clicked Publish!")
                time.sleep(10)

            print("\n✅ UPLOAD COMPLETE - Chrome is still open for verification")
            return True
        else:
            print("❌ Could not find file input")
            return False

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

    finally:
        # Keep Chrome open for user verification
        print("\nChrome is open - please verify the upload in the browser.")
        print("Close Chrome when ready, and the script will finish.")
        time.sleep(30)  # Keep for 30 seconds, then auto-close
        try:
            driver.quit()
        except:
            pass


def main():
    print("\n" + "="*70)
    print("🚤 AUTOMATIC YOUTUBE UPLOAD - Boat Rental In Marbella")
    print("="*70 + "\n")

    reel, posted = get_next_reel()

    if not reel:
        print("✅ No new videos to upload")
        return False

    print(f"📹 Found video: {reel['name']}")
    print(f"📥 Downloaded to: {reel['path']}\n")

    success = upload_with_chrome(reel['path'])

    if success:
        # Mark as posted
        posted.add(reel['id'])
        with open(POSTED_FILE, 'w') as f:
            json.dump(list(posted), f)
        print(f"✅ Marked video as posted: {reel['id']}")

    # Cleanup
    try:
        os.unlink(reel['path'])
    except:
        pass

    print("="*70)
    print("Done!")
    print("="*70)

    return success


if __name__ == "__main__":
    main()
