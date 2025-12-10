/**
 * Script to create the accounting user account
 * 
 * Usage:
 *   npx ts-node scripts/create-accounting-user.ts
 * 
 * Note: This requires Firebase Admin SDK credentials.
 */

import * as admin from "firebase-admin";
import * as path from "path";

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccountPath = path.resolve(__dirname, "../service-account-key.json");
  
  try {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("✅ Firebase Admin initialized");
  } catch (error: any) {
    console.error(`❌ Failed to load service account: ${error.message}`);
    process.exit(1);
  }
}

async function createAccountingUser() {
  const email = "accounts@ormsbyguitars.com";
  const password = "TempPassword123!@#"; // User should change this on first login
  const displayName = "Accounting";
  const role = "accounting";

  try {
    // Check if user already exists
    let user;
    try {
      user = await admin.auth().getUserByEmail(email);
      console.log(`ℹ️  User ${email} already exists (UID: ${user.uid})`);
    } catch (error: any) {
      if (error.code === "auth/user-not-found") {
        // User doesn't exist, create it
        console.log(`Creating new user: ${email}...`);
        user = await admin.auth().createUser({
          email,
          password,
          displayName,
          emailVerified: false,
        });
        console.log(`✅ User created successfully (UID: ${user.uid})`);
      } else {
        throw error;
      }
    }

    // Set the accounting role
    await admin.auth().setCustomUserClaims(user.uid, { role });
    console.log(`✅ Role "${role}" set for ${email}`);

    console.log("\n📋 User Details:");
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   Role: ${role}`);
    console.log(`   UID: ${user.uid}`);
    console.log("\n⚠️  IMPORTANT:");
    console.log("   1. User must sign out and sign in again for the role to take effect.");
    console.log("   2. User should change their password on first login.");
    console.log("   3. Share these credentials securely with the accounting team.");

  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

createAccountingUser()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });








