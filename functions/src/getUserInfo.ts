import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

/**
 * Cloud Function to get user info by UID
 * 
 * This allows staff/accounting to get user display name and email for invoices.
 */
export const getUserInfo = functions.https.onCall(async (data, context) => {
  // Verify user is authenticated and is staff/admin/accounting
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated"
    );
  }

  // Check if user is staff/admin/accounting
  const userRecord = await admin.auth().getUser(context.auth.uid);
  const userRole = userRecord.customClaims?.role;

  if (userRole !== "staff" && userRole !== "admin" && userRole !== "accounting") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only staff, admins, and accounting can get user info"
    );
  }

  const { uid } = data;

  if (!uid || typeof uid !== "string") {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "User UID is required"
    );
  }

  try {
    const targetUser = await admin.auth().getUser(uid);
    
    return {
      success: true,
      uid: targetUser.uid,
      email: targetUser.email || null,
      displayName: targetUser.displayName || null,
      role: targetUser.customClaims?.role || null,
    };
  } catch (error: any) {
    if (error.code === "auth/user-not-found") {
      return {
        success: false,
        message: "User not found",
      };
    }
    throw new functions.https.HttpsError(
      "internal",
      `Failed to get user info: ${error.message}`
    );
  }
});





