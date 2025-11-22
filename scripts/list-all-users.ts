/**
 * Script to list all Firebase Auth users and their roles
 * 
 * Usage:
 *   npx tsx scripts/list-all-users.ts
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

async function listAllUsers() {
  console.log("👤 Listing all Firebase Auth users...\n");
  
  try {
    let nextPageToken: string | undefined;
    const allUsers: any[] = [];
    
    do {
      const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);
      
      listUsersResult.users.forEach((user) => {
        const role = user.customClaims?.role || "no role";
        allUsers.push({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          role,
          emailVerified: user.emailVerified,
          createdAt: user.metadata.creationTime,
        });
      });
      
      nextPageToken = listUsersResult.pageToken;
    } while (nextPageToken);
    
    // Group by role
    const byRole: Record<string, any[]> = {};
    allUsers.forEach((user) => {
      const role = user.role || "no role";
      if (!byRole[role]) {
        byRole[role] = [];
      }
      byRole[role].push(user);
    });
    
    console.log(`📊 Total users: ${allUsers.length}\n`);
    console.log("Users by role:");
    console.log("─".repeat(60));
    
    Object.keys(byRole).sort().forEach((role) => {
      const users = byRole[role];
      console.log(`\n${role.toUpperCase()} (${users.length}):`);
      users.forEach((user) => {
        console.log(`  - ${user.email} (${user.displayName || "No name"}) - UID: ${user.uid}`);
      });
    });
    
  } catch (error: any) {
    console.error("❌ Error listing users:", error.message);
    process.exit(1);
  }
}

listAllUsers()
  .then(() => {
    console.log("\n✨ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });

