import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

/**
 * Cloud Function to set user role (callable from client with admin privileges)
 * 
 * This should be protected to only allow admins to call it.
 * For production, add proper authentication checks.
 */
export const setUserRole = functions.https.onCall(async (data, context) => {
  // Verify user is authenticated and is admin
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated"
    );
  }

  // Check if user is admin (you'll need to set this claim manually first)
  const userRecord = await admin.auth().getUser(context.auth.uid);
  const userRole = userRecord.customClaims?.role;

  if (userRole !== "admin") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only admins can set user roles"
    );
  }

  const { email, role } = data;

  if (!email || !role) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Email and role are required"
    );
  }

  if (!["staff", "client", "admin", "factory", "accounting"].includes(role)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Role must be one of: staff, client, admin, factory, accounting"
    );
  }

  try {
    const targetUser = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(targetUser.uid, { role });

    return { success: true, message: `Role "${role}" set for ${email}` };
  } catch (error: any) {
    throw new functions.https.HttpsError(
      "internal",
      `Failed to set role: ${error.message}`
    );
  }
});

