"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setUserRole = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const callableOpts = { memory: "128MB", timeoutSeconds: 30 };
/**
 * Cloud Function to set user role (callable from client with admin privileges)
 */
exports.setUserRole = functions.runWith(callableOpts).https.onCall(async (data, context) => {
    // Verify user is authenticated and is admin
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
    }
    // Check if user is admin (you'll need to set this claim manually first)
    const userRecord = await admin.auth().getUser(context.auth.uid);
    const userRole = userRecord.customClaims?.role;
    if (userRole !== "admin") {
        throw new functions.https.HttpsError("permission-denied", "Only admins can set user roles");
    }
    const { email, role } = data;
    if (!email || !role) {
        throw new functions.https.HttpsError("invalid-argument", "Email and role are required");
    }
    if (!["staff", "client", "admin", "factory", "accounting"].includes(role)) {
        throw new functions.https.HttpsError("invalid-argument", "Role must be one of: staff, client, admin, factory, accounting");
    }
    try {
        const targetUser = await admin.auth().getUserByEmail(email);
        await admin.auth().setCustomUserClaims(targetUser.uid, { role });
        return { success: true, message: `Role "${role}" set for ${email}` };
    }
    catch (error) {
        throw new functions.https.HttpsError("internal", `Failed to set role: ${error.message}`);
    }
});
//# sourceMappingURL=setUserRole.js.map