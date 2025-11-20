#!/bin/bash
set -e

echo "🚀 Deploying to Vercel..."
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

echo "✅ Vercel CLI ready"
echo ""

# Check if .vercel directory exists (project linked)
if [ ! -d ".vercel" ]; then
    echo "🔗 Linking project to Vercel..."
    echo "   (You'll be prompted to login and configure)"
    vercel
else
    echo "✅ Project already linked"
    echo ""
    echo "📤 Deploying to production..."
    vercel --prod
fi

echo ""
echo "✅ Deployment complete!"
echo ""
echo "💡 Tip: Connect your Git repository in Vercel dashboard"
echo "   for automatic deployments on every push!"

