#!/bin/bash
# Deploy Factory Standards everywhere: Cloud Run, Firebase Hosting, Functions, Firestore, Storage
set -euo pipefail

cd "$(dirname "$0")"

echo "═══════════════════════════════════════════════════════════"
echo "  Factory Standards — full deploy (Cloud Run + Firebase)"
echo "═══════════════════════════════════════════════════════════"
echo ""

# 1. Cloud Run + Firebase Hosting (Next.js app)
echo "▶ Step 1/2: Cloud Run + Firebase Hosting"
./deploy-cloud-run.sh

# 2. Firebase: Functions, Firestore rules/indexes, Storage rules
echo ""
echo "▶ Step 2/2: Firebase (Functions, Firestore, Storage)"
firebase deploy --only functions,firestore,storage

echo ""
echo "✅ Full deployment complete."
