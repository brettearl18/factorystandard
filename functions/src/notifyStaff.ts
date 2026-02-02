/**
 * Helper to get all staff/admin UIDs and create in-app notifications for each.
 * Used by Firestore triggers (comments, payment pending) so notifications work
 * even when the action is performed by a client (who cannot call listUsers).
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

export interface NotificationPayload {
  type: string;
  title: string;
  message: string;
  guitarId?: string;
  runId?: string;
  noteId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Get UIDs of all users with role "staff" or "admin".
 */
export async function getStaffUids(): Promise<string[]> {
  const uids: string[] = [];
  let nextPageToken: string | undefined;

  do {
    const listResult = await admin.auth().listUsers(1000, nextPageToken);
    for (const user of listResult.users) {
      const role = (user.customClaims as Record<string, string> | undefined)?.role;
      if (role === "staff" || role === "admin") {
        uids.push(user.uid);
      }
    }
    nextPageToken = listResult.pageToken;
  } while (nextPageToken);

  return [...new Set(uids)];
}

/**
 * Create a notification for every staff/admin user. Non-blocking; logs errors.
 */
export async function notifyAllStaff(payload: NotificationPayload): Promise<void> {
  try {
    const staffUids = await getStaffUids();
    if (staffUids.length === 0) {
      functions.logger.info("No staff users to notify");
      return;
    }

    const db = admin.firestore();
    const batch = db.batch();
    const notificationsRef = db.collection("notifications");
    const now = Date.now();

    for (const uid of staffUids) {
      const ref = notificationsRef.doc();
      batch.set(ref, {
        userId: uid,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        read: false,
        createdAt: now,
        ...(payload.guitarId && { guitarId: payload.guitarId }),
        ...(payload.runId && { runId: payload.runId }),
        ...(payload.noteId && { noteId: payload.noteId }),
        ...(payload.metadata && Object.keys(payload.metadata).length > 0 && { metadata: payload.metadata }),
      });
    }

    await batch.commit();
    functions.logger.info("Notified staff", { count: staffUids.length, type: payload.type });
  } catch (err) {
    functions.logger.error("notifyAllStaff failed", err);
  }
}
