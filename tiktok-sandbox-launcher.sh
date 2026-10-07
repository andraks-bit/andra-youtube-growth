#!/bin/bash

###############################################################################
# TikTok Sandbox Secure Demo Launcher
#
# Starts both the secure backend (OAuth callback handler) and frontend
# in separate processes so they can communicate securely.
###############################################################################

set -e

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo_step() { echo -e "${BLUE}→${NC} $1"; }
echo_success() { echo -e "${GREEN}✓${NC} $1"; }
echo_warning() { echo -e "${YELLOW}⚠${NC} $1"; }

# =============================================================================
# VALIDATE ENVIRONMENT
# =============================================================================

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}TikTok Sandbox Secure Demo Launcher${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "✗ Node.js not found. Please install Node.js (v14+)"
    exit 1
fi

echo_success "Node.js $(node -v) found"

# Check for npm packages
if ! npm list > /dev/null 2>&1; then
    echo_warning "Installing Node.js dependencies..."
    npm install --no-save > /dev/null 2>&1
    echo_success "Dependencies installed"
fi

# Check credentials
if [ -z "$TIKTOK_CLIENT_ID" ] && [ -z "$TIKTOK_SANDBOX_CLIENT_ID" ]; then
    echo_warning "TikTok Client ID not set in environment"
    echo "   Set: export TIKTOK_CLIENT_ID=your-client-id"
    echo "   OR:  export TIKTOK_SANDBOX_CLIENT_ID=your-sandbox-key"
fi

if [ -z "$TIKTOK_CLIENT_SECRET" ] && [ -z "$TIKTOK_SANDBOX_CLIENT_SECRET" ]; then
    echo_warning "TikTok Client Secret not set in environment"
    echo "   Set: export TIKTOK_CLIENT_SECRET=your-client-secret"
    echo "   OR:  export TIKTOK_SANDBOX_CLIENT_SECRET=your-sandbox-secret"
fi

# =============================================================================
# START SERVICES
# =============================================================================

echo ""
echo_step "Starting TikTok Sandbox Demo Services..."
echo ""

# Create cleanup trap
cleanup() {
    echo ""
    echo_step "Shutting down services..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    echo_success "Services stopped"
}
trap cleanup EXIT INT TERM

# Start backend
echo_step "Starting backend (port 3001)..."
node tiktok-sandbox-backend.js &
BACKEND_PID=$!
sleep 2

# Start simple frontend server (Python)
echo_step "Starting frontend (port 3000)..."
if command -v python3 &> /dev/null; then
    cd "$(dirname "${BASH_SOURCE[0]}")"
    python3 -m http.server 3000 --directory . > /dev/null 2>&1 &
    FRONTEND_PID=$!
elif command -v python &> /dev/null; then
    cd "$(dirname "${BASH_SOURCE[0]}")"
    python -m SimpleHTTPServer 3000 > /dev/null 2>&1 &
    FRONTEND_PID=$!
else
    echo "✗ Python not found. Cannot start frontend server."
    exit 1
fi

sleep 1

# Verify services
echo ""
echo_step "Verifying services..."

# Check backend
if curl -s http://localhost:3001/health > /dev/null; then
    echo_success "Backend running (http://localhost:3001)"
else
    echo "✗ Backend failed to start"
    exit 1
fi

# Check frontend
if curl -s http://localhost:3000 > /dev/null; then
    echo_success "Frontend running (http://localhost:3000)"
else
    echo "✗ Frontend failed to start"
    exit 1
fi

# =============================================================================
# READY
# =============================================================================

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Services Ready${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "Frontend: ${BLUE}http://localhost:3000/tiktok-sandbox-demo.html${NC}"
echo "Backend:  ${BLUE}http://localhost:3001${NC}"
echo ""
echo "This demo shows a SECURE OAuth flow:"
echo "  1. Frontend (browser) initiates OAuth"
echo "  2. TikTok redirects to backend callback"
echo "  3. Backend handles token exchange securely (Client Secret never exposed)"
echo "  4. User info returned to frontend"
echo ""
echo_warning "Credentials:"
if [ -n "$TIKTOK_CLIENT_ID" ] || [ -n "$TIKTOK_SANDBOX_CLIENT_ID" ]; then
    echo "  ✓ Client ID/Key configured"
else
    echo "  ✗ Client ID/Key NOT configured (set TIKTOK_CLIENT_ID env var)"
fi

if [ -n "$TIKTOK_CLIENT_SECRET" ] || [ -n "$TIKTOK_SANDBOX_CLIENT_SECRET" ]; then
    echo "  ✓ Client Secret configured"
else
    echo "  ✗ Client Secret NOT configured (set TIKTOK_CLIENT_SECRET env var)"
fi

echo ""
echo "Press Ctrl+C to stop services..."
echo ""

# Keep running
wait
