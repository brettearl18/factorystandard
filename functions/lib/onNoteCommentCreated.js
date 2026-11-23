"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onNoteCommentCreated = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const notifyStaff_1 = require("./notifyStaff");
const mailgun_1 = require("./mailgun");
const emailTemplates_1 = require("./emailTemplates");
const opts = { memory: "256MB", timeoutSeconds: 60 };
const STAFF_EMAIL = "guitars@ormsbyguitars.com";
/**
 * When a comment is added on a guitar note:
 * - Client comment → in-app notify staff + email guitars@
 * - Staff/admin reply → notify the client (in-app)
 */
exports.onNoteCommentCreated = functions
    .runWith(opts)
    .firestore.document("guitars/{guitarId}/notes/{noteId}/comments/{commentId}")
    .onCreate(async (snap, context) => {
    const { guitarId, noteId } = context.params;
    const comment = snap.data();
    const authorName = comment.authorName || "Someone";
    const authorUid = comment.authorUid || "";
    const message = comment.message || "";
    const preview = message.length > 80 ? message.slice(0, 80) + "…" : message;
    const db = admin.firestore();
    const guitarSnap = await db.collection("guitars").doc(guitarId).get();
    if (!guitarSnap.exists)
        return null;
    const guitar = guitarSnap.data();
    const runId = guitar.runId;
    let runName = "the run";
    if (runId) {
        const runSnap = await db.collection("runs").doc(runId).get();
        if (runSnap.exists)
            runName = runSnap.data()?.name || runName;
    }
    const guitarLabel = [guitar.model, guitar.finish].filter(Boolean).join(" – ") || "Guitar";
    const clientUid = guitar.clientUid;
    const isClientAuthor = Boolean(clientUid && authorUid && authorUid === clientUid);
    const payload = {
        type: "guitar_note_comment",
        title: isClientAuthor
            ? `New comment on ${guitarLabel}`
            : `Reply on your ${guitarLabel}`,
        message: `${authorName}: ${preview}`,
        guitarId,
        runId: runId ?? undefined,
        noteId,
        metadata: {
            guitarModel: guitar.model,
            guitarFinish: guitar.finish,
            customerName: guitar.customerName,
            runName,
            authorName,
            fromStaff: !isClientAuthor,
        },
    };
    if (isClientAuthor) {
        await (0, notifyStaff_1.notifyAllStaff)(payload);
        const cfg = (0, mailgun_1.getMailgunConfig)();
        if (cfg) {
            let clientEmail = guitar.customerEmail || "";
            try {
                const user = await admin.auth().getUser(authorUid);
                if (user.email)
                    clientEmail = user.email;
            }
            catch {
                // keep customerEmail fallback
            }
            const portal = (cfg.portalUrl || "").replace(/\/$/, "");
            const ctaUrl = portal
                ? runId
                    ? `${portal}/runs/${runId}/board`
                    : `${portal}/guitars/${guitarId}`
                : undefined;
            const subject = `Client comment on ${guitarLabel}`;
            const html = (0, emailTemplates_1.clientActivityStaffNotifyHtml)({
                brandName: cfg.fromName,
                portalUrl: cfg.portalUrl,
                logoUrl: cfg.logoUrl,
            }, "A client left a comment on a build update.", guitarLabel, guitar.customerName || authorName || null, clientEmail || null, `${authorName}: ${message}`, ctaUrl);
            const text = `Client comment on ${guitarLabel}\nFrom: ${authorName}${clientEmail ? ` <${clientEmail}>` : ""}\n\n${message}`;
            await (0, mailgun_1.sendEmail)(STAFF_EMAIL, subject, html, text, { noCc: true });
            functions.logger.info("Client comment email sent to staff", { guitarId, noteId });
        }
    }
    else if (clientUid) {
        await (0, notifyStaff_1.notifyUser)(clientUid, payload);
    }
    else {
        await (0, notifyStaff_1.notifyAllStaff)(payload);
    }
    return null;
});
//# sourceMappingURL=onNoteCommentCreated.js.map