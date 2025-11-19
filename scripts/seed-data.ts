/**
 * Seed script to create initial data for development/testing
 * 
 * Usage:
 *   npx tsx scripts/seed-data.ts [clientUid]
 * 
 * This creates:
 * - A sample Run
 * - Sample stages for the run
 * - Sample guitars (assigned to the provided clientUid or Perry's UID)
 * 
 * Note: Requires Firebase Admin SDK credentials
 */

import * as admin from "firebase-admin";
import * as path from "path";
import * as fs from "fs";

// Get service account key path from environment or use default
const serviceAccountPath =
  process.env.SERVICE_ACCOUNT_KEY_PATH ||
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
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

const db = admin.firestore();

async function seedData() {
  console.log("🌱 Seeding Firestore data...\n");

  try {
    // Create a sample Run
    const runData = {
      name: "Perth Run #1 – January 2026",
      factory: "perth",
      isActive: true,
      startsAt: Date.now(),
    };

    const runRef = await db.collection("runs").add(runData);
    console.log(`✅ Created run: ${runRef.id}`);

    // Create stages for the run
    const stages = [
      {
        label: "Design & Planning",
        order: 0,
        internalOnly: false,
        requiresNote: false,
        requiresPhoto: false,
        clientStatusLabel: "In Planning",
      },
      {
        label: "Wood Selection & Prep",
        order: 1,
        internalOnly: true,
        requiresNote: false,
        requiresPhoto: true,
        clientStatusLabel: "In Build",
      },
      {
        label: "Body Shaping",
        order: 2,
        internalOnly: true,
        requiresNote: false,
        requiresPhoto: true,
        clientStatusLabel: "In Build",
      },
      {
        label: "Neck Carve & Routing",
        order: 3,
        internalOnly: true,
        requiresNote: true,
        requiresPhoto: true,
        clientStatusLabel: "In Build",
      },
      {
        label: "Finishing",
        order: 4,
        internalOnly: true,
        requiresNote: false,
        requiresPhoto: true,
        clientStatusLabel: "In Finish",
      },
      {
        label: "Assembly & Setup",
        order: 5,
        internalOnly: true,
        requiresNote: true,
        requiresPhoto: true,
        clientStatusLabel: "Final Assembly",
      },
      {
        label: "Quality Check",
        order: 6,
        internalOnly: false,
        requiresNote: true,
        requiresPhoto: true,
        clientStatusLabel: "Quality Check",
      },
      {
        label: "Ready for Shipping",
        order: 7,
        internalOnly: false,
        requiresNote: false,
        requiresPhoto: true,
        clientStatusLabel: "Ready to Ship",
      },
    ];

    const stageRefs: { id: string; order: number }[] = [];
    for (const stage of stages) {
      const stageRef = await db
        .collection("runs")
        .doc(runRef.id)
        .collection("stages")
        .add(stage);
      stageRefs.push({ id: stageRef.id, order: stage.order });
      console.log(`✅ Created stage: ${stage.label} (${stageRef.id})`);
    }

    // Get client UID from command line or use Perry's UID
    const clientUid = process.argv[2] || "LNndBSmb4Kbstbv7VKJvojlD0ve2"; // Perry's UID by default
    
    // Verify client exists
    try {
      const clientUser = await admin.auth().getUser(clientUid);
      console.log(`\n✅ Using client: ${clientUser.email} (${clientUid})\n`);
    } catch (error: any) {
      console.error(`\n❌ Error: Client with UID ${clientUid} not found.`);
      console.error("   Please provide a valid client UID or create the user first.\n");
      process.exit(1);
    }

    // Create sample guitars for Perry
    const sampleGuitars = [
      {
        runId: runRef.id,
        stageId: stageRefs[0].id, // Design & Planning
        clientUid: clientUid,
        customerName: "Perry Ormsby",
        customerEmail: "perry@ormsbyguitars.com",
        orderNumber: "ORD-001",
        model: "Goliath Roberto",
        finish: "Green",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        runId: runRef.id,
        stageId: stageRefs[2].id, // Body Shaping
        clientUid: clientUid,
        customerName: "Perry Ormsby",
        customerEmail: "perry@ormsbyguitars.com",
        orderNumber: "ORD-002",
        model: "Hype GTR",
        finish: "Interstellar Blue",
        createdAt: Date.now() - 86400000, // 1 day ago
        updatedAt: Date.now() - 86400000,
      },
    ];

    for (const guitar of sampleGuitars) {
      const guitarRef = await db.collection("guitars").add(guitar);
      console.log(`✅ Created guitar: ${guitar.model} - ${guitar.finish} (${guitarRef.id})`);
      
      // Add a sample note to the first guitar
      if (guitar.orderNumber === "ORD-001") {
        const noteRef = await db
          .collection("guitars")
          .doc(guitarRef.id)
          .collection("notes")
          .add({
            message: "Guitar design approved. Starting wood selection process.",
            authorName: "Factory Staff",
            authorUid: "system",
            visibleToClient: true,
            createdAt: Date.now(),
            photoUrls: [],
          });
        console.log(`   ✅ Added sample note to ${guitar.model}`);
      }
    }

    console.log("\n✅ Seeding complete!");
    console.log(`\n📋 Run ID: ${runRef.id}`);
    console.log(`   View board at: /runs/${runRef.id}/board\n`);
  } catch (error: any) {
    console.error("❌ Error seeding data:", error);
    process.exit(1);
  }
}

seedData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

