#!/bin/bash

##############################################################################
# TikTok Sandbox Integration - Quick Start Test
#
# This script guides you through setting up and running the real
# OAuth + Content Posting API test with your TikTok Sandbox account.
##############################################################################

set -e

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║     TikTok Sandbox Integration - Quick Start Test          ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if credentials are already set
if [ -z "$TIKTOK_CLIENT_ID" ] || [ -z "$TIKTOK_CLIENT_SECRET" ]; then
    echo "Step 1: Enter your TikTok Sandbox app credentials"
    echo "────────────────────────────────────────────────────"
    echo ""
    echo "Get these from: https://developer.tiktok.com/console/apps"
    echo "→ Your App → Basic Information"
    echo ""

    read -p "Enter your Client ID: " CLIENT_ID
    read -sp "Enter your Client Secret: " CLIENT_SECRET
    echo ""

    export TIKTOK_CLIENT_ID="$CLIENT_ID"
    export TIKTOK_CLIENT_SECRET="$CLIENT_SECRET"
else
    echo "✓ TikTok credentials already set"
    echo "  Client ID: ${TIKTOK_CLIENT_ID:0:10}..."
    echo "  Client Secret: [PROTECTED]"
    echo ""
fi

# Check for video file
VIDEO_FILE="${1:-}"

if [ -z "$VIDEO_FILE" ]; then
    echo "Step 2: Provide a test video file"
    echo "─────────────────────────────────"
    echo ""
    echo "You need an MP4 video to test with."
    echo ""
    read -p "Enter path to your video file (or press Enter to create a test video): " VIDEO_FILE

    if [ -z "$VIDEO_FILE" ]; then
        echo ""
        echo "Creating a small test video (5 seconds)..."
        TEST_VIDEO="$HOME/tiktok-test-video.mp4"

        if command -v ffmpeg &> /dev/null; then
            ffmpeg -f lavfi -i testsrc=s=1280x720:d=5 -f lavfi -i sine=f=440:d=5 -pix_fmt yuv420p "$TEST_VIDEO" -y 2>/dev/null
            VIDEO_FILE="$TEST_VIDEO"
            echo "✓ Test video created: $TEST_VIDEO"
        else
            echo "✗ ffmpeg not found. Please provide a video file."
            echo "  Or install ffmpeg: brew install ffmpeg"
            exit 1
        fi
    fi
fi

if [ ! -f "$VIDEO_FILE" ]; then
    echo "✗ Video file not found: $VIDEO_FILE"
    exit 1
fi

VIDEO_SIZE=$(du -h "$VIDEO_FILE" | cut -f1)
echo "✓ Video file: $VIDEO_FILE ($VIDEO_SIZE)"
echo ""

# Run the actual test
echo "Step 3: Running TikTok Sandbox Integration Test"
echo "──────────────────────────────────────────────"
echo ""
echo "The script will:"
echo "  1. Open TikTok's real login page"
echo "  2. Wait for you to authorize with @andra.kiirkivi"
echo "  3. Automatically exchange the code for tokens"
echo "  4. Upload video to Sandbox"
echo "  5. Publish video to your account"
echo ""
echo "Press Enter to continue..."
read

# Run the main integration script
./tiktok-integration-demo.sh "$VIDEO_FILE"

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  ✓ Test Complete - Check your Sandbox account for video   ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
