"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendTestEmails = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const mailgun_1 = require("./mailgun");
const emailTemplates_1 = require("./emailTemplates");
const callableOpts = { memory: "256MB", timeoutSeconds: 30 };
/**
 * Callable (admin only): send test emails for stage change + run update to the given address.
 */
exports.sendTestEmails = functions
    .runWith(callableOpts)
    .https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be signed in");
    }
    const userRecord = await admin.auth().getUser(context.auth.uid);
    const role = userRecord.customClaims?.role;
    if (role !== "admin" && role !== "staff") {
        throw new functions.https.HttpsError("permission-denied", "Admin or staff only");
    }
    const to = typeof data?.to === "string" && data.to.trim() ? data.to.trim() : null;
    if (!to) {
        throw new functions.https.HttpsError("invalid-argument", "Provide 'to' email address");
    }
    const cfg = (0, mailgun_1.getMailgunConfig)();
    if (!cfg) {
        throw new functions.https.HttpsError("failed-precondition", "Mailgun not configured");
    }
    const opts = { brandName: cfg.fromName, portalUrl: cfg.portalUrl, logoUrl: cfg.logoUrl };
    // 1. Stage change test
    const stageSubject = "Update: Hype GTR – Interstellar – Finishing";
    const stageHtml = (0, emailTemplates_1.stageChangeHtml)(opts, "Hype GTR – Interstellar", "Perth Run #7 – March 2026", "Neck Carve & Routing", "Finishing");
    const stageText = "Your guitar Hype GTR – Interstellar (Perth Run #7 – March 2026) has moved from Neck Carve & Routing to Finishing. Log in to the portal for details.";
    await (0, mailgun_1.sendEmail)(to, stageSubject, stageHtml, stageText);
    // 2. Run update test
    const runSubject = "Perth Run #7 – March 2026: Week 3 progress";
    const runHtml = (0, emailTemplates_1.runUpdateHtml)(opts, "Perth Run #7 – March 2026", "Week 3 progress", "The Factory Team", "This is a test of the run update email.\n\nYour builds are moving along nicely. Log in to the portal to see photos and full details.");
    const runText = "Perth Run #7 – March 2026: Week 3 progress\n\nThe Factory Team:\nThis is a test of the run update email.\n\nYour builds are moving along nicely. Log in to the portal for full details.";
    await (0, mailgun_1.sendEmail)(to, runSubject, runHtml, runText);
    return { success: true, sent: 2, to };
});
//# sourceMappingURL=sendTestEmails.js.map