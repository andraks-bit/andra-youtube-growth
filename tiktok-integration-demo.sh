#!/bin/bash

##############################################################################
# TikTok Sandbox Integration Demo - REAL OAuth + Content Posting API
#
# Proper flow:
# 1. Opens real TikTok OAuth page in browser
# 2. Waits for callback and captures authorization code
# 3. Exchanges code for real access/refresh tokens (server-side)
# 4. Uploads video to Sandbox
# 5. Publishes video
#
# No secrets exposed - Client Secret and tokens are [PROTECTED]
##############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration - Load from environment or .env file
if [ -f .env ]; then
    set -a
    source .env
    set +a
fi

TIKTOK_CLIENT_ID="${TIKTOK_CLIENT_ID:-}"
TIKTOK_CLIENT_SECRET="${TIKTOK_CLIENT_SECRET:-}"
REDIRECT_URI="https://andraks-bit.github.io/andra-youtube-growth/tiktok-callback.html"
AUTH_ENDPOINT="https://www.tiktok.com/v2/auth/authorize/"
TOKEN_ENDPOINT="https://open.tiktokapis.com/v2/oauth/token/"
UPLOAD_ENDPOINT="https://open.tiktokapis.com/v2/post/publish/upload/"
PUBLISH_ENDPOINT="https://open.tiktokapis.com/v2/post/publish/action/publish/"

STATE_FILE="/tmp/tiktok_demo_state.json"
VIDEO_FILE="${1:-}"

echo_header() {
    echo -e "\n${CYAN}══════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}══════════════════════════════════════════════════════════${NC}\n"
}

echo_step() {
    echo -e "${BLUE}→${NC} $1"
}

echo_success() {
    echo -e "${GREEN}✓${NC} $1"
}

echo_error() {
    echo -e "${RED}✗${NC} $1"
}

echo_info() {
    echo -e "${YELLOW}ℹ${NC} $1"
}

# Verify credentials and video file
verify_inputs() {
    echo_header "Verification"

    if [ -z "$TIKTOK_CLIENT_ID" ] || [ -z "$TIKTOK_CLIENT_SECRET" ]; then
        echo_error "Missing TikTok credentials!"
        echo "Set environment variables:"
        echo "  export TIKTOK_CLIENT_ID='your_client_id'"
        echo "  export TIKTOK_CLIENT_SECRET='your_client_secret'"
        exit 1
    fi

    echo_step "Client ID: ${TIKTOK_CLIENT_ID:0:10}..."
    echo_step "Client Secret: [PROTECTED]"
    echo_success "Credentials loaded"

    if [ -z "$VIDEO_FILE" ]; then
        echo_error "No video file provided!"
        echo "Usage: $0 /path/to/video.mp4"
        exit 1
    fi

    if [ ! -f "$VIDEO_FILE" ]; then
        echo_error "Video file not found: $VIDEO_FILE"
        exit 1
    fi

    VIDEO_SIZE=$(du -h "$VIDEO_FILE" | cut -f1)
    echo_step "Video file: $VIDEO_FILE"
    echo_step "File size: $VIDEO_SIZE"
    echo_success "Video file verified"
}

