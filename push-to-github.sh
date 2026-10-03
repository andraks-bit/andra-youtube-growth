#!/bin/bash
# Push code to GitHub and trigger Daily Digest Workflow
# Run: bash push-to-github.sh

set -e

echo "=================================================="
echo "  Push to GitHub & Trigger Workflow"
echo "=================================================="
echo ""

# Check git status
echo "📊 Current Git Status:"
git status --short | head -5
echo ""

# Get latest commit
LATEST_COMMIT=$(git log -1 --oneline)
echo "📝 Latest Commit: $LATEST_COMMIT"
echo ""

# Attempt to push
echo "🚀 Pushing to GitHub (origin main)..."
echo ""
echo "Choose authentication method:"
echo "1. GitHub CLI (gh) - Simplest"
echo "2. HTTPS + Personal Access Token"
echo "3. SSH Key"
echo ""
echo "Running: git push -u origin main"
echo ""

# Try to push - this will prompt for auth if needed
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Push successful!"
    echo ""
    echo "=================================================="
    echo "  Next Steps: Trigger Workflow on GitHub"
    echo "=================================================="
    echo ""
    echo "1. Go to: https://github.com/andraks-bit/andra-youtube-growth/actions"
    echo ""
    echo "2. Select: 'Daily YouTube Analysis & Proposals'"
    echo ""
    echo "3. Click: 'Run workflow' button"
    echo ""
    echo "4. Expected duration: 10-30 minutes"
    echo ""
    echo "5. Check email: 1-5 minutes after workflow completes"
    echo ""
    echo "Look for:"
    echo "  From: andra.kiirkivi@gmail.com"
    echo "  Subject: YouTube Growth Digest"
    echo ""
    echo "=================================================="
else
    echo ""
    echo "❌ Push failed - authentication needed"
    echo ""
    echo "To authenticate, choose one:"
    echo ""
    echo "Option A: GitHub CLI (Recommended)"
    echo "  brew install gh"
    echo "  gh auth login"
    echo "  git push -u origin main"
    echo ""
    echo "Option B: Personal Access Token"
    echo "  1. Go to: https://github.com/settings/tokens"
    echo "  2. Click 'Generate new token'"
    echo "  3. Scopes: repo, workflow"
    echo "  4. git push -u origin main"
    echo "  5. Enter token as password"
    echo ""
    echo "Option C: SSH Key"
    echo "  1. ssh-keygen -t ed25519 -C 'andra.kiirkivi@gmail.com'"
    echo "  2. Add to: https://github.com/settings/ssh/new"
    echo "  3. git remote set-url origin git@github.com:andraks-bit/andra-youtube-growth.git"
    echo "  4. git push -u origin main"
    echo ""
    exit 1
fi
