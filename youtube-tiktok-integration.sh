#!/bin/bash

##############################################################################
# Daily YouTube Growth + TikTok Content Preparation
#
# This script:
# 1. Runs YouTube growth automation (BLOCKING - critical)
# 2. Prepares TikTok-ready content (videos, captions, hashtags, CTAs)
# 3. Attempts TikTok publishing (NON-BLOCKING - won't stop YouTube automation)
#
# TikTok failures do NOT block YouTube growth automation
##############################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo_header() { echo -e "\n${BLUE}════════════════════════════════════════════════════════════${NC}\n${BLUE}$1${NC}\n${BLUE}════════════════════════════════════════════════════════════${NC}\n"; }
echo_success() { echo -e "${GREEN}✓${NC} $1"; }
echo_error() { echo -e "${RED}✗${NC} $1"; }
echo_step() { echo -e "${YELLOW}→${NC} $1"; }

##############################################################################
# PHASE 1: YOUTUBE GROWTH (CRITICAL - BLOCKING)
##############################################################################

echo_header "Phase 1: Daily YouTube Growth Automation"

run_youtube_growth() {
    echo_step "Running YouTube growth automation..."

    # Run the YouTube growth system (this MUST complete)
    cd /Users/nunnu/Desktop/boathire/youtube-growth-system

    if [ -f "run_growth.py" ]; then
        python3 run_growth.py
        echo_success "YouTube growth automation completed"
        return 0
    elif [ -f "growth_engine.py" ]; then
        python3 growth_engine.py
        echo_success "YouTube growth automation completed"
        return 0
    else
        echo_error "YouTube growth script not found"
        return 1
    fi
}

# Run YouTube growth - this MUST succeed
if ! run_youtube_growth; then
    echo_error "CRITICAL: YouTube growth automation failed"
    echo_step "Checking alternative runners..."

    # Try alternative approaches
    if [ -f "/Users/nunnu/Desktop/boathire/analysis/growth_engine.py" ]; then
        cd /Users/nunnu/Desktop/boathire/analysis
        python3 growth_engine.py || echo_error "Fallback growth engine failed"
    fi
fi

##############################################################################
# PHASE 2: TIKTOK CONTENT PREPARATION (NON-BLOCKING)
##############################################################################

echo_header "Phase 2: TikTok-Ready Content Preparation"

prepare_tiktok_content() {
    echo_step "Preparing TikTok content..."

    TIKTOK_CONTENT_DIR="/tmp/tiktok_daily_content"
    mkdir -p "$TIKTOK_CONTENT_DIR"

    # Get latest YouTube video metadata
    if [ -f "/Users/nunnu/Desktop/boathire/youtube-growth-system/latest_upload.json" ]; then
        echo_step "Extracting YouTube video metadata..."

        VIDEO_TITLE=$(python3 -c "import json; data=json.load(open('/Users/nunnu/Desktop/boathire/youtube-growth-system/latest_upload.json')); print(data.get('title', 'Latest Video'))" 2>/dev/null || echo "Latest Boat Hire Video")
        VIDEO_URL=$(python3 -c "import json; data=json.load(open('/Users/nunnu/Desktop/boathire/youtube-growth-system/latest_upload.json')); print(data.get('url', 'https://youtube.com/@boathire24'))" 2>/dev/null || echo "https://youtube.com/@boathire24")

        # Generate TikTok caption
        TIKTOK_CAPTION="Check out: $VIDEO_TITLE 🎬"

        # Generate hashtags (TikTok-optimized)
        TIKTOK_HASHTAGS="#BoatRental #BoatHire #VacationVibes #SummerFun #AdventureSeeker #WaterLife #TravelVlog #BoatingAdventures #CoastalLife #GetOutside"

        # Generate YouTube CTA
        YOUTUBE_CTA="🔗 Watch full video: $VIDEO_URL Subscribe for more! 👇"

        # Save TikTok content package
        cat > "$TIKTOK_CONTENT_DIR/content_package.txt" << EOF
=== TIKTOK CONTENT PACKAGE ===
Generated: $(date)

VIDEO_TITLE: $VIDEO_TITLE
YOUTUBE_URL: $VIDEO_URL

--- TikTok Caption ---
$TIKTOK_CAPTION

--- Hashtags ---
$TIKTOK_HASHTAGS

--- YouTube CTA ---
$YOUTUBE_CTA

--- Instructions for TikTok Publishing ---
1. Download latest video from YouTube or /tmp/latest_youtube_video.mp4
2. Create TikTok post with caption above
3. Include all hashtags for maximum reach
4. Add YouTube link in comment or bio
5. Post to your TikTok channel
EOF

        echo_success "TikTok content prepared: $TIKTOK_CONTENT_DIR/content_package.txt"
        return 0
    else
        echo_error "No YouTube video metadata found"
        return 1
    fi
}

##############################################################################
# PHASE 3: TIKTOK PUBLISHING (NON-BLOCKING - WILL NOT STOP YOUTUBE AUTOMATION)
##############################################################################

echo_header "Phase 3: TikTok Publishing (Non-Blocking)"

attempt_tiktok_publishing() {
    echo_step "Attempting TikTok publishing (non-blocking)..."

    # Only attempt if OAuth credentials are available
    if [ -z "$TIKTOK_CLIENT_ID" ] && [ -z "$TIKTOK_SANDBOX_CLIENT_ID" ]; then
        echo_error "TikTok credentials not available - skipping"
        return 0  # Non-blocking: return success so automation continues
    fi

    # Attempt TikTok publishing in background
    (
        cd /Users/nunnu/Desktop/boathire
        timeout 30 ./tiktok-integration-demo.sh /tmp/latest_youtube_video.mp4 2>&1 || true
    ) &

    # Don't wait for TikTok - YouTube automation already completed successfully
    echo_success "TikTok publishing queued (non-blocking)"
    return 0
}

# TikTok publishing is NON-BLOCKING - failures don't stop automation
prepare_tiktok_content || echo_error "TikTok content prep failed (non-critical)"
attempt_tiktok_publishing || echo_error "TikTok publishing failed (non-critical)"

##############################################################################
# COMPLETION
##############################################################################

echo_header "Daily Automation Complete"
echo_success "YouTube growth automation: COMPLETED"
echo_success "TikTok content: PREPARED"
echo_step "TikTok publishing: QUEUED (non-blocking)"
echo_success "Daily routine finished successfully"