# Step 1: Start OAuth authorization
start_oauth() {
    echo_header "Step 1: Real TikTok OAuth Authorization"

    # CRITICAL: Verify Client Key is present and non-empty BEFORE constructing URL
    if [ -z "$TIKTOK_CLIENT_ID" ]; then
        echo_error "Client Key is empty or not set!"
        echo_info "This should have been caught by verify_inputs()"
        exit 1
    fi
    echo_step "Client Key loaded (length: ${#TIKTOK_CLIENT_ID} chars)"

    STATE=$(openssl rand -hex 16)

    # PKCE (RFC 7636) - Required for TikTok Web Login Kit security
    CODE_VERIFIER=$(openssl rand -base64 32 | tr '+/' '-_' | tr -d '=' | cut -c1-128)
    CODE_CHALLENGE=$(echo -n "$CODE_VERIFIER" | python3 -c "import sys, hashlib, base64; data=sys.stdin.read().encode(); print(base64.urlsafe_b64encode(hashlib.sha256(data).digest()).decode().rstrip('='))")

    # Build authorization URL with proper encoding
    # URL-encode the Client Key (same way as redirect_uri and scopes)
    CLIENT_KEY_ENCODED=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$TIKTOK_CLIENT_ID', safe=''))")
    if [ -z "$CLIENT_KEY_ENCODED" ]; then
        echo_error "Client Key URL encoding failed - encoded value is empty"
        exit 1
    fi
    echo_step "Client Key encoded (length: ${#CLIENT_KEY_ENCODED} chars)"

    REDIRECT_ENCODED=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$REDIRECT_URI', safe=''))")
    SCOPES_ENCODED=$(python3 -c "import urllib.parse; print(urllib.parse.quote('user.info.basic video.upload video.publish video.list', safe=''))")

    # TikTok Web Login Kit OAuth endpoint with PKCE
    # Use the encoded Client Key in the URL
    AUTH_URL="${AUTH_ENDPOINT}?client_key=${CLIENT_KEY_ENCODED}&redirect_uri=${REDIRECT_ENCODED}&scope=${SCOPES_ENCODED}&response_type=code&state=${STATE}&code_challenge=${CODE_CHALLENGE}&code_challenge_method=S256"

    # CRITICAL: Verify the URL actually contains a non-empty client_key parameter
    # Extract everything after client_key= and before the next & to check it's not empty
    CLIENT_KEY_IN_URL=$(echo "$AUTH_URL" | grep -o 'client_key=[^&]*' | cut -d'=' -f2)
    if [ -z "$CLIENT_KEY_IN_URL" ]; then
        echo_error "URL construction failed - client_key is empty in final URL"
        echo_error "This indicates Client Key was not properly injected into URL"
        exit 1
    fi
    echo_success "Client Key verified in OAuth URL (length: ${#CLIENT_KEY_IN_URL} chars)"

    # Save PKCE verifier for token exchange (needed when exchanging code for tokens)
    echo "$CODE_VERIFIER" > "$STATE_FILE.verifier"

    # CRITICAL: Check if running in headless environment FIRST
    # GitHub Actions sets GITHUB_ACTIONS=true in environment
    if [ "$GITHUB_ACTIONS" = "true" ] || [ -n "$RUNNER_OS" ]; then
        # HEADLESS GITHUB ACTIONS ENVIRONMENT - DO NOT ATTEMPT TO OPEN BROWSER
        echo ""
        echo "════════════════════════════════════════════════════════════"
        echo "TikTok OAuth Authorization Required (Headless Environment)"
        echo "════════════════════════════════════════════════════════════"
        echo ""
        echo "Step 1: Open this authorization URL in your browser:"
        echo ""
        echo "$AUTH_URL"
        echo ""
        echo "Step 2: Sign in with your TikTok account @andra.kiirkivi"
        echo "Step 3: Approve the requested permissions"
        echo "Step 4: You will be redirected to:"
        echo "        $REDIRECT_URI"
        echo ""
        echo "Step 5: Copy the complete callback URL from your browser"
        echo "Step 6: Run the test locally to complete OAuth:"
        echo ""
        echo "        ./test-tiktok-sandbox.sh"
        echo ""
        echo "════════════════════════════════════════════════════════════"
        echo ""
        # Exit successfully - workflow has provided the URL
        return 0
    fi

    # NON-HEADLESS LOCAL ENVIRONMENT - Can attempt browser automation
    echo_step "Opening TikTok Sandbox login in browser..."
    echo_info "Authorization URL: $AUTH_URL"
    echo ""
    echo_info "You will be redirected to:"
    echo_info "$REDIRECT_URI"
    echo ""
    echo_step "The callback URL will contain your authorization code"
    echo_step "Copy the FULL callback URL from your browser"
    echo ""

    # Try to open browser (only on local machines, not in CI)
    if command -v open &> /dev/null; then
        open "$AUTH_URL" 2>/dev/null || true
    elif command -v xdg-open &> /dev/null; then
        xdg-open "$AUTH_URL" 2>/dev/null || true
    fi

    echo_step "Waiting for authorization callback..."
    echo_info "After you authorize, you'll be redirected to a page showing the authorization code"
    echo ""
    read -p "Paste the FULL callback URL (starting with https://): " CALLBACK_URL

    # Extract authorization code from callback URL
    AUTH_CODE=$(echo "$CALLBACK_URL" | grep -o 'code=[^&]*' | cut -d'=' -f2)

    if [ -z "$AUTH_CODE" ]; then
        echo_error "No authorization code found in URL"
        echo_info "Make sure you copied the full callback URL from the browser"
        exit 1
    fi

    echo_success "Authorization code captured"
    echo_info "Code (hidden): ****${AUTH_CODE: -4}"

    # Save for next step
    echo "$AUTH_CODE" > "$STATE_FILE.code"
}

