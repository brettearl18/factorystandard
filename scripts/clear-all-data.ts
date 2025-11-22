/**
 * Script to clear all client and run data from Firestore
 * 
 * WARNING: This will delete ALL runs, guitars, notes, invoices, client profiles, and notifications
 * 
 * Usage:
 *   npx ts-node scripts/clear-all-data.ts
 * 
 * Note: This requires Firebase Admin SDK credentials.
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

const db = admin.firestore();

async function deleteCollection(collectionPath: string) {
  const collectionRef = db.collection(collectionPath);
  const snapshot = await collectionRef.get();
  
  if (snapshot.empty) {
    console.log(`  ✓ ${collectionPath} is already empty`);
    return 0;
  }

  const batch = db.batch();
  let count = 0;
  
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
    count++;
  });
  
  await batch.commit();
  console.log(`  ✓ Deleted ${count} documents from ${collectionPath}`);
  return count;
}

async function deleteSubcollection(parentPath: string, subcollectionName: string) {
  const parentRef = db.collection(parentPath);
  const parents = await parentRef.get();
  
  if (parents.empty) {
    console.log(`  ✓ No ${parentPath} documents to process for ${subcollectionName}`);
    return 0;
  }

  let totalDeleted = 0;
  
  for (const parentDoc of parents.docs) {
    const subcollectionRef = parentDoc.ref.collection(subcollectionName);
    const snapshot = await subcollectionRef.get();
    
    if (!snapshot.empty) {
      const batch = db.batch();
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
        totalDeleted++;
      });
      await batch.commit();
    }
  }
  
  if (totalDeleted > 0) {
    console.log(`  ✓ Deleted ${totalDeleted} documents from ${parentPath}/*/${subcollectionName}`);
  } else {
    console.log(`  ✓ No documents in ${parentPath}/*/${subcollectionName}`);
  }
  
  return totalDeleted;
}

async function clearAllData() {
  console.log("🗑️  Starting data cleanup...\n");
  
  try {
    // Delete top-level collections
    console.log("Deleting top-level collections:");
    await deleteCollection("runs");
    await deleteCollection("guitars");
    await deleteCollection("notifications");
    await deleteCollection("clients");
    
    // Delete subcollections
    console.log("\nDeleting subcollections:");
    
    // Run stages
    await deleteSubcollection("runs", "stages");
    
    // Guitar notes
    await deleteSubcollection("guitars", "notes");
    
    // Client invoices
    await deleteSubcollection("clients", "invoices");
    
    console.log("\n✅ All data cleared successfully!");
    console.log("\n⚠️  Note: User accounts in Firebase Auth are NOT deleted.");
    console.log("   You may want to delete client users manually if needed.");
    
  } catch (error: any) {
    console.error("\n❌ Error clearing data:", error.message);
    process.exit(1);
  }
}

// Run the script
clearAllData()
  .then(() => {
    console.log("\n✨ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });

