"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.backupFirestore = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
/**
 * Cloud Function to export Firestore data to Cloud Storage
 *
 * This function is triggered by Cloud Scheduler weekly to create automated backups.
 *
 * Cost optimization:
 * - Weekly backups instead of daily
 * - Exports to Cloud Storage (cheaper than keeping in Firestore)
 * - Lifecycle policies automatically delete backups after 12 weeks
 */
exports.backupFirestore = functions
    .region("us-central1")
    .runWith({
    timeoutSeconds: 540, // 9 minutes max
    memory: "512MB",
})
    .https.onCall(async (data, context) => {
    // Verify user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
    }
    // Check if user is admin, staff, or accounting
    const userRecord = await admin.auth().getUser(context.auth.uid);
    const customClaims = userRecord.customClaims || {};
    if (customClaims.role !== "admin" && customClaims.role !== "staff" && customClaims.role !== "accounting") {
        throw new functions.https.HttpsError("permission-denied", "Only admins, staff, and accounting can create backups");
    }
    const projectId = process.env.GCLOUD_PROJECT || "ormsby-factory-standard-runs";
    const bucketName = `${projectId}-backups`;
    const timestamp = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const outputUriPrefix = `gs://${bucketName}/firestore-backups/${timestamp}`;
    try {
        functions.logger.info(`Starting Firestore backup to ${outputUriPrefix}`);
        // Get access token for Firestore Admin API
        const credential = admin.app().options.credential;
        if (!credential) {
            throw new Error("No credential available");
        }
        const accessToken = await credential.getAccessToken();
        if (!accessToken) {
            throw new Error("Failed to get access token");
        }
        const exportUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default):exportDocuments`;
        // Call Firestore Admin API to trigger export
        const response = await fetch(exportUrl, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${accessToken.access_token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                outputUriPrefix: outputUriPrefix,
            }),
        });
        if (!response.ok) {
            const errorText = await response.text();
            functions.logger.error(`Export API error: ${response.status} ${errorText}`);
            throw new Error(`Export failed: ${response.status} ${errorText}`);
        }
        const result = await response.json();
        functions.logger.info(`Backup initiated successfully: ${result.name}`);
        functions.logger.info(`Output URI: ${outputUriPrefix}`);
        return {
            success: true,
            message: "Backup initiated successfully",
            operationName: result.name,
            outputUri: outputUriPrefix,
            timestamp: timestamp,
        };
    }
    catch (error) {
        functions.logger.error("Error initiating backup:", error);
        throw new functions.https.HttpsError("internal", `Failed to create backup: ${error.message}`);
    }
});
//# sourceMappingURL=backupFirestore.js.map