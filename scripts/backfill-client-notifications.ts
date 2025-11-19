/**
 * Backfill client notifications for existing client-visible notes.
 *
 * Usage:
 *   npx tsx scripts/backfill-client-notifications.ts
 *
 * Requires SERVICE_ACCOUNT_KEY_PATH or service-account-key.json in project root.
 */

import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";

const serviceAccountPath =
  process.env.SERVICE_ACCOUNT_KEY_PATH ||
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  path.resolve(process.cwd(), "service-account-key.json");

if (!fs.existsSync(serviceAccountPath)) {
  console.error(`Service account key not found at ${serviceAccountPath}`);
  process.exit(1);
}

const serviceAccount = JSON.parse(
  fs.readFileSync(serviceAccountPath, "utf8")
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function backfill() {
  console.log("🔁 Backfilling client notifications…");

  const guitarsSnapshot = await db.collection("guitars").get();
  let createdCount = 0;

  for (const guitarDoc of guitarsSnapshot.docs) {
    const guitar = guitarDoc.data();
    const clientUid = guitar.clientUid;
    if (!clientUid) continue;

    const notesSnapshot = await db
      .collection("guitars")
      .doc(guitarDoc.id)
      .collection("notes")
      .get();

    for (const noteDoc of notesSnapshot.docs) {
      const note = noteDoc.data();
      if (!note.visibleToClient) continue;

      const notificationId = `client_${clientUid}_${noteDoc.id}`;
      const existing = await db.collection("notifications").doc(notificationId).get();
      if (existing.exists) continue;

      await db
        .collection("notifications")
        .doc(notificationId)
        .set({
          userId: clientUid,
          type: "guitar_note_added",
          title: `New update on ${guitar.model || "your guitar"}`,
          message: note.message || "A new update has been posted.",
          guitarId: guitarDoc.id,
          runId: guitar.runId,
          noteId: noteDoc.id,
          metadata: {
            guitarModel: guitar.model,
            guitarFinish: guitar.finish,
            authorName: note.authorName,
          },
          read: false,
          createdAt: note.createdAt || Date.now(),
        });

      createdCount += 1;
      console.log(
        `✅ Created notification for client ${clientUid} from note ${noteDoc.id}`
      );
    }
  }

  console.log(`\n✨ Backfill complete. Created ${createdCount} notification(s).`);
}

backfill()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Backfill failed", error);
    process.exit(1);
  });

