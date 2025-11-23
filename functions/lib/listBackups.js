"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listBackups = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
/**
 * Cloud Function to list available Firestore backups
 *
 * Returns a list of backups from the backup storage bucket.
 */
exports.listBackups = functions
    .region("us-central1")
    .runWith({
    timeoutSeconds: 60,
    memory: "256MB",
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
        throw new functions.https.HttpsError("permission-denied", "Only admins, staff, and accounting can list backups");
    }
    const projectId = process.env.GCLOUD_PROJECT || "ormsby-factory-standard-runs";
    const bucketName = `${projectId}-backups`;
    try {
        // Use Google Cloud Storage API to list backups
        // Note: This requires the Storage API to be accessible
        // For now, we'll return instructions on how to list backups
        functions.logger.info(`Listing backups from gs://${bucketName}/firestore-backups/`);
        // Get access token for Storage API
        const credential = admin.app().options.credential;
        if (!credential) {
            throw new Error("No credential available");
        }
        const accessToken = await credential.getAccessToken();
        if (!accessToken) {
            throw new Error("Failed to get access token");
        }
        // List objects in the backup bucket using Storage API
        const listUrl = `https://storage.googleapis.com/storage/v1/b/${bucketName}/o?prefix=firestore-backups/&delimiter=/`;
        const response = await fetch(listUrl, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${accessToken.access_token}`,
            },
        });
        if (!response.ok) {
            const errorText = await response.text();
            functions.logger.error(`Storage API error: ${response.status} ${errorText}`);
            throw new Error(`Failed to list backups: ${response.status} ${errorText}`);
        }
        const result = await response.json();
        // Extract backup folders (prefixes)
        const backups = [];
        // Process prefixes (folders)
        if (result.prefixes) {
            for (const prefix of result.prefixes) {
                const name = prefix.replace("firestore-backups/", "").replace("/", "");
                backups.push({
                    name: name,
                    path: `gs://${bucketName}/${prefix}`,
                    created: name.match(/^\d{4}-\d{2}-\d{2}/) ? name : undefined, // Extract date if available
                });
            }
        }
        // Sort by date (newest first)
        backups.sort((a, b) => {
            if (a.created && b.created) {
                return b.created.localeCompare(a.created);
            }
            return b.name.localeCompare(a.name);
        });
        return {
            success: true,
            backups: backups,
            bucket: `gs://${bucketName}`,
        };
    }
    catch (error) {
        functions.logger.error("Error listing backups:", error);
        throw new functions.https.HttpsError("internal", `Failed to list backups: ${error.message}`);
    }
});
//# sourceMappingURL=listBackups.js.map