#!/bin/bash

echo "🔑 Firebase Service Account Key Setup"
echo "======================================"
echo ""
echo "To set user roles, you need a Firebase service account key."
echo ""
echo "Steps:"
echo "1. Go to: https://console.firebase.google.com/project/ormsby-factory-standard-runs/settings/serviceaccounts/adminsdk"
echo "2. Click 'Generate new private key'"
echo "3. Save the JSON file (e.g., as 'service-account-key.json')"
echo "4. Run: export GOOGLE_APPLICATION_CREDENTIALS=\"/path/to/service-account-key.json\""
echo "5. Then run: npx ts-node scripts/set-user-role.ts [email] [role]"
echo ""
echo "⚠️  IMPORTANT: Never commit the service account key to git!"
echo "   Add 'service-account-key.json' to .gitignore"

