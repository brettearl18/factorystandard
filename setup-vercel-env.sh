#!/bin/bash
set -e

echo "🔧 Setting up Vercel Environment Variables"
echo "=========================================="
echo ""
echo "You'll need your Firebase config values."
echo "Get them from: Firebase Console → Project Settings → General → Your apps"
echo ""

# Array of environment variables needed
vars=(
  "NEXT_PUBLIC_FIREBASE_API_KEY"
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID"
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"
  "NEXT_PUBLIC_FIREBASE_APP_ID"
)

echo "Adding environment variables to Vercel..."
echo ""

for var in "${vars[@]}"; do
  echo "Enter value for $var:"
  read -r value
  
  if [ -n "$value" ]; then
    echo "Adding $var to production, preview, and development environments..."
    vercel env add "$var" production <<< "$value"
    vercel env add "$var" preview <<< "$value"
    vercel env add "$var" development <<< "$value"
    echo "✅ $var added"
    echo ""
  else
    echo "⚠️  Skipping $var (empty value)"
    echo ""
  fi
done

echo "✅ Environment variables setup complete!"
echo ""
echo "You can verify them with: vercel env ls"
echo ""

