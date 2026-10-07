#!/bin/bash

##############################################################################
# TikTok Sandbox Real Demo - Minimal, Actual OAuth Flow
#
# This is a REAL demonstration of:
# 1. TikTok Web Login Kit Authorization
# 2. OAuth callback capture
# 3. Token exchange
# 4. User info retrieval (user.info.basic)
# 5. Video upload (Content Posting API)
# 6. Video publish (Direct Post)
#
# NO SIMULATION. All real TikTok Sandbox API calls.
##############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo_step() { echo -e "${BLUE}→${NC} $1"; }
echo_success() { echo -e "${GREEN}✓${NC} $1"; }
echo_error() { echo -e "${RED}✗${NC} $1"; }

# =============================================================================
# CONFIGURATION
# =============================================================================

# Load from environment or .env
if [ -f .env ]; then
    set -a
    source .env
    set +a
fi

CLIENT_KEY="${TIKTOK_SANDBOX_CLIENT_ID:-${TIKTOK_CLIENT_ID}}"
CLIENT_SECRET="${TIKTOK_SANDBOX_CLIENT_SECRET:-${TIKTOK_CLIENT_SECRET}}"
REDIRECT_URI="https://andraks-bit.github.io/andra-youtube-growth/tiktok-callback.html"

# TikTok Sandbox Endpoints
AUTH_ENDPOINT="https://www.tiktok.com/v2/auth/authorize/"
TOKEN_ENDPOINT="https://open.tiktokapis.com/v2/oauth/token/"
USER_ENDPOINT="https://open.tiktokapis.com/v2/user/info/"
UPLOAD_ENDPOINT="https://open.tiktokapis.com/v2/post/publish/upload/"
PUBLISH_ENDPOINT="https://open.tiktokapis.com/v2/post/publish/action/publish/"

# Demo video
DEMO_VIDEO="${1:-/tmp/test-video.mp4}"

# State file
STATE_DIR="/tmp/tiktok_demo"
mkdir -p "$STATE_DIR"

