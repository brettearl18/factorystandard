#!/bin/bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-ormsby-factory-standard-runs}"
BUCKET_NAME="${PROJECT_ID}-backups"
REGION="australia-southeast1"
SCHEDULE_NAME="firestore-weekly-backup"
TIMEZONE="Australia/Perth"

echo "🔧 Setting up automated weekly Firestore backups (Cost-Optimized)"
echo "Project: $PROJECT_ID"
echo ""

# Set the project
gcloud config set project "$PROJECT_ID" 2>/dev/null || true

# Create backup bucket if it doesn't exist
echo "🪣 Creating backup storage bucket..."
if ! gsutil ls -b "gs://${BUCKET_NAME}" &> /dev/null 2>&1; then
  gsutil mb -p "$PROJECT_ID" -l "$REGION" "gs://${BUCKET_NAME}"
  echo "✅ Bucket created"
else
  echo "✅ Bucket already exists"
fi

# Set lifecycle policy for cost optimization
echo "💰 Setting lifecycle policy (auto-delete after 12 weeks to keep costs low)..."
cat > /tmp/lifecycle.json <<EOF
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {
          "age": 84,
          "matchesPrefix": ["firestore-backups/"]
        }
      }
    ]
  }
}
EOF

gsutil lifecycle set /tmp/lifecycle.json "gs://${BUCKET_NAME}" 2>/dev/null || true
rm -f /tmp/lifecycle.json
echo "✅ Lifecycle policy set (auto-delete after 12 weeks)"

# Create Cloud Scheduler job for weekly backups (every Sunday at 2 AM)
echo "⏰ Setting up Cloud Scheduler for weekly backups..."
SCHEDULER_CMD="gcloud scheduler jobs create http ${SCHEDULE_NAME} \
  --location=${REGION} \
  --schedule='0 2 * * 0' \
  --time-zone='${TIMEZONE}' \
  --uri='https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default):exportDocuments' \
  --http-method=POST \
  --oauth-service-account-email='${PROJECT_ID}@appspot.gserviceaccount.com' \
  --message-body='{\"outputUriPrefix\": \"gs://${BUCKET_NAME}/firestore-backups/\"}' \
  --description='Weekly Firestore backup - runs every Sunday at 2 AM' \
  --project=${PROJECT_ID}"

# Check if job exists
if gcloud scheduler jobs describe "$SCHEDULE_NAME" --location="$REGION" --project="$PROJECT_ID" &> /dev/null 2>&1; then
  echo "⚠️  Scheduler job already exists"
  echo "   To update, delete and recreate:"
  echo "   gcloud scheduler jobs delete ${SCHEDULE_NAME} --location=${REGION} --project=${PROJECT_ID}"
else
  echo "⚠️  Note: Cloud Scheduler setup requires manual configuration"
  echo "   Use Firebase Console or run this command:"
  echo ""
  echo "   gcloud scheduler jobs create http ${SCHEDULE_NAME} \\"
  echo "     --location=${REGION} \\"
  echo "     --schedule='0 2 * * 0' \\"
  echo "     --time-zone='${TIMEZONE}' \\"
  echo "     --uri='https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default):exportDocuments' \\"
  echo "     --http-method=POST \\"
  echo "     --oauth-service-account-email='${PROJECT_ID}@appspot.gserviceaccount.com' \\"
  echo "     --message-body='{\"outputUriPrefix\": \"gs://${BUCKET_NAME}/firestore-backups/\"}' \\"
  echo "     --description='Weekly Firestore backup' \\"
  echo "     --project=${PROJECT_ID}"
fi

echo ""
echo "✅ Setup instructions complete!"
echo ""
echo "📋 Manual Backup Command (test now):"
echo "   gcloud firestore export gs://${BUCKET_NAME}/firestore-backups/manual-\$(date +%Y%m%d-%H%M%S) --project=${PROJECT_ID}"
echo ""
echo "📋 View Backups:"
echo "   gsutil ls -r gs://${BUCKET_NAME}/firestore-backups/"
echo ""
echo "💰 Cost Estimate:"
echo "   - Weekly backups: ~1-5 GB per backup (depends on data size)"
echo "   - Storage: ~\$0.02-0.10 per GB/month (Standard storage)"
echo "   - With 12-week retention: ~12-60 GB stored = ~\$0.24-1.20/month"
echo "   - Export operations: Free (included in Firestore pricing)"






