import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

/**
 * Cloud Function to restore Firestore data from a backup
 * 
 * ⚠️ WARNING: This will overwrite the current database!
 * 
 * This function should only be accessible to admins.
 */
export const restoreFirestore = functions
  .region("us-central1")
  .runWith({
    timeoutSeconds: 540, // 9 minutes max
    memory: "512MB",
  })
  .https.onCall(async (data, context) => {
    // Verify user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated"
      );
    }

    // Check if user is admin
    const userRecord = await admin.auth().getUser(context.auth.uid);
    const customClaims = userRecord.customClaims || {};
    if (customClaims.role !== "admin") {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only admins can restore backups"
      );
    }

    const { inputUriPrefix } = data;
    if (!inputUriPrefix || typeof inputUriPrefix !== "string") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "inputUriPrefix is required"
      );
    }

    const projectId = process.env.GCLOUD_PROJECT || "ormsby-factory-standard-runs";

    try {
      functions.logger.info(`Starting Firestore restore from ${inputUriPrefix}`);

      // Get access token for Firestore Admin API
      const credential = admin.app().options.credential;
      if (!credential) {
        throw new Error("No credential available");
      }

      const accessToken = await credential.getAccessToken();
      if (!accessToken) {
        throw new Error("Failed to get access token");
      }

      // Call Firestore Admin API to trigger import
      const importUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default):importDocuments`;
      
      const response = await fetch(importUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputUriPrefix: inputUriPrefix,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        functions.logger.error(`Import API error: ${response.status} ${errorText}`);
        throw new Error(`Restore failed: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      functions.logger.info(`Restore initiated successfully: ${result.name}`);
      functions.logger.warn(`⚠️ Database restore in progress - this will overwrite current data!`);

      return {
        success: true,
        message: "Restore initiated successfully",
        operationName: result.name,
        inputUri: inputUriPrefix,
        warning: "This operation will overwrite your current database. Monitor the operation status.",
      };
    } catch (error: any) {
      functions.logger.error("Error initiating restore:", error);
      throw new functions.https.HttpsError(
        "internal",
        `Failed to restore backup: ${error.message}`
      );
    }
  });

