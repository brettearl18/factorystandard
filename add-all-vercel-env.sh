#!/bin/bash
set -e

echo "🔧 Adding All Firebase Environment Variables to Vercel"
echo "======================================================"
echo ""

if [ ! -f ".env.local" ]; then
    echo "❌ Error: .env.local file not found!"
    exit 1
fi

# Source the .env.local file
source .env.local

# Function to add env var to all environments
add_env_var() {
    local var_name=$1
    local value=$2
    
    if [ -z "$value" ]; then
        echo "⚠️  $var_name is empty, skipping..."
        return
    fi
    
    echo "Adding $var_name..."
    
    # Add to production
    echo "$value" | vercel env add "$var_name" production 2>&1 | grep -v "already exists" || true
    
    # Add to preview  
    echo "$value" | vercel env add "$var_name" preview 2>&1 | grep -v "already exists" || true
    
    # Add to development
    echo "$value" | vercel env add "$var_name" development 2>&1 | grep -v "already exists" || true
    
    echo "  ✅ $var_name added to all environments"
    echo ""
}

# Add all variables
add_env_var "NEXT_PUBLIC_FIREBASE_API_KEY" "$NEXT_PUBLIC_FIREBASE_API_KEY"
add_env_var "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN" "$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"
add_env_var "NEXT_PUBLIC_FIREBASE_PROJECT_ID" "$NEXT_PUBLIC_FIREBASE_PROJECT_ID"
add_env_var "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET" "$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"
add_env_var "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID" "$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"
add_env_var "NEXT_PUBLIC_FIREBASE_APP_ID" "$NEXT_PUBLIC_FIREBASE_APP_ID"

echo "✅ All environment variables added!"
echo ""
echo "Verifying..."
vercel env ls
echo ""

