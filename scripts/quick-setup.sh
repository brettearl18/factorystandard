#!/bin/bash
set -e

echo "🚀 Factory Standards - Quick Setup"
echo "===================================="
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 20+ first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"

# Check Firebase CLI
if ! command -v firebase &> /dev/null; then
    echo "📦 Installing Firebase CLI..."
    npm install -g firebase-tools
else
    echo "✅ Firebase CLI installed: $(firebase --version)"
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "📦 Installing Functions dependencies..."
cd functions && npm install && cd ..

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo ""
    echo "⚠️  .env.local not found!"
    echo "   Create .env.local with your Firebase config."
    echo "   See FIREBASE_SETUP.md for instructions."
else
    echo ""
    echo "✅ .env.local found"
fi

# Check if Firebase is initialized
if [ ! -f ".firebaserc" ]; then
    echo ""
    echo "⚠️  Firebase not initialized!"
    echo "   Run: firebase init"
    echo "   Or: ./scripts/setup-firebase.sh"
else
    echo ""
    echo "✅ Firebase project configured"
    cat .firebaserc
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Configure .env.local with your Firebase config"
echo "2. Run: firebase init (if not done already)"
echo "3. Deploy Firestore rules: firebase deploy --only firestore:rules"
echo "4. Start dev server: npm run dev"
echo ""
echo "See FIREBASE_SETUP.md for detailed instructions."

