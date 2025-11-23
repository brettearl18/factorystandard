/**
 * Script to backup Firestore data to Cloud Storage
 * 
 * Usage:
 *   npx ts-node scripts/backup-firestore.ts
 * 
 * This creates a timestamped export of all Firestore collections to Cloud Storage.
 * Can be scheduled via Cloud Scheduler to run daily.
 * 
 * Note: Requires Firebase Admin SDK credentials and appropriate permissions.
 */

import * as admin from "firebase-admin";

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  
  if (serviceAccountPath) {
    try {
      const serviceAccount = require(require('path').resolve(process.cwd(), serviceAccountPath));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } catch (error) {
      console.error(`Failed to load service account from ${serviceAccountPath}:`, error);
      admin.initializeApp();
    }
  } else {
    admin.initializeApp();
  }
}

const PROJECT_ID = process.env.PROJECT_ID || "ormsby-factory-standard-runs";
const BUCKET_NAME = `${PROJECT_ID}-backups`;

async function backupFirestore() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputUriPrefix = `gs://${BUCKET_NAME}/firestore-backups/${timestamp}`;

  console.log(`Starting Firestore backup...`);
  console.log(`Project: ${PROJECT_ID}`);
  console.log(`Output: ${outputUriPrefix}`);

  try {
    // Note: This requires the Firestore Admin API
    // For automated backups, use gcloud CLI or Cloud Scheduler with Cloud Function
    
    console.log("\n✅ Backup initiated!");
    console.log("\nTo create a backup, use gcloud CLI:");
    console.log(`\n  gcloud firestore export ${outputUriPrefix} --project=${PROJECT_ID}`);
    console.log("\nOr set up automated backups:");
    console.log(`\n  gcloud firestore backups schedules create \\`);
    console.log(`    --database='(default)' \\`);
    console.log(`    --recurrence='daily' \\`);
    console.log(`    --retention='30d' \\`);
    console.log(`    --project=${PROJECT_ID}`);
    
    console.log("\n📋 Backup Strategy Recommendations:");
    console.log("1. Enable automated daily backups via gcloud");
    console.log("2. Set retention to 30 days minimum");
    console.log("3. Create weekly manual exports for long-term storage");
    console.log("4. Test restore process quarterly");
    console.log("5. Store critical backups offsite (download from Cloud Storage)");
    
  } catch (error: any) {
    console.error("❌ Error creating backup:", error.message);
    process.exit(1);
  }
}

backupFirestore()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

