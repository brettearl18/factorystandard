"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUser = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const mailgun_1 = require("./mailgun");
const emailTemplates_1 = require("./emailTemplates");
const callableOpts = { memory: "128MB", timeoutSeconds: 30 };
/**
 * Cloud Function to create a new Firebase Auth user
 */
exports.createUser = functions.runWith(callableOpts).https.onCall(async (data, context) => {
    // Verify user is authenticated and is staff/admin
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
    }
    // Check if user is staff/admin
    const userRecord = await admin.auth().getUser(context.auth.uid);
    const userRole = userRecord.customClaims?.role;
    if (userRole !== "staff" && userRole !== "admin") {
        throw new functions.https.HttpsError("permission-denied", "Only staff and admins can create users");
    }
    const { email, password, displayName, role } = data;
    if (!email || typeof email !== "string") {
        throw new functions.https.HttpsError("invalid-argument", "Email is required");
    }
    try {
        // Check if user already exists
        try {
            const existingUser = await admin.auth().getUserByEmail(email);
            return {
                success: false,
                message: "User already exists",
                uid: existingUser.uid,
            };
        }
        catch (error) {
            if (error.code !== "auth/user-not-found") {
                throw error;
            }
            // User doesn't exist, continue to create
        }
        // Create the user
        const newUser = await admin.auth().createUser({
            email,
            password: password || undefined, // If no password, user will need to reset
            displayName: displayName || undefined,
            emailVerified: false,
        });
        // Set role if provided (default to "client")
        const userRole = role || "client";
        await admin.auth().setCustomUserClaims(newUser.uid, { role: userRole });
        // Store initial password and creation info in client profile (only if password was provided and role is client)
        if (password && userRole === "client") {
            try {
                const db = admin.firestore();
                const clientProfileRef = db.collection("clients").doc(newUser.uid);
                await clientProfileRef.set({
                    uid: newUser.uid,
                    initialPassword: password, // Store password for staff/admin to retrieve
                    accountCreatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    accountCreatedBy: context.auth.uid,
                }, { merge: true }); // Use merge to not overwrite existing profile data
            }
            catch (profileError) {
                // Log error but don't fail user creation
                console.error("Failed to store initial password in profile:", profileError);
            }
        }
        // If no password was provided, generate password reset link
        // Note: Firebase Auth will automatically send password reset email if email provider is configured
        let resetLink = null;
        if (!password) {
            try {
                if (process.env.FIREBASE_AUTH_DOMAIN) {
                    resetLink = await admin.auth().generatePasswordResetLink(email, {
                        url: `https://${process.env.FIREBASE_AUTH_DOMAIN}/login`,
                    });
                }
                else {
                    resetLink = await admin.auth().generatePasswordResetLink(email);
                }
                // Log the link for manual sending if needed
                console.log(`Password reset link for ${email}: ${resetLink}`);
            }
            catch (resetError) {
                console.error("Failed to generate password reset link:", resetError);
            }
        }
        // Send welcome "you have a login and password" email to new clients (Mailgun)
        if (userRole === "client") {
            const mailCfg = (0, mailgun_1.getMailgunConfig)();
            if (mailCfg) {
                const html = (0, emailTemplates_1.welcomeLoginHtml)({
                    brandName: mailCfg.fromName,
                    portalUrl: mailCfg.portalUrl || "",
                    logoUrl: mailCfg.logoUrl,
                }, email, password || null, resetLink);
                const subject = `Your ${mailCfg.fromName} portal login`;
                const sent = await (0, mailgun_1.sendEmail)(email, subject, html);
                if (!sent) {
                    functions.logger.warn("Welcome email not sent (Mailgun may be unconfigured or failed)", { to: email });
                }
            }
        }
        return {
            success: true,
            uid: newUser.uid,
            email: newUser.email,
            displayName: newUser.displayName,
            role: userRole,
            resetLink: resetLink || null,
            message: password
                ? "User created successfully"
                : "User created. Password reset link generated.",
        };
    }
    catch (error) {
        throw new functions.https.HttpsError("internal", `Failed to create user: ${error.message}`);
    }
});
//# sourceMappingURL=createUser.js.map