# Step 2: Exchange code for tokens
exchange_token() {
    echo_header "Step 2: Exchange Authorization Code for Tokens"

    AUTH_CODE=$(cat "$STATE_FILE.code")

    echo_step "Sending token exchange to TikTok servers..."
    echo_info "Endpoint: $TOKEN_ENDPOINT"

    # Load PKCE verifier (saved during authorization)
    CODE_VERIFIER=$(cat "$STATE_FILE.verifier" 2>/dev/null)

    # Make real token exchange request with PKCE
    RESPONSE=$(curl -s -X POST "$TOKEN_ENDPOINT" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "client_id=${TIKTOK_CLIENT_ID}" \
        -d "client_secret=${TIKTOK_CLIENT_SECRET}" \
        -d "code=${AUTH_CODE}" \
        -d "grant_type=authorization_code" \
        -d "code_verifier=${CODE_VERIFIER}")

    # Parse response
    ACCESS_TOKEN=$(echo "$RESPONSE" | grep -o '"access_token":"[^"]*' | head -1 | cut -d'"' -f4)
    REFRESH_TOKEN=$(echo "$RESPONSE" | grep -o '"refresh_token":"[^"]*' | head -1 | cut -d'"' -f4)
    EXPIRES_IN=$(echo "$RESPONSE" | grep -o '"expires_in":[0-9]*' | head -1 | cut -d':' -f2)
    ERROR=$(echo "$RESPONSE" | grep -o '"error":"[^"]*' | head -1 | cut -d'"' -f4)
    ERROR_DESC=$(echo "$RESPONSE" | grep -o '"error_description":"[^"]*' | head -1 | cut -d'"' -f4)

    if [ -n "$ERROR" ]; then
        echo_error "Token exchange failed: $ERROR"
        if [ -n "$ERROR_DESC" ]; then
            echo_error "Details: $ERROR_DESC"
        fi
        echo_info "Full response: $RESPONSE"
        exit 1
    fi

    if [ -z "$ACCESS_TOKEN" ]; then
        echo_error "Failed to extract access token from response"
        echo_info "Full response: $RESPONSE"
        exit 1
    fi

    # Save tokens
    cat > "$STATE_FILE" << EOF
{
  "access_token": "$ACCESS_TOKEN",
  "refresh_token": "$REFRESH_TOKEN",
  "expires_in": $EXPIRES_IN,
  "obtained_at": $(date +%s)
}
EOF

    echo_success "Token exchange successful"
    echo_info "Access Token: ****${ACCESS_TOKEN: -4}"
    echo_info "Refresh Token: ****${REFRESH_TOKEN: -4}"
    echo_info "Expires In: ${EXPIRES_IN} seconds"
}

