/**
 * Script to update a user's password
 * 
 * Usage:
 *   npx ts-node scripts/update-password.ts <email> <newPassword>
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

async function updatePassword(email: string, newPassword: string) {
  try {
    const user = await admin.auth().getUserByEmail(email);
    
    await admin.auth().updateUser(user.uid, {
      password: newPassword,
    });
    
    console.log(`✅ Password updated successfully for ${email}`);
    console.log(`   New password: ${newPassword}`);
  } catch (error: any) {
    console.error(`❌ Error updating password: ${error.message}`);
    process.exit(1);
  }
}

// Get command line arguments
const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error("Usage: npx ts-node scripts/update-password.ts <email> <newPassword>");
  process.exit(1);
}

updatePassword(email, password)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
