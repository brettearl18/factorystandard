import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

/**
 * Cloud Function to look up a user by email and return their UID
 * 
 * This allows staff to easily find client UIDs when creating guitars.
 */
export const lookupUserByEmail = functions.https.onCall(async (data, context) => {
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
      "Only staff and admins can look up users"
    );
  }

  const { email } = data;

  if (!email || typeof email !== "string") {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Email is required"
    );
  }

  try {
    const targetUser = await admin.auth().getUserByEmail(email);
    
    return {
      success: true,
      uid: targetUser.uid,
      email: targetUser.email,
      displayName: targetUser.displayName,
      role: targetUser.customClaims?.role || null,
    };
  } catch (error: any) {
    if (error.code === "auth/user-not-found") {
      return {
        success: false,
        message: "User not found with this email address",
      };
    }
    throw new functions.https.HttpsError(
      "internal",
      `Failed to look up user: ${error.message}`
    );
  }
});

