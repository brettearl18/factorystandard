/**
 * Script to create factory worker user
 * 
 * Usage:
 *   npx ts-node scripts/create-factory-user.ts
 * 
 * Note: This requires Firebase Admin SDK credentials.
 * Set GOOGLE_APPLICATION_CREDENTIALS environment variable or use service account.
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
      // Try to use default credentials
      admin.initializeApp();
    }
  } else {
    // Try to use default credentials (e.g., from Firebase emulator or GCP)
    admin.initializeApp();
  }
}

async function createFactoryUser() {
  const email = "Factory@ormsbyguitars.com";
  const password = "Factory123!@#";
  const displayName = "Factory Worker";
  const role = "factory";

  try {
    // Check if user already exists
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
      console.log(`⚠️  User ${email} already exists (UID: ${userRecord.uid})`);
      
      // Update password and role if user exists
      await admin.auth().updateUser(userRecord.uid, {
        password: password,
        displayName: displayName,
        emailVerified: true,
      });
      console.log(`✓ Updated password and display name`);
      
      // Set factory role
      await admin.auth().setCustomUserClaims(userRecord.uid, { role });
      console.log(`✓ Set role to "factory"`);
      
      console.log(`\n✅ Factory worker account ready!`);
      console.log(`   Email: ${email}`);
      console.log(`   Password: ${password}`);
      console.log(`   Role: ${role}`);
      console.log(`\n⚠️  User must sign out and sign in again for role changes to take effect.`);
      
      return { success: true, action: "updated", uid: userRecord.uid };
    } catch (error: any) {
      if (error.code !== "auth/user-not-found") {
        throw error;
      }
      
      // User doesn't exist, create new
      userRecord = await admin.auth().createUser({
        email,
        password,
        displayName,
        emailVerified: true,
      });
      
      // Set factory role
      await admin.auth().setCustomUserClaims(userRecord.uid, { role });
      
      console.log(`✅ Created factory worker user (UID: ${userRecord.uid})`);
      console.log(`   Email: ${email}`);
      console.log(`   Password: ${password}`);
      console.log(`   Role: ${role}`);
      
      return { success: true, action: "created", uid: userRecord.uid };
    }
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

createFactoryUser()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });







