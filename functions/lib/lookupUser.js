"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lookupUserByEmail = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const callableOpts = { memory: "128MB", timeoutSeconds: 30 };
/**
 * Cloud Function to look up a user by email and return their UID
 */
exports.lookupUserByEmail = functions.runWith(callableOpts).https.onCall(async (data, context) => {
    // Verify user is authenticated and is staff/admin
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
    }
    // Check if user is staff/admin
    const userRecord = await admin.auth().getUser(context.auth.uid);
    const userRole = userRecord.customClaims?.role;
    if (userRole !== "staff" && userRole !== "admin") {
        throw new functions.https.HttpsError("permission-denied", "Only staff and admins can look up users");
    }
    const { email } = data;
    if (!email || typeof email !== "string") {
        throw new functions.https.HttpsError("invalid-argument", "Email is required");
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
    }
    catch (error) {
        if (error.code === "auth/user-not-found") {
            return {
                success: false,
                message: "User not found with this email address",
            };
        }
        throw new functions.https.HttpsError("internal", `Failed to look up user: ${error.message}`);
    }
});
//# sourceMappingURL=lookupUser.js.map