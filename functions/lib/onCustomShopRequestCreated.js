"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onCustomShopRequestCreated = void 0;
const functions = require("firebase-functions");
const mailgun_1 = require("./mailgun");
const emailTemplates_1 = require("./emailTemplates");
const opts = { memory: "256MB", timeoutSeconds: 60 };
const STAFF_EMAIL = "guitars@ormsbyguitars.com";
/**
 * Triggered when a Custom Shop request document is created.
 * Sends a thank-you email to the client and a notification email to guitars@ormsbyguitars.com.
 */
exports.onCustomShopRequestCreated = functions
    .runWith(opts)
    .firestore.document("customShopRequests/{requestId}")
    .onCreate(async (snap, context) => {
    const cfg = (0, mailgun_1.getMailgunConfig)();
    if (!cfg) {
        functions.logger.info("Mailgun not configured; skipping Custom Shop emails");
        return null;
    }
    const requestId = context.params.requestId;
    const data = snap.data();
    const submitterEmail = data.submitterEmail || "";
    const submitterName = data.submitterName || null;
    const guitarDescription = data.guitarDescription || "";
    const model = data.model || null;
    if (!submitterEmail) {
        functions.logger.warn("Custom Shop request missing submitterEmail", { requestId });
        return null;
    }
    const requestNumber = "CS-" + requestId.slice(-6).toUpperCase();
    const portalUrl = (cfg.portalUrl || "").replace(/\/$/, "");
    const viewRequestUrl = portalUrl ? `${portalUrl}/custom-shop/requests/${requestId}` : "";
    const templateOpts = {
        brandName: cfg.fromName,
        portalUrl: cfg.portalUrl,
        logoUrl: cfg.logoUrl,
    };
    // 1. Thank-you email to the client (no CC so staff only get the dedicated notify email)
    const thankYouSubject = `We've received your Custom Shop request (${requestNumber})`;
    const thankYouHtml = (0, emailTemplates_1.customShopThankYouHtml)(templateOpts, requestNumber, viewRequestUrl);
    const thankYouText = `Thank you for your Custom Shop request. We've received it and will review it shortly. Your request number is ${requestNumber}. View your request: ${viewRequestUrl}. Builds may start 6–18 months from registration; we'll be in touch once we've reviewed your request.`;
    await (0, mailgun_1.sendEmail)(submitterEmail, thankYouSubject, thankYouHtml, thankYouText, { noCc: true });
    // 2. Notification email to staff
    const summary = model
        ? `${model}: ${guitarDescription.slice(0, 200)}${guitarDescription.length > 200 ? "…" : ""}`
        : guitarDescription.slice(0, 300) + (guitarDescription.length > 300 ? "…" : "");
    const staffSubject = `New Custom Shop request: ${requestNumber} from ${submitterName || submitterEmail}`;
    const staffHtml = (0, emailTemplates_1.customShopStaffNotifyHtml)(templateOpts, submitterName, submitterEmail, requestNumber, summary);
    const staffText = `New Custom Shop request ${requestNumber}\nFrom: ${submitterName ? `${submitterName} <${submitterEmail}>` : submitterEmail}\n\nSummary: ${summary}\n\nLog in to the portal to view and manage Custom Shop requests.`;
    await (0, mailgun_1.sendEmail)(STAFF_EMAIL, staffSubject, staffHtml, staffText);
    functions.logger.info("Custom Shop emails sent", { requestId, requestNumber });
    return null;
});
//# sourceMappingURL=onCustomShopRequestCreated.js.map