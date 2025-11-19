/**
 * Seed script to create initial data for development/testing
 * 
 * Usage:
 *   npx ts-node scripts/seed-data.ts
 * 
 * This creates:
 * - A sample Run
 * - Sample stages for the run
 * - Sample guitars
 * 
 * Note: Requires Firebase Admin SDK credentials
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

    // Create sample guitars (you'll need to replace clientUid with actual user IDs)
    const sampleGuitars = [
      {
        runId: runRef.id,
        stageId: stageRefs[2].id, // Body Shaping
        clientUid: "REPLACE_WITH_CLIENT_UID", // Replace with actual client UID
        customerName: "John Doe",
        customerEmail: "john@example.com",
        orderNumber: "ORD-001",
        model: "Hype GTR",
        finish: "Interstellar",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        runId: runRef.id,
        stageId: stageRefs[4].id, // Finishing
        clientUid: "REPLACE_WITH_CLIENT_UID", // Replace with actual client UID
        customerName: "Jane Smith",
        customerEmail: "jane@example.com",
        orderNumber: "ORD-002",
        model: "Classic Custom",
        finish: "Vintage Sunburst",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];

    console.log("\n⚠️  Sample guitars created with placeholder clientUid.");
    console.log("   Update the clientUid fields with actual Firebase Auth user IDs.\n");

    for (const guitar of sampleGuitars) {
      const guitarRef = await db.collection("guitars").add(guitar);
      console.log(`✅ Created guitar: ${guitar.model} (${guitarRef.id})`);
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

