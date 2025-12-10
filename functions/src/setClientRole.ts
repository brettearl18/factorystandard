import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

/**
 * Cloud Function to set client role for newly signed up users
 * This is called after a user signs up via email/password or Google OAuth
 */
export const setClientRole = functions.https.onCall(async (data, context) => {
  // Verify user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated"
    );
  }

  const { uid, displayName } = data;

  // Only allow users to set their own role to "client" (for new signups)
  // Or allow staff/admin to set roles (for existing users)
  const callerUid = context.auth.uid;
  const callerRecord = await admin.auth().getUser(callerUid);
  const callerRole = callerRecord.customClaims?.role;

  // If caller is staff/admin, they can set any user's role
  // If caller is setting their own role, only allow "client" role
  if (callerUid !== uid && callerRole !== "staff" && callerRole !== "admin") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only staff and admins can set roles for other users"
    );
  }

  // If setting own role, only allow "client"
  if (callerUid === uid) {
    try {
      const userRecord = await admin.auth().getUser(uid);
      const existingRole = userRecord.customClaims?.role;
      
      // If user already has a role, don't change it
      if (existingRole) {
        return { success: true, message: "User already has a role", role: existingRole };
      }
      
      // Set role to "client" for new signups
      await admin.auth().setCustomUserClaims(uid, { role: "client" });
      
      // Update display name if provided
      if (displayName) {
        await admin.auth().updateUser(uid, { displayName });
      }
      
      // Create client profile in Firestore
      const db = admin.firestore();
      const clientProfileRef = db.collection("clients").doc(uid);
      await clientProfileRef.set({
        uid: uid,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      
      return { success: true, message: "Client role set successfully", role: "client" };
    } catch (error: any) {
      throw new functions.https.HttpsError(
        "internal",
        `Failed to set client role: ${error.message}`
      );
    }
  } else {
    // Staff/admin setting role for another user
    const targetRole = data.role || "client";
    await admin.auth().setCustomUserClaims(uid, { role: targetRole });
    return { success: true, message: "Role set successfully", role: targetRole };
  }
});



