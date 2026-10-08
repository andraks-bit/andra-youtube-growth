#!/bin/bash
# Local TikTok Sandbox Demo Runner
# Run this to start a complete working demo locally for recording

set -e

echo "🚀 Starting TikTok Sandbox Demo..."
echo ""

# Check for required credentials
if [ -z "$TIKTOK_CLIENT_ID" ] || [ -z "$TIKTOK_CLIENT_SECRET" ]; then
  echo "❌ Error: Missing credentials"
  echo ""
  echo "Set environment variables first:"
  echo "  export TIKTOK_CLIENT_ID='your-sandbox-client-id'"
  echo "  export TIKTOK_CLIENT_SECRET='your-sandbox-client-secret'"
  echo ""
  exit 1
fi

echo "✓ Credentials found"
echo ""

# Start backend on port 3001
echo "Starting backend on http://localhost:3001..."
node tiktok-sandbox-backend.js &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"
sleep 2

# Start frontend on port 3000
echo "Starting frontend on http://localhost:3000..."
python3 -m http.server 3000 --directory . &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"
sleep 2

echo ""
echo "✅ Demo is ready!"
echo ""
echo "📱 DEMO URL: http://localhost:3000/tiktok-sandbox-demo.html"
echo ""
echo "🔐 Backend:  http://localhost:3001"
echo "🎨 Frontend: http://localhost:3000"
echo ""
echo "Click the 'Sign in with TikTok' button to start OAuth flow"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for user interrupt
trap "echo ''; echo 'Stopping services...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT

wait
