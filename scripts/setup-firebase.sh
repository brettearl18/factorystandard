#!/bin/bash
set -e

echo "🔥 Firebase Setup Script"
echo "========================"
echo ""

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI is not installed."
    echo "Install it with: npm install -g firebase-tools"
    exit 1
fi

# Check if user is logged in
if ! firebase projects:list &> /dev/null; then
    echo "📝 Please log in to Firebase:"
    firebase login
fi

# Initialize Firebase if not already initialized
if [ ! -f ".firebaserc" ]; then
    echo "🚀 Initializing Firebase project..."
    firebase init
else
    echo "✅ Firebase project already initialized"
    cat .firebaserc
fi

echo ""
echo "✅ Firebase setup complete!"
echo ""
echo "Next steps:"
echo "1. Add your Firebase config to .env.local (see .env.example)"
echo "2. Deploy Firestore rules: firebase deploy --only firestore:rules"
echo "3. Deploy Cloud Functions: cd functions && npm install && cd .. && firebase deploy --only functions"

