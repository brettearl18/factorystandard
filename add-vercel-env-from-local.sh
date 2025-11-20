#!/bin/bash
set -e

echo "🔧 Adding Environment Variables to Vercel from .env.local"
echo "========================================================="
echo ""

if [ ! -f ".env.local" ]; then
    echo "❌ Error: .env.local file not found!"
    echo "   Please create it first with your Firebase config."
    exit 1
fi

echo "✅ Found .env.local"
echo ""

# Source the .env.local file to get variables
# We'll extract only the NEXT_PUBLIC_ variables
source .env.local

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
  # Get the value from the environment
  value="${!var}"
  
  if [ -z "$value" ]; then
    echo "⚠️  Warning: $var is not set in .env.local, skipping..."
    continue
  fi
  
  echo "Adding $var..."
  
  # Add to production
  echo "$value" | vercel env add "$var" production > /dev/null 2>&1
  if [ $? -eq 0 ]; then
    echo "  ✅ Added to production"
  else
    echo "  ⚠️  Production: May already exist (that's okay)"
  fi
  
  # Add to preview
  echo "$value" | vercel env add "$var" preview > /dev/null 2>&1
  if [ $? -eq 0 ]; then
    echo "  ✅ Added to preview"
  else
    echo "  ⚠️  Preview: May already exist (that's okay)"
  fi
  
  # Add to development
  echo "$value" | vercel env add "$var" development > /dev/null 2>&1
  if [ $? -eq 0 ]; then
    echo "  ✅ Added to development"
  else
    echo "  ⚠️  Development: May already exist (that's okay)"
  fi
  
  echo ""
done

echo "✅ Environment variables setup complete!"
echo ""
echo "Verifying..."
vercel env ls
echo ""
echo "💡 If any variables are missing, you can add them manually:"
echo "   vercel env add VARIABLE_NAME production"
echo ""