# Step 3: Upload video
upload_video() {
    echo_header "Step 3: Upload Video to TikTok Sandbox"

    ACCESS_TOKEN=$(grep -o '"access_token":"[^"]*' "$STATE_FILE" | cut -d'"' -f4)

    echo_step "Uploading video to Sandbox API..."
    echo_info "File: $VIDEO_FILE"

    RESPONSE=$(curl -s -X POST "$UPLOAD_ENDPOINT" \
        -H "Authorization: Bearer ${ACCESS_TOKEN:0:10}...${ACCESS_TOKEN: -4}" \
        -F "video=@${VIDEO_FILE}" \
        -F "type=video/mp4")

    UPLOAD_ID=$(echo "$RESPONSE" | grep -o '"upload_id":"[^"]*' | cut -d'"' -f4)
    ERROR=$(echo "$RESPONSE" | grep -o '"error":"[^"]*' | cut -d'"' -f4)

    if [ -n "$ERROR" ]; then
        echo_error "Video upload failed: $ERROR"
        exit 1
    fi

    if [ -z "$UPLOAD_ID" ]; then
        echo_error "Failed to extract upload ID"
        echo_info "Response: $RESPONSE"
        exit 1
    fi

    echo_success "Video uploaded successfully"
    echo_info "Upload ID: $UPLOAD_ID"

    echo "$UPLOAD_ID" > "$STATE_FILE.upload_id"
}

# Step 4: Publish video
publish_video() {
    echo_header "Step 4: Publish Video to Sandbox Account"

    ACCESS_TOKEN=$(grep -o '"access_token":"[^"]*' "$STATE_FILE" | cut -d'"' -f4)
    UPLOAD_ID=$(cat "$STATE_FILE.upload_id")

    VIDEO_DESC="Demo video from Andra YouTube Growth automation"

    echo_step "Publishing video to Sandbox account..."
    echo_info "Upload ID: $UPLOAD_ID"
    echo_info "Description: \"$VIDEO_DESC\""

    RESPONSE=$(curl -s -X POST "$PUBLISH_ENDPOINT" \
        -H "Authorization: Bearer ${ACCESS_TOKEN:0:10}...${ACCESS_TOKEN: -4}" \
        -H "Content-Type: application/json" \
        -d "{
            \"media_type\": \"$UPLOAD_ID\",
            \"post_info\": {
                \"desc\": \"$VIDEO_DESC\",
                \"disable_comment\": false,
                \"disable_duet\": false,
                \"disable_stitch\": false
            }
        }")

    PUBLISH_ID=$(echo "$RESPONSE" | grep -o '"publish_id":"[^"]*' | cut -d'"' -f4)
    ERROR=$(echo "$RESPONSE" | grep -o '"error":"[^"]*' | cut -d'"' -f4)

    if [ -n "$ERROR" ]; then
        echo_error "Video publish failed: $ERROR"
        exit 1
    fi

    if [ -z "$PUBLISH_ID" ]; then
        echo_error "Failed to extract publish ID"
        echo_info "Response: $RESPONSE"
        exit 1
    fi

    echo_success "Video published successfully"
    echo_info "Publish ID: $PUBLISH_ID"
    echo_success "Video is now LIVE on your Sandbox account!"
}

# Main execution
main() {
    echo_header "🔐 TikTok Sandbox Integration - Real End-to-End Demo"

    verify_inputs

    # Check if running in headless GitHub Actions environment
    if [ "$GITHUB_ACTIONS" = "true" ] || [ -n "$RUNNER_OS" ]; then
        # Headless: Show OAuth URL and stop
        start_oauth
        # Return after showing the authorization URL in headless mode
        return 0
    fi

    # Interactive local environment: Complete full OAuth flow
    start_oauth
    exchange_token
    upload_video
    publish_video

    echo_header "✅ Complete Integration Demo Successful"
    echo_success "Real OAuth + Upload + Publish completed"
    echo_info "Log into your Sandbox account to verify the video is live"
}

trap 'echo_error "Script interrupted"; exit 1' INT TERM
main "$@"
