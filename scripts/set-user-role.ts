/**
 * Utility script to set user roles (custom claims) in Firebase Auth
 * 
 * Usage:
 *   npx ts-node scripts/set-user-role.ts <email> <role>
 * 
 * Roles: staff, client, admin
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

async function setUserRole(email: string, role: "staff" | "client" | "admin" | "factory") {
  try {
    const user = await admin.auth().getUserByEmail(email);
    
    // Set custom claim
    await admin.auth().setCustomUserClaims(user.uid, { role });
    
    console.log(`✅ Successfully set role "${role}" for user ${email} (${user.uid})`);
    console.log(`⚠️  User must sign out and sign in again for changes to take effect.`);
  } catch (error: any) {
    console.error(`❌ Error setting role: ${error.message}`);
    process.exit(1);
  }
}

// Get command line arguments
const email = process.argv[2];
const role = process.argv[3] as "staff" | "client" | "admin";

if (!email || !role) {
  console.error("Usage: npx ts-node scripts/set-user-role.ts <email> <role>");
  console.error("Roles: staff, client, admin");
  process.exit(1);
}

if (!["staff", "client", "admin", "factory"].includes(role)) {
  console.error(`Invalid role: ${role}. Must be one of: staff, client, admin, factory`);
  process.exit(1);
}

setUserRole(email, role)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

