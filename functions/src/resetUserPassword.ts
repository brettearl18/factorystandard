import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

/**
 * Cloud Function to reset a user's password
 * 
 * This allows staff/admin to reset a client's password and store it in their profile.
 */
export const resetUserPassword = functions.https.onCall(async (data, context) => {
  // Verify user is authenticated and is staff/admin
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated"
    );
  }

  // Check if user is staff/admin
  const userRecord = await admin.auth().getUser(context.auth.uid);
  const userRole = userRecord.customClaims?.role;

  if (userRole !== "staff" && userRole !== "admin") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only staff and admins can reset passwords"
    );
  }

  const { uid, newPassword } = data;

  if (!uid || typeof uid !== "string") {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "User UID is required"
    );
  }

  if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "New password must be at least 6 characters"
    );
  }

  try {
    // Update the user's password in Firebase Auth
    await admin.auth().updateUser(uid, {
      password: newPassword,
    });

    // Store the new password in the client profile
    const db = admin.firestore();
    const clientProfileRef = db.collection("clients").doc(uid);
    await clientProfileRef.set({
      initialPassword: newPassword,
      accountCreatedBy: context.auth.uid,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return {
      success: true,
      message: "Password reset successfully",
    };
  } catch (error: any) {
    throw new functions.https.HttpsError(
      "internal",
      `Failed to reset password: ${error.message}`
    );
  }
});