# =============================================================================
# PHASE 1: AUTHORIZATION - Open TikTok OAuth
# =============================================================================

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}TikTok Sandbox Real Demo - Phase 1: Authorization${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

# Verify credentials
if [ -z "$CLIENT_KEY" ]; then
    echo_error "Client Key not set"
    echo "   Set TIKTOK_SANDBOX_CLIENT_ID or TIKTOK_CLIENT_ID in environment or .env"
    exit 1
fi

# Generate PKCE
STATE=$(openssl rand -hex 16)
CODE_VERIFIER=$(openssl rand -base64 32 | tr '+/' '-_' | tr -d '=' | cut -c1-128)
CODE_CHALLENGE=$(echo -n "$CODE_VERIFIER" | python3 -c "import sys, hashlib, base64; data=sys.stdin.read().encode(); print(base64.urlsafe_b64encode(hashlib.sha256(data).digest()).decode().rstrip('='))")

# Save for token exchange
echo "$CODE_VERIFIER" > "$STATE_DIR/verifier"

# Build OAuth URL
REDIRECT_ENCODED=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$REDIRECT_URI', safe=''))")
SCOPES_ENCODED=$(python3 -c "import urllib.parse; print(urllib.parse.quote('user.info.basic video.upload video.publish', safe=''))")

AUTH_URL="${AUTH_ENDPOINT}?client_key=${CLIENT_KEY}&redirect_uri=${REDIRECT_ENCODED}&scope=${SCOPES_ENCODED}&response_type=code&state=${STATE}&code_challenge=${CODE_CHALLENGE}&code_challenge_method=S256"

echo_step "Opening TikTok Sandbox OAuth..."
echo ""
echo "Authorization URL:"
echo "$AUTH_URL"
echo ""
echo_step "Opening in browser in 2 seconds..."
sleep 2

# Try to open browser
if command -v open &> /dev/null; then
    open "$AUTH_URL" 2>/dev/null || true
elif command -v xdg-open &> /dev/null; then
    xdg-open "$AUTH_URL" 2>/dev/null || true
fi

echo ""
echo_step "MANUAL ACTION REQUIRED:"
echo "  1. TikTok login page opened in your browser"
echo "  2. Sign in with @andra.kiirkivi (or your test account)"
echo "  3. Approve the permissions"
echo "  4. You'll be redirected to callback page showing authorization code"
echo ""
read -p "After authorization completes, paste the authorization code here: " AUTH_CODE

if [ -z "$AUTH_CODE" ]; then
    echo_error "No authorization code provided"
    exit 1
fi

echo "$AUTH_CODE" > "$STATE_DIR/code"
echo_success "Authorization code captured"

# =============================================================================
# PHASE 2: TOKEN EXCHANGE
# =============================================================================

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}TikTok Sandbox Real Demo - Phase 2: Token Exchange${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

echo_step "Exchanging authorization code for access token..."

TOKEN_RESPONSE=$(curl -s -X POST "$TOKEN_ENDPOINT" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "client_id=${CLIENT_KEY}" \
    -d "client_secret=${CLIENT_SECRET}" \
    -d "code=${AUTH_CODE}" \
    -d "grant_type=authorization_code" \
    -d "code_verifier=${CODE_VERIFIER}")

ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | grep -o '"access_token":"[^"]*' | head -1 | cut -d'"' -f4)
REFRESH_TOKEN=$(echo "$TOKEN_RESPONSE" | grep -o '"refresh_token":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$ACCESS_TOKEN" ]; then
    echo_error "Failed to get access token"
    echo "Response: $TOKEN_RESPONSE"
    exit 1
fi

echo_success "Access token received"
echo "Token: ****${ACCESS_TOKEN: -10}"

# =============================================================================
# PHASE 3: USER INFO (user.info.basic)
# =============================================================================

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}TikTok Sandbox Real Demo - Phase 3: User Info${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

echo_step "Retrieving user.info.basic..."

USER_RESPONSE=$(curl -s -X GET "$USER_ENDPOINT" \
    -H "Authorization: Bearer $ACCESS_TOKEN")

USER_ID=$(echo "$USER_RESPONSE" | grep -o '"open_id":"[^"]*' | head -1 | cut -d'"' -f4)
DISPLAY_NAME=$(echo "$USER_RESPONSE" | grep -o '"display_name":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$USER_ID" ]; then
    echo_error "Failed to get user info"
    echo "Response: $USER_RESPONSE"
    exit 1
fi

echo_success "User authenticated"
echo "User ID: $USER_ID"
echo "Display name: $DISPLAY_NAME"

# =============================================================================
# PHASE 4: VIDEO UPLOAD
# =============================================================================

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}TikTok Sandbox Real Demo - Phase 4: Video Upload${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

# Create test video if not provided
if [ ! -f "$DEMO_VIDEO" ]; then
    echo_step "Creating test video..."
    ffmpeg -f lavfi -i testsrc=s=1280x720:d=5 -f lavfi -i sine=f=440:d=5 -pix_fmt yuv420p "$DEMO_VIDEO" -y 2>/dev/null || true
fi

if [ ! -f "$DEMO_VIDEO" ]; then
    echo_error "Video file not found: $DEMO_VIDEO"
    exit 1
fi

echo_step "Uploading video to TikTok Sandbox..."

UPLOAD_RESPONSE=$(curl -s -X POST "$UPLOAD_ENDPOINT" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -F "video=@${DEMO_VIDEO}" \
    -F "type=video/mp4")

UPLOAD_ID=$(echo "$UPLOAD_RESPONSE" | grep -o '"upload_id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$UPLOAD_ID" ]; then
    echo_error "Video upload failed"
    echo "Response: $UPLOAD_RESPONSE"
    exit 1
fi

echo_success "Video uploaded successfully"
echo "Upload ID: $UPLOAD_ID"

# =============================================================================
# PHASE 5: VIDEO PUBLISH
# =============================================================================

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}TikTok Sandbox Real Demo - Phase 5: Publish Video${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

echo_step "Publishing video to TikTok Sandbox..."

PUBLISH_RESPONSE=$(curl -s -X POST "$PUBLISH_ENDPOINT" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"media_type\": \"$UPLOAD_ID\",
        \"post_info\": {
            \"desc\": \"Real TikTok Sandbox Demo - OAuth + Upload + Publish\",
            \"disable_comment\": false,
            \"disable_duet\": false,
            \"disable_stitch\": false
        }
    }")

PUBLISH_ID=$(echo "$PUBLISH_RESPONSE" | grep -o '"publish_id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$PUBLISH_ID" ]; then
    echo_error "Video publish failed"
    echo "Response: $PUBLISH_RESPONSE"
    exit 1
fi

echo_success "Video published successfully!"
echo "Publish ID: $PUBLISH_ID"

# =============================================================================
# COMPLETION
# =============================================================================

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}TikTok Sandbox Real Demo - COMPLETE${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo ""
echo_success "Demonstrated:"
echo "  ✓ TikTok Web Login Kit Authorization"
echo "  ✓ OAuth 2.0 with PKCE"
echo "  ✓ user.info.basic scope"
echo "  ✓ Content Posting API - Video Upload"
echo "  ✓ Content Posting API - Video Publish"
echo ""
echo_success "Check your TikTok Sandbox account @$DISPLAY_NAME to see the published video"
echo ""
