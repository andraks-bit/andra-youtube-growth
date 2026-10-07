#!/bin/bash

# TikTok Sandbox Setup Verification
# Tests API connectivity and prepares for OAuth flow

set -e

echo "════════════════════════════════════════════════════════════"
echo "TikTok Sandbox Integration - Setup Verification"
echo "════════════════════════════════════════════════════════════"
echo ""

# Load credentials from .env if it exists
if [ -f .env ]; then
    set -a
    source .env
    set +a
fi

# Check credentials
echo "Step 1: Verify Credentials"
echo "─────────────────────────"

if [ -z "$TIKTOK_CLIENT_ID" ]; then
    echo "✗ TIKTOK_CLIENT_ID not set"
    echo "  Set via: export TIKTOK_CLIENT_ID=xxx"
    echo "  Or add to .env file"
    exit 1
fi

if [ -z "$TIKTOK_CLIENT_SECRET" ]; then
    echo "✗ TIKTOK_CLIENT_SECRET not set"
    echo "  Set via: export TIKTOK_CLIENT_SECRET=xxx"
    echo "  Or add to .env file"
    exit 1
fi

echo "✓ TIKTOK_CLIENT_ID loaded: ${TIKTOK_CLIENT_ID:0:10}..."
echo "✓ TIKTOK_CLIENT_SECRET loaded: [PROTECTED]"
echo ""

# Test API connectivity
echo "Step 2: Test TikTok API Endpoints"
echo "────────────────────────────────"

# Test OAuth authorization endpoint (just check it's reachable)
AUTH_ENDPOINT="https://www.tiktok.com/v2/oauth/authorize/"
echo -n "Testing OAuth endpoint ($AUTH_ENDPOINT)... "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$AUTH_ENDPOINT" -G -d "client_key=test")
if [ "$HTTP_CODE" = "400" ] || [ "$HTTP_CODE" = "302" ]; then
    echo "✓ Reachable"
else
    echo "✗ Failed (HTTP $HTTP_CODE)"
fi

# Test Token endpoint
TOKEN_ENDPOINT="https://open.tiktokapis.com/v2/oauth/token/"
echo -n "Testing Token endpoint ($TOKEN_ENDPOINT)... "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$TOKEN_ENDPOINT" -H "Content-Type: application/x-www-form-urlencoded" -d "client_id=test")
if [ "$HTTP_CODE" = "400" ] || [ "$HTTP_CODE" = "401" ]; then
    echo "✓ Reachable (expected auth error)"
else
    echo "✗ Failed (HTTP $HTTP_CODE)"
fi

# Test Upload endpoint
UPLOAD_ENDPOINT="https://open.tiktokapis.com/v2/post/publish/upload/"
echo -n "Testing Upload endpoint ($UPLOAD_ENDPOINT)... "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$UPLOAD_ENDPOINT" -H "Authorization: Bearer test")
if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "400" ]; then
    echo "✓ Reachable (expected auth error)"
else
    echo "✗ Failed (HTTP $HTTP_CODE)"
fi

# Test Publish endpoint
PUBLISH_ENDPOINT="https://open.tiktokapis.com/v2/post/publish/action/publish/"
echo -n "Testing Publish endpoint ($PUBLISH_ENDPOINT)... "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$PUBLISH_ENDPOINT" -H "Authorization: Bearer test" -H "Content-Type: application/json" -d '{}')
if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "400" ]; then
    echo "✓ Reachable (expected auth error)"
else
    echo "✗ Failed (HTTP $HTTP_CODE)"
fi

echo ""
echo "Step 3: Check Scripts"
echo "────────────────────"

if [ -f tiktok-integration-demo.sh ]; then
    echo "✓ tiktok-integration-demo.sh found"
    if [ -x tiktok-integration-demo.sh ]; then
        echo "✓ Script is executable"
    else
        chmod +x tiktok-integration-demo.sh
        echo "✓ Script made executable"
    fi
else
    echo "✗ tiktok-integration-demo.sh not found"
    exit 1
fi

if [ -f test-tiktok-sandbox.sh ]; then
    echo "✓ test-tiktok-sandbox.sh found"
    if [ -x test-tiktok-sandbox.sh ]; then
        echo "✓ Script is executable"
    else
        chmod +x test-tiktok-sandbox.sh
        echo "✓ Script made executable"
    fi
else
    echo "✗ test-tiktok-sandbox.sh not found"
    exit 1
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "✓ Setup Verification Complete"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "All systems ready for TikTok Sandbox integration test."
echo ""
echo "Next: Run the integration test with OAuth authorization:"
echo "  ./test-tiktok-sandbox.sh"
echo ""

