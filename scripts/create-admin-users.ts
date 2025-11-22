/**
 * Script to create admin users with passwords
 * 
 * Usage:
 *   npx ts-node scripts/create-admin-users.ts
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

interface AdminUser {
  email: string;
  password: string;
  displayName: string;
}

const adminUsers: AdminUser[] = [
  {
    email: "Perry@ormsbyguitars.com",
    password: "Ormsby123!@#",
    displayName: "Perry Ormsby",
  },
  {
    email: "Accounts@ormsbyguitars.com",
    password: "Accounts123!@#",
    displayName: "Accounts",
  },
  {
    email: "Guitars@ormsbyguitars.com",
    password: "Guitar123!@#",
    displayName: "Guitars",
  },
  {
    email: "marketing@ormsbyguitars.com",
    password: "Marketing123!@#",
    displayName: "Marketing",
  },
];

async function createAdminUser(user: AdminUser) {
  try {
    // Check if user already exists
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(user.email);
      console.log(`  ⚠️  User ${user.email} already exists (UID: ${userRecord.uid})`);
      
      // Update password if user exists
      await admin.auth().updateUser(userRecord.uid, {
        password: user.password,
        displayName: user.displayName,
        emailVerified: true,
      });
      console.log(`  ✓ Updated password and display name`);
      
      // Set admin role
      await admin.auth().setCustomUserClaims(userRecord.uid, { role: "admin" });
      console.log(`  ✓ Set role to "admin"`);
      
      return { success: true, action: "updated", uid: userRecord.uid };
    } catch (error: any) {
      if (error.code !== "auth/user-not-found") {
        throw error;
      }
      
      // User doesn't exist, create new
      userRecord = await admin.auth().createUser({
        email: user.email,
        password: user.password,
        displayName: user.displayName,
        emailVerified: true,
      });
      
      // Set admin role
      await admin.auth().setCustomUserClaims(userRecord.uid, { role: "admin" });
      
      console.log(`  ✓ Created user with admin role (UID: ${userRecord.uid})`);
      return { success: true, action: "created", uid: userRecord.uid };
    }
  } catch (error: any) {
    console.error(`  ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function createAllAdminUsers() {
  console.log("👤 Creating admin users...\n");
  
  const results = [];
  
  for (const user of adminUsers) {
    console.log(`Processing: ${user.email}`);
    const result = await createAdminUser(user);
    results.push({ email: user.email, ...result });
    console.log("");
  }
  
  // Summary
  console.log("📊 Summary:");
  console.log("─".repeat(50));
  
  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);
  
  successful.forEach((result) => {
    const action = result.action === "created" ? "Created" : "Updated";
    console.log(`✅ ${action}: ${result.email}`);
  });
  
  if (failed.length > 0) {
    console.log("\n❌ Failed:");
    failed.forEach((result) => {
      console.log(`   ${result.email}: ${result.error}`);
    });
  }
  
  console.log(`\n✨ ${successful.length}/${adminUsers.length} users processed successfully`);
  console.log("\n⚠️  Users must sign out and sign in again for role changes to take effect.");
}

// Run the script
createAllAdminUsers()
  .then(() => {
    console.log("\n✨ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });

