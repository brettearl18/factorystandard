/**
 * Backfill audit logs with backdated entries (e.g. past logins / views).
 * Uses Firebase Admin SDK so it can write any userId and createdAt (bypasses rules).
 *
 * Usage:
 *   npx tsx scripts/backfill-audit-logs.ts [--days=30] [--users=client|all]
 *
 * Options:
 *   --days=N   Spread entries over the last N days (default: 30).
 *   --users=   "client" = only client-role users (default); "all" = every user.
 *
 * Requires GOOGLE_APPLICATION_CREDENTIALS or service-account-key.json.
 */

import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";

const serviceAccountPath =
  process.env.SERVICE_ACCOUNT_KEY_PATH ||
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  path.resolve(process.cwd(), "service-account-key.json");

if (!fs.existsSync(serviceAccountPath)) {
  console.error("Service account key not found. Set GOOGLE_APPLICATION_CREDENTIALS or add service-account-key.json");
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const db = admin.firestore();

function parseArgs(): { days: number; users: "client" | "all" } {
  let days = 30;
  let users: "client" | "all" = "client";
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--days=")) days = Math.max(1, parseInt(arg.slice(7), 10) || 30);
    if (arg.startsWith("--users=")) users = arg.slice(8) === "all" ? "all" : "client";
  }
  return { days, users };
}

function randomPastMs(days: number): number {
  const now = Date.now();
  const msPerDay = 24 * 60 * 60 * 1000;
  const past = days * msPerDay;
  return now - Math.floor(Math.random() * past);
}

async function main() {
  const { days, users: userFilter } = parseArgs();
  console.log(`Backfilling audit logs (last ${days} days, users=${userFilter})…\n`);

  const allUsers: { uid: string; email: string | null; role: string }[] = [];
  let nextPageToken: string | undefined;

  do {
    const list = await admin.auth().listUsers(1000, nextPageToken);
    list.users.forEach((u) => {
      const role = (u.customClaims?.role as string) || "no role";
      allUsers.push({ uid: u.uid, email: u.email ?? null, role });
    });
    nextPageToken = list.pageToken;
  } while (nextPageToken);

  const targetUsers =
    userFilter === "client"
      ? allUsers.filter((u) => u.role === "client")
      : allUsers;

  console.log(`Found ${targetUsers.length} users to backfill.\n`);

  const auditRef = db.collection("auditLogs");
  const BATCH_SIZE = 500; // Firestore limit
  let batch = db.batch();
  let batchCount = 0;
  let totalCount = 0;

  function flushBatch() {
    if (batchCount === 0) return Promise.resolve();
    const current = batch;
    batch = db.batch();
    batchCount = 0;
    return current.commit();
  }

  const TTL_DAYS = 90; // Match app: expireAt = createdAt + 90 days
  const ttlMs = TTL_DAYS * 24 * 60 * 60 * 1000;

  for (const user of targetUsers) {
    // 1–3 login events over the period
    const numLogins = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < numLogins; i++) {
      if (batchCount >= BATCH_SIZE) await flushBatch();
      const createdAtMs = randomPastMs(days);
      batch.set(auditRef.doc(), {
        userId: user.uid,
        userEmail: user.email,
        userRole: user.role === "no role" ? null : user.role,
        action: "login",
        details: {},
        createdAt: admin.firestore.Timestamp.fromMillis(createdAtMs),
        expireAt: admin.firestore.Timestamp.fromMillis(createdAtMs + ttlMs),
      });
      batchCount++;
      totalCount++;
    }
    // 0–2 view_my_guitars per user (only for clients)
    if (user.role === "client") {
      const numViews = Math.floor(Math.random() * 3);
      for (let i = 0; i < numViews; i++) {
        if (batchCount >= BATCH_SIZE) await flushBatch();
        const createdAtMs = randomPastMs(days);
        batch.set(auditRef.doc(), {
          userId: user.uid,
          userEmail: user.email,
          userRole: user.role,
          action: "view_my_guitars",
          details: {},
          createdAt: admin.firestore.Timestamp.fromMillis(createdAtMs),
          expireAt: admin.firestore.Timestamp.fromMillis(createdAtMs + ttlMs),
        });
        batchCount++;
        totalCount++;
      }
    }
  }

  await flushBatch();
  console.log(`Created ${totalCount} backdated audit log entries.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
