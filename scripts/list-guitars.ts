/**
 * List all guitars in Firestore with their IDs
 * 
 * Usage:
 *   npx ts-node scripts/list-guitars.ts
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

async function listGuitars() {
  console.log("🔍 Listing all guitars...\n");

  try {
    const guitarsSnapshot = await db.collection("guitars").get();
    
    if (guitarsSnapshot.empty) {
      console.log("❌ No guitars found in database.");
      console.log("\n💡 Run the seed script first: npx ts-node scripts/seed-data.ts\n");
      return;
    }

    console.log(`Found ${guitarsSnapshot.size} guitar(s):\n`);
    
    guitarsSnapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`📸 ${data.model || "Unknown Model"}`);
      console.log(`   ID: ${doc.id}`);
      console.log(`   Order: ${data.orderNumber || "N/A"}`);
      console.log(`   Customer: ${data.customerName || "N/A"}`);
      console.log(`   Client UID: ${data.clientUid || "N/A"}`);
      console.log(`   Client URL: http://localhost:3000/my-guitars/${doc.id}`);
      console.log(`   Staff URL: (View on run board: /runs/${data.runId}/board)`);
      console.log("");
    });

    // Show first guitar URL
    const firstGuitar = guitarsSnapshot.docs[0];
    const firstData = firstGuitar.data();
    console.log("\n✨ Quick Access URLs:");
    console.log(`   Client View: http://localhost:3000/my-guitars/${firstGuitar.id}`);
    console.log(`   (Make sure you're logged in as the client: ${firstData.clientUid || "REPLACE_WITH_CLIENT_UID"})`);
    console.log("");

  } catch (error: any) {
    console.error("❌ Error listing guitars:", error);
    process.exit(1);
  }
}

listGuitars()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

