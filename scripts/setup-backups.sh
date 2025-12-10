#!/bin/bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-ormsby-factory-standard-runs}"
BUCKET_NAME="${PROJECT_ID}-backups"
REGION="australia-southeast1"
SCHEDULE_NAME="firestore-weekly-backup"
TIMEZONE="Australia/Perth"

echo "🔧 Setting up automated weekly Firestore backups"
echo "Project: $PROJECT_ID"
echo "Bucket: $BUCKET_NAME"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
  echo "❌ gcloud CLI is not installed. Please install it first."
  echo "   Visit: https://cloud.google.com/sdk/docs/install"
  exit 1
fi

# Set the project
echo "📋 Setting GCP project..."
gcloud config set project "$PROJECT_ID"

# Create backup bucket if it doesn't exist
echo "🪣 Creating backup storage bucket..."
if ! gsutil ls -b "gs://${BUCKET_NAME}" &> /dev/null; then
  gsutil mb -p "$PROJECT_ID" -l "$REGION" "gs://${BUCKET_NAME}"
  echo "✅ Bucket created"
else
  echo "✅ Bucket already exists"
fi

# Enable versioning on the bucket (for recovery)
echo "📦 Enabling versioning on bucket..."
gsutil versioning set on "gs://${BUCKET_NAME}"

# Set lifecycle policy to move old backups to cheaper storage
echo "💰 Setting lifecycle policy for cost optimization..."
cat > /tmp/lifecycle.json <<EOF
{
  "lifecycle": {
    "rule": [
      {
        "action": {
          "type": "SetStorageClass",
          "storageClass": "NEARLINE"
        },
        "condition": {
          "age": 30,
          "matchesPrefix": ["firestore-backups/"]
        }
      },
      {
        "action": {
          "type": "SetStorageClass",
          "storageClass": "COLDLINE"
        },
        "condition": {
          "age": 90,
          "matchesPrefix": ["firestore-backups/"]
        }
      },
      {
        "action": {
          "type": "Delete"
        },
        "condition": {
          "age": 365,
          "matchesPrefix": ["firestore-backups/"]
        }
      }
    ]
  }
}
EOF

gsutil lifecycle set /tmp/lifecycle.json "gs://${BUCKET_NAME}"
rm /tmp/lifecycle.json
echo "✅ Lifecycle policy set (Nearline after 30 days, Coldline after 90 days, delete after 1 year)"

# Create Cloud Scheduler job for weekly backups (every Sunday at 2 AM)
echo "⏰ Creating Cloud Scheduler job for weekly backups..."
if gcloud scheduler jobs describe "$SCHEDULE_NAME" --location="$REGION" --project="$PROJECT_ID" &> /dev/null; then
  echo "⚠️  Scheduler job already exists, updating..."
  gcloud scheduler jobs update http "$SCHEDULE_NAME" \
    --location="$REGION" \
    --schedule="0 2 * * 0" \
    --time-zone="$TIMEZONE" \
    --uri="https://${REGION}-${PROJECT_ID}.cloudfunctions.net/backupFirestore" \
    --http-method=POST \
    --description="Weekly Firestore backup - runs every Sunday at 2 AM" \
    --project="$PROJECT_ID" || true
else
  gcloud scheduler jobs create http "$SCHEDULE_NAME" \
    --location="$REGION" \
    --schedule="0 2 * * 0" \
    --time-zone="$TIMEZONE" \
    --uri="https://${REGION}-${PROJECT_ID}.cloudfunctions.net/backupFirestore" \
    --http-method=POST \
    --description="Weekly Firestore backup - runs every Sunday at 2 AM" \
    --project="$PROJECT_ID"
fi

echo ""
echo "✅ Backup setup complete!"
echo ""
echo "📋 Summary:"
echo "   - Backup bucket: gs://${BUCKET_NAME}"
echo "   - Schedule: Every Sunday at 2 AM (${TIMEZONE})"
echo "   - Retention: 1 year (with automatic tiering)"
echo "   - Cost optimization: Nearline after 30 days, Coldline after 90 days"
echo ""
echo "💡 To test the backup manually:"
echo "   gcloud firestore export gs://${BUCKET_NAME}/firestore-backups/manual-\$(date +%Y%m%d) --project=${PROJECT_ID}"
echo ""
echo "💡 To view backups:"
echo "   gsutil ls -r gs://${BUCKET_NAME}/firestore-backups/"
echo ""
echo "💡 To restore from backup:"
echo "   gcloud firestore import gs://${BUCKET_NAME}/firestore-backups/YYYY-MM-DD --project=${PROJECT_ID}"








