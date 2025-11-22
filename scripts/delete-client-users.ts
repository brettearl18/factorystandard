/**
 * Script to delete all Firebase Auth users with "client" role
 * 
 * WARNING: This will permanently delete all client users from Firebase Auth
 * 
 * Usage:
 *   npx tsx scripts/delete-client-users.ts
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

async function deleteClientUsers() {
  console.log("🗑️  Finding all client users...\n");
  
  try {
    let nextPageToken: string | undefined;
    const clientUsers: string[] = [];
    
    do {
      const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);
      
      listUsersResult.users.forEach((user) => {
        const role = user.customClaims?.role;
        if (role === "client") {
          clientUsers.push(user.uid);
          console.log(`  Found: ${user.email} (${user.uid})`);
        }
      });
      
      nextPageToken = listUsersResult.pageToken;
    } while (nextPageToken);
    
    if (clientUsers.length === 0) {
      console.log("✅ No client users found. Nothing to delete.");
      return;
    }
    
    console.log(`\n⚠️  About to delete ${clientUsers.length} client user(s)`);
    console.log("Deleting...\n");
    
    // Delete in batches (Firebase allows up to 1000 deletions per batch)
    const batchSize = 1000;
    for (let i = 0; i < clientUsers.length; i += batchSize) {
      const batch = clientUsers.slice(i, i + batchSize);
      await admin.auth().deleteUsers(batch);
      console.log(`  ✓ Deleted batch ${Math.floor(i / batchSize) + 1} (${batch.length} users)`);
    }
    
    console.log(`\n✅ Successfully deleted ${clientUsers.length} client user(s)`);
    
  } catch (error: any) {
    console.error("❌ Error deleting users:", error.message);
    process.exit(1);
  }
}

deleteClientUsers()
  .then(() => {
    console.log("\n✨ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });

