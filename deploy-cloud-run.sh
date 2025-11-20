#!/bin/bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-$(node -e "try {console.log(require('./.firebaserc').projects.default)} catch {console.log('')}")}"
REGION="${REGION:-australia-southeast1}"
SERVICE_NAME="${SERVICE_NAME:-factory-standards-web}"

if [[ -z "$PROJECT_ID" ]]; then
  echo "❌ PROJECT_ID is not set. Set PROJECT_ID env var or ensure .firebaserc has a default project."
  exit 1
fi

IMAGE="gcr.io/${PROJECT_ID}/${SERVICE_NAME}:$(date +%Y%m%d%H%M%S)"

echo "🚀 Deploying Factory Standards to Cloud Run + Firebase Hosting"
echo "Project:      $PROJECT_ID"
echo "Region:       $REGION"
echo "Service Name: $SERVICE_NAME"
echo ""

if [[ ! -f ".env.production" ]]; then
  cat <<'EOF'
⚠️  No .env.production file detected.
    Cloud Run requires the NEXT_PUBLIC_* env vars at runtime.
    After deploy, run:
      gcloud run services update SERVICE_NAME \
        --project PROJECT_ID \
        --region REGION \
        --set-env-vars NEXT_PUBLIC_FIREBASE_API_KEY=...,... \
        --platform managed
EOF
  echo ""
fi

echo "📦 Building Docker image via Cloud Build..."
gcloud builds submit --project "$PROJECT_ID" --tag "$IMAGE"

echo "☁️  Deploying to Cloud Run..."
gcloud run deploy "$SERVICE_NAME" \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --platform managed \
  --allow-unauthenticated \
  --image "$IMAGE"

echo "🌐 Updating Firebase Hosting configuration..."
firebase deploy --only hosting --project "$PROJECT_ID"

cat <<EOF
✅ Deployment complete!

Next steps:
1. Ensure Cloud Run service has required NEXT_PUBLIC_* environment variables.
2. Confirm Firebase Hosting rewrites point to Cloud Run service "$SERVICE_NAME".

EOF

