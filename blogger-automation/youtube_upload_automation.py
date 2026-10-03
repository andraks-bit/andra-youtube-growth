"""
YouTube Studio Browser Automation - Daily upload to Boat Rental In Marbella
Uploads videos from Google Drive to the Boat Rental In Marbella YouTube channel
"""

import json
import os
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials

HERE = os.path.dirname(os.path.abspath(__file__))
CREDS_DIR = os.path.join(HERE, "credentials")

AI_REELS_FOLDER_ID = "1RXU3oytYzEVmmGH15HdzJus94OObFjre"
POSTED_FILE = os.path.join(CREDS_DIR, "posted_youtube_reels.json")

def get_next_reel():
    """Get the next video to upload from Google Drive"""
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

    # Get already posted videos
    posted = set()
    if os.path.exists(POSTED_FILE):
        with open(POSTED_FILE) as f:
            posted = set(json.load(f))

    # Find next unposted reel
    results = drive.files().list(
        q=f"'{AI_REELS_FOLDER_ID}' in parents and name contains 'reel_marbella_'",
        orderBy="name desc",
        fields="files(id,name)",
        pageSize=10
    ).execute()

    for file in results.get('files', []):
        if file['id'] not in posted:
            return file, drive, posted

    return None, drive, posted

def upload_to_youtube_studio(video_path):
    """Upload video to YouTube Boat Rental In Marbella channel using browser automation"""

    options = webdriver.ChromeOptions()

    # Use temporary copy of Chrome user data for authentication
    import shutil
    temp_profile_src = "/tmp/chrome_profile_temp_clean"
    container_dir = f"/tmp/chrome_sel_{int(time.time())}"

    if os.path.exists(temp_profile_src):
        os.makedirs(container_dir, exist_ok=True)
        # Copy profile to container
        dest = os.path.join(container_dir, "Default")
        if os.path.exists(dest):
            shutil.rmtree(dest)
        shutil.copytree(temp_profile_src, dest)
        # Remove lock files
        for lock_file in ["Singleton", "SingletonLock", "LevelDBLock"]:
            try:
                os.remove(os.path.join(dest, lock_file))
            except:
                pass
        options.add_argument(f'--user-data-dir={container_dir}')
        print(f"Using Chrome profile copy in: {container_dir}")
    else:
        print("⚠️ Chrome profile not found, will try without user profile")

    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--disable-blink-features=AutomationControlled')
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option('useAutomationExtension', False)

    driver = webdriver.Chrome(options=options)

    try:
        print("Opening YouTube Studio...")
        driver.get("https://studio.youtube.com")
        time.sleep(8)

        # Check current URL and wait for load
        current_url = driver.current_url
        print(f"Current URL: {current_url}")

        # Try to find the Create button by multiple methods
        print("Looking for Create/Upload button...")
        create_btn = None

        # Method 1: Look for upload video link
        try:
            create_btn = WebDriverWait(driver, 5).until(
                EC.element_to_be_clickable((By.XPATH, "//a[contains(@href, 'upload')]"))
            )
            print("Found Create button via link")
        except:
            pass

        # Method 2: Look for button with aria-label
        if not create_btn:
            try:
                create_btn = WebDriverWait(driver, 5).until(
                    EC.element_to_be_clickable((By.CSS_SELECTOR, "button[aria-label*='Create'], button[aria-label*='create']"))
                )
                print("Found Create button via aria-label")
            except:
                pass

        # Method 3: Look for visible text
        if not create_btn:
            try:
                elements = driver.find_elements(By.TAG_NAME, "button")
                for elem in elements:
                    if "create" in elem.text.lower() or "upload" in elem.text.lower():
                        create_btn = elem
                        print(f"Found Create button via text: {elem.text}")
                        break
            except:
                pass

        if create_btn:
            driver.execute_script("arguments[0].scrollIntoView(true);", create_btn)
            time.sleep(1)
            create_btn.click()
            print("✅ Clicked Create button")
            time.sleep(3)
        else:
            print("⚠️ Could not find Create button, trying alternative approach")
            # Try direct navigation
            driver.get("https://studio.youtube.com/sc/uploads")
            time.sleep(5)

        # Find and click upload video button
        print("Looking for 'Upload video' button...")
        upload_btn = None
        try:
            upload_btn = WebDriverWait(driver, 5).until(
                EC.element_to_be_clickable((By.XPATH, "//a[contains(text(), 'Upload video')]"))
            )
            upload_btn.click()
            print("✅ Clicked Upload video button")
            time.sleep(3)
        except:
            print("⚠️ Could not find Upload video button, looking for file input")

        # Find and interact with file input
        print(f"Uploading video: {video_path}...")
        try:
            file_inputs = driver.find_elements(By.CSS_SELECTOR, "input[type='file']")
            if file_inputs:
                file_input = file_inputs[0]
                file_input.send_keys(video_path)
                print(f"✅ File selected: {video_path}")
                time.sleep(8)
            else:
                print("❌ No file input found")
                return False
        except Exception as e:
            print(f"❌ Error uploading file: {e}")
            return False

        # Wait for title field to appear
        try:
            print("Waiting for upload form...")
            time.sleep(3)

            # Fill title
            print("Setting title...")
            title_inputs = driver.find_elements(By.CSS_SELECTOR, "input[aria-label*='title'], input[aria-label*='Title']")
            if title_inputs:
                title_inputs[0].clear()
                title_inputs[0].send_keys("Boat Rental Marbella | Puerto Banús #Shorts")
                print("✅ Title set")
                time.sleep(1)
            else:
                print("⚠️ Could not find title input")

            # Fill description
            print("Setting description...")
            textareas = driver.find_elements(By.TAG_NAME, "textarea")
            if textareas:
                textareas[0].send_keys(
                    "Your perfect boat rental Marbella starts right here in Puerto Banús. "
                    "Hassle-free -- skipper, fuel & insurance included. "
                    "https://boatrentalinmarbella.com/"
                )
                print("✅ Description set")
                time.sleep(1)
            else:
                print("⚠️ Could not find description textarea")

            # Look for More/Additional options button
            print("Looking for visibility options...")
            time.sleep(2)
            more_btns = driver.find_elements(By.XPATH, "//button[contains(text(), 'More')]")
            if more_btns:
                more_btns[0].click()
                print("✅ Clicked More options")
                time.sleep(2)

            # Set to public
            print("Setting to public...")
            public_options = driver.find_elements(By.XPATH, "//*[contains(text(), 'Public')]")
            if public_options:
                for opt in public_options:
                    parent = opt.find_element(By.XPATH, "./ancestor::div[contains(@role, 'option') or contains(@role, 'radio')]")
                    if parent:
                        driver.execute_script("arguments[0].click();", opt)
                        print("✅ Set to Public")
                        time.sleep(1)
                        break
            else:
                print("⚠️ Could not find Public option")

            # Publish
            print("Looking for Publish button...")
            time.sleep(2)
            publish_btns = driver.find_elements(By.XPATH, "//button[contains(text(), 'Publish') or contains(text(), 'Upload')]")
            if publish_btns:
                driver.execute_script("arguments[0].scrollIntoView(true);", publish_btns[-1])
                time.sleep(1)
                publish_btns[-1].click()
                print("✅ Clicked Publish")
                time.sleep(8)

            print("✅ Video uploaded successfully!")
            return True

        except Exception as e:
            print(f"❌ Error in upload form: {e}")
            import traceback
            traceback.print_exc()
            return False

    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    finally:
        driver.quit()

def main():
    print("=" * 70)
    print("🚤 YouTube Boat Rental In Marbella - Browser Automation Upload")
    print("=" * 70)

    # Get next reel
    reel, drive, posted = get_next_reel()

    if not reel:
        print("No new reels to upload.")
        return

    print(f"\nUploading: {reel['name']}")

    # Download video
    print("Downloading video from Drive...")
    import tempfile
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
        request = drive.files().get_media(fileId=reel['id'])
        tmp.write(request.execute())
        tmp_path = tmp.name

    # Upload via browser
    success = upload_to_youtube_studio(tmp_path)

    if success:
        posted.add(reel['id'])
        with open(POSTED_FILE, 'w') as f:
            json.dump(list(posted), f)
        print(f"✅ Marked as posted: {reel['id']}")

    # Cleanup
    os.unlink(tmp_path)
    print("\n" + "=" * 70)

if __name__ == "__main__":
    main()
