#!/usr/bin/env node

/**
 * Script to update a user's password in Firebase Auth
 * 
 * Usage:
 *   npx tsx scripts/update-password.ts <uid> <newPassword>
 *   npx tsx scripts/update-password.ts <email> <newPassword>
 */

import * as admin from "firebase-admin";
import * as path from "path";
import * as fs from "fs";

// Get service account key path from environment or use default
const serviceAccountPath =
  process.env.SERVICE_ACCOUNT_KEY_PATH ||
  path.resolve(process.cwd(), "service-account-key.json");

if (!fs.existsSync(serviceAccountPath)) {
  console.error(
    `Error: Service account key not found at ${serviceAccountPath}`
  );
  console.error(
    "Please set SERVICE_ACCOUNT_KEY_PATH environment variable or place service-account-key.json in the project root."
  );
  process.exit(1);
}

const serviceAccount = JSON.parse(
  fs.readFileSync(serviceAccountPath, "utf8")
);

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

async function updatePassword(identifier: string, newPassword: string) {
  try {
    let user: admin.auth.UserRecord;

    // Check if identifier is an email or UID
    if (identifier.includes("@")) {
      // It's an email
      user = await admin.auth().getUserByEmail(identifier);
    } else {
      // It's a UID
      user = await admin.auth().getUser(identifier);
    }

    // Update the password
    await admin.auth().updateUser(user.uid, {
      password: newPassword,
    });

    console.log(`✅ Password updated successfully!`);
    console.log(`   User: ${user.email} (${user.uid})`);
    console.log(`   New password: ${newPassword}`);
    console.log(`\n⚠️  The user will need to sign out and sign back in for the change to take effect.`);
  } catch (error: any) {
    console.error("❌ Error updating password:", error.message);
    if (error.code === "auth/user-not-found") {
      console.error(`   User not found: ${identifier}`);
    }
    process.exit(1);
  }
}

// Get command line arguments
const args = process.argv.slice(2);

if (args.length !== 2) {
  console.error("Usage: npx tsx scripts/update-password.ts <uid|email> <newPassword>");
  console.error("\nExample:");
  console.error('  npx tsx scripts/update-password.ts "user@example.com" "NewPassword123!"');
  console.error('  npx tsx scripts/update-password.ts "LNndBSmb4Kbstbv7VKJvojlD0ve2" "NewPassword123!"');
  process.exit(1);
}

const [identifier, newPassword] = args;

if (!newPassword || newPassword.length < 6) {
  console.error("❌ Error: Password must be at least 6 characters long");
  process.exit(1);
}

updatePassword(identifier, newPassword)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Unexpected error:", error);
    process.exit(1);
  });

