import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const callableOpts = { memory: "128MB" as const, timeoutSeconds: 30 };

/**
 * Staff/admin: update a user's display name in Auth and client profile.
 */
export const updateUserDisplayName = functions.runWith(callableOpts).https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated"
    );
  }

  const caller = await admin.auth().getUser(context.auth.uid);
  const callerRole = caller.customClaims?.role;

  if (callerRole !== "staff" && callerRole !== "admin") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only staff and admins can update display names"
    );
  }

  const { uid, displayName } = data;

  if (!uid || typeof uid !== "string") {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "User UID is required"
    );
  }

  if (typeof displayName !== "string" || !displayName.trim()) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Display name is required"
    );
  }

  const trimmed = displayName.trim();

  try {
    await admin.auth().updateUser(uid, { displayName: trimmed });

    const db = admin.firestore();
    await db.collection("clients").doc(uid).set(
      {
        uid,
        displayName: trimmed,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: context.auth.uid,
      },
      { merge: true }
    );

    return {
      success: true,
      displayName: trimmed,
      message: "Display name updated successfully",
    };
  } catch (error: any) {
    throw new functions.https.HttpsError(
      "internal",
      `Failed to update display name: ${error.message}`
    );
  }
});
