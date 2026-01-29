"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onRunUpdateCreated = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const mailgun_1 = require("./mailgun");
const emailTemplates_1 = require("./emailTemplates");
const opts = { memory: "256MB", timeoutSeconds: 60 };
/**
 * Triggered when a run update document is created. If visibleToClients is true,
 * email all clients who have guitars in this run (via Mailgun if configured).
 */
exports.onRunUpdateCreated = functions
    .runWith(opts)
    .firestore.document("runs/{runId}/updates/{updateId}")
    .onCreate(async (snap, context) => {
    const cfg = (0, mailgun_1.getMailgunConfig)();
    if (!cfg)
        return null;
    const data = snap.data();
    const runId = context.params.runId;
    if (!data.visibleToClients)
        return null;
    const title = data.title || "Run update";
    const message = data.message || "";
    const authorName = data.authorName || "The team";
    const runSnap = await admin.firestore().collection("runs").doc(runId).get();
    const runName = runSnap.exists ? runSnap.data()?.name || "the run" : "the run";
    const guitarsSnap = await admin
        .firestore()
        .collection("guitars")
        .where("runId", "==", runId)
        .get();
    const clientUids = new Set();
    guitarsSnap.docs.forEach((d) => {
        const uid = d.data().clientUid;
        if (uid)
            clientUids.add(uid);
    });
    const emails = [];
    for (const uid of clientUids) {
        try {
            const user = await admin.auth().getUser(uid);
            if (user.email)
                emails.push(user.email);
        }
        catch {
            const clientSnap = await admin.firestore().collection("clients").doc(uid).get();
            const profile = clientSnap.data();
            if (profile?.email)
                emails.push(profile.email);
        }
    }
    const subject = `${runName}: ${title}`;
    const html = (0, emailTemplates_1.runUpdateHtml)({ brandName: cfg.fromName, portalUrl: cfg.portalUrl, logoUrl: cfg.logoUrl }, runName, title, authorName, message);
    const text = `${runName}: ${title}\n\n${authorName}:\n${message}\n\nLog in to the portal for full details.`;
    for (const to of emails) {
        await (0, mailgun_1.sendEmail)(to, subject, html, text);
    }
    return null;
});
//# sourceMappingURL=onRunUpdateCreated.js.map