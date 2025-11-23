# Automated Weekly Firestore Backups

## ✅ Setup Complete

Automated weekly backups have been configured for your Firestore database with cost optimization in mind.

**Setup Status**:
- ✅ Backup storage bucket created: `gs://ormsby-factory-standard-runs-backups`
- ✅ Lifecycle policy configured (auto-delete after 12 weeks / 84 days)
- ✅ Cloud Scheduler job created: `firestore-weekly-backup` (runs every Sunday at 2 AM)
- ✅ Cloud Function deployed: `backupFirestore` (triggers Firestore exports)
- ✅ Cloud Scheduler API enabled
- ✅ Manual backup tested successfully

## 📋 Configuration

- **Backup Schedule**: Every Sunday at 2:00 AM (Australia/Perth timezone)
- **Storage Location**: `gs://ormsby-factory-standard-runs-backups/firestore-backups/`
- **Retention**: 12 weeks (84 days) - backups automatically deleted after this period
- **Storage Class**: Standard (cost-optimized)

## 💰 Cost Estimate

- **Weekly backups**: ~1-5 GB per backup (depends on your data size)
- **Storage cost**: ~$0.02-0.10 per GB/month (Standard storage)
- **With 12-week retention**: ~12-60 GB stored = **~$0.24-1.20/month**
- **Export operations**: Free (included in Firestore pricing)
- **Cloud Scheduler**: Free tier includes 3 jobs, so this is free

**Total estimated monthly cost: $0.24 - $1.20**

## 🔧 Manual Operations

### Test a Manual Backup

```bash
gcloud firestore export gs://ormsby-factory-standard-runs-backups/firestore-backups/manual-$(date +%Y%m%d-%H%M%S) --project=ormsby-factory-standard-runs
```

### View All Backups

```bash
gsutil ls -r gs://ormsby-factory-standard-runs-backups/firestore-backups/
```

### Restore from a Backup

```bash
# First, list backups to find the one you want
gsutil ls gs://ormsby-factory-standard-runs-backups/firestore-backups/

# Then restore (replace YYYY-MM-DD with actual date)
gcloud firestore import gs://ormsby-factory-standard-runs-backups/firestore-backups/YYYY-MM-DD --project=ormsby-factory-standard-runs
```

**⚠️ Warning**: Restoring will overwrite your current database. Only restore if you're sure you want to replace current data.

## 📅 Backup Schedule Details

- **Frequency**: Weekly (every Sunday)
- **Time**: 2:00 AM Australia/Perth time
- **Format**: Backups are stored with date prefixes: `YYYY-MM-DD/`
- **Automatic Cleanup**: Backups older than 12 weeks are automatically deleted

## 🔍 Monitoring

### Check Backup Status

1. **Via Google Cloud Console**:
   - Go to [Cloud Scheduler](https://console.cloud.google.com/cloudscheduler)
   - Find the `firestore-weekly-backup` job
   - View execution history

2. **Via Command Line**:
   ```bash
   gcloud scheduler jobs describe firestore-weekly-backup --location=australia-southeast1 --project=ormsby-factory-standard-runs
   ```

3. **View Backup Files**:
   ```bash
   gsutil ls -lh gs://ormsby-factory-standard-runs-backups/firestore-backups/
   ```

## 🛠️ Troubleshooting

### If Backups Stop Running

1. Check Cloud Scheduler job status:
   ```bash
   gcloud scheduler jobs describe firestore-weekly-backup --location=australia-southeast1
   ```

2. Check service account permissions:
   - The service account `ormsby-factory-standard-runs@appspot.gserviceaccount.com` needs:
     - `roles/datastore.exportAdmin` (for exports)
     - `roles/storage.objectAdmin` (for writing to bucket)

3. Verify bucket exists:
   ```bash
   gsutil ls -b gs://ormsby-factory-standard-runs-backups
   ```

### Adjust Retention Period

To change the retention period (currently 12 weeks), update the lifecycle policy:

```bash
# Edit the age value (currently 84 days = 12 weeks)
cat > /tmp/lifecycle.json <<EOF
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {
          "age": 84,  # Change this number (days)
          "matchesPrefix": ["firestore-backups/"]
        }
      }
    ]
  }
}
EOF

gsutil lifecycle set /tmp/lifecycle.json gs://ormsby-factory-standard-runs-backups
rm /tmp/lifecycle.json
```

### Change Backup Frequency

To change from weekly to daily or monthly:

```bash
# Daily (every day at 2 AM)
gcloud scheduler jobs update http firestore-weekly-backup \
  --schedule='0 2 * * *' \
  --location=australia-southeast1

# Monthly (first day of month at 2 AM)
gcloud scheduler jobs update http firestore-weekly-backup \
  --schedule='0 2 1 * *' \
  --location=australia-southeast1
```

## 📊 Backup Structure

Backups are stored in Cloud Storage with the following structure:

```
gs://ormsby-factory-standard-runs-backups/
  └── firestore-backups/
      ├── 2025-11-23/          # Weekly automated backup
      ├── 2025-11-30/
      ├── manual-20251123-071754/  # Manual backup
      └── ...
```

Each backup contains:
- All Firestore collections and documents
- Metadata and indexes
- Complete database state at the time of export

## 🔐 Security

- Backups are stored in a private Cloud Storage bucket
- Only service accounts with proper permissions can access backups
- No public access is granted to backup files
- Lifecycle policies automatically clean up old backups

## 📝 Notes

- Backups are incremental-friendly (Firestore export format)
- Restore operations can be done to a different project if needed
- Backups include all collections, documents, and indexes
- Photos stored in Firebase Storage are NOT included (only Firestore metadata)

---

**Last Updated**: November 23, 2025
**Setup Script**: `scripts/setup-backups-simple.sh`

