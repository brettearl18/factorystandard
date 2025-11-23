import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

/**
 * Cloud Function triggered when a guitar's stage changes.
 * This can be used to send notifications or perform other actions.
 */
export const onGuitarStageChange = functions.firestore
  .document("guitars/{guitarId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const guitarId = context.params.guitarId;

    // Check if stage changed
    if (before.stageId !== after.stageId) {
      // Log the stage change (you can extend this to send notifications)
      console.log(`Guitar ${guitarId} moved from stage ${before.stageId} to ${after.stageId}`);
      
      // Optional: Create a notification document
      // await admin.firestore().collection("notifications").add({
      //   guitarId,
      //   clientUid: guitar.clientUid,
      //   oldStageId: before.stageId,
      //   newStageId: after.stageId,
      //   createdAt: admin.firestore.FieldValue.serverTimestamp(),
      // });
    }

    return null;
  });

// Export the setUserRole function
export { setUserRole } from "./setUserRole";

// Export the lookupUserByEmail function
export { lookupUserByEmail } from "./lookupUser";

// Export the createUser function
export { createUser } from "./createUser";

// Export the resetUserPassword function
export { resetUserPassword } from "./resetUserPassword";

// Export the listUsers function
export { listUsers } from "./listUsers";

// Export the backupFirestore function
export { backupFirestore } from "./backupFirestore";

// Export the restoreFirestore function
export { restoreFirestore } from "./restoreFirestore";

// Export the listBackups function
export { listBackups } from "./listBackups";

