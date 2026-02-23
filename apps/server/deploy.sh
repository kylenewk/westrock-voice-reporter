#!/bin/bash
set -e

echo "========================================="
echo "  WestRock Voice Reporter - Deploy to Railway"
echo "========================================="
echo ""

# Check if railway CLI is available
if ! command -v railway &> /dev/null; then
    echo "Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

# Check if logged in
echo "Checking Railway login..."
if ! railway whoami 2>/dev/null; then
    echo "Please log in to Railway first:"
    railway login
fi

echo ""
echo "Creating Railway project..."
railway init

echo ""
echo "Setting environment variables..."
echo "You'll need to enter your API keys."
echo ""

read -p "Enter your ANTHROPIC_API_KEY (starts with sk-ant-): " ANTHROPIC_KEY
read -p "Enter your HUBSPOT_ACCESS_TOKEN (starts with pat-): " HUBSPOT_TOKEN

railway variables set ANTHROPIC_API_KEY="$ANTHROPIC_KEY"
railway variables set HUBSPOT_ACCESS_TOKEN="$HUBSPOT_TOKEN"
railway variables set HUBSPOT_OWNER_ID="211824246"
railway variables set HUBSPOT_PORTAL_ID="4936417"
railway variables set PORT="3001"

echo ""
echo "Deploying..."
railway up

echo ""
echo "========================================="
echo "  Deployment complete!"
echo "========================================="
echo ""
echo "Run 'railway open' to see your dashboard"
echo "Run 'railway domain' to generate a public URL"
echo ""
