"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onGuitarGalleryUpload = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const notifyStaff_1 = require("./notifyStaff");
const mailgun_1 = require("./mailgun");
const emailTemplates_1 = require("./emailTemplates");
const opts = { memory: "256MB", timeoutSeconds: 60 };
const STAFF_EMAIL = "guitars@ormsbyguitars.com";
/**
 * When a client uploads gallery images to their guitar, notify staff in-app
 * and email guitars@ormsbyguitars.com.
 */
exports.onGuitarGalleryUpload = functions
    .runWith(opts)
    .firestore.document("guitars/{guitarId}")
    .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const guitarId = context.params.guitarId;
    const beforeAt = before.lastGalleryUploadAt;
    const afterAt = after.lastGalleryUploadAt;
    if (!afterAt || afterAt === beforeAt) {
        return null;
    }
    const uploadBy = after.lastGalleryUploadBy || "";
    const clientUid = after.clientUid || "";
    if (!clientUid || !uploadBy || uploadBy !== clientUid) {
        // Staff/admin upload — no client-activity email
        return null;
    }
    const beforeImgs = before.referenceImages || [];
    const afterImgs = after.referenceImages || [];
    const addedCount = typeof after.lastGalleryUploadAdded === "number"
        ? after.lastGalleryUploadAdded
        : Math.max(0, afterImgs.length - beforeImgs.length);
    if (addedCount <= 0) {
        return null;
    }
    const guitarLabel = [after.model, after.finish].filter(Boolean).join(" – ") || "Guitar";
    const customerName = after.customerName || null;
    const runId = after.runId;
    let clientEmail = after.customerEmail || "";
    try {
        const user = await admin.auth().getUser(clientUid);
        if (user.email)
            clientEmail = user.email;
        if (!customerName && user.displayName) {
            // keep customerName from guitar; displayName only as fallback in email helper
        }
    }
    catch {
        // ignore
    }
    const detail = `${customerName || "Client"} uploaded ${addedCount} image${addedCount === 1 ? "" : "s"} to their gallery (${afterImgs.length} total).`;
    await (0, notifyStaff_1.notifyAllStaff)({
        type: "guitar_gallery_upload",
        title: `Gallery upload: ${guitarLabel}`,
        message: detail,
        guitarId,
        runId: runId ?? undefined,
        metadata: {
            guitarModel: after.model,
            guitarFinish: after.finish,
            customerName: after.customerName,
            addedCount,
        },
    });
    const cfg = (0, mailgun_1.getMailgunConfig)();
    if (cfg) {
        const portal = (cfg.portalUrl || "").replace(/\/$/, "");
        const ctaUrl = portal
            ? runId
                ? `${portal}/runs/${runId}/board`
                : `${portal}/guitars/${guitarId}`
            : undefined;
        const subject = `Client gallery upload: ${guitarLabel}`;
        const html = (0, emailTemplates_1.clientActivityStaffNotifyHtml)({
            brandName: cfg.fromName,
            portalUrl: cfg.portalUrl,
            logoUrl: cfg.logoUrl,
        }, "A client uploaded image(s) to their guitar gallery.", guitarLabel, customerName, clientEmail || null, detail, ctaUrl);
        const text = `Client gallery upload on ${guitarLabel}\n${detail}${clientEmail ? `\nClient email: ${clientEmail}` : ""}`;
        await (0, mailgun_1.sendEmail)(STAFF_EMAIL, subject, html, text, { noCc: true });
        functions.logger.info("Client gallery upload email sent to staff", {
            guitarId,
            addedCount,
        });
    }
    return null;
});
//# sourceMappingURL=onGuitarGalleryUpload.js.map