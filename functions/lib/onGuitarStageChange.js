"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onGuitarStageChange = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const mailgun_1 = require("./mailgun");
const emailTemplates_1 = require("./emailTemplates");
const opts = { memory: "256MB", timeoutSeconds: 60 };
/**
 * Triggered when a guitar document is updated. If stageId changed and the guitar
 * has a client, send the client an email via Mailgun (if configured).
 */
exports.onGuitarStageChange = functions
    .runWith(opts)
    .firestore.document("guitars/{guitarId}")
    .onUpdate(async (change, context) => {
    const cfg = (0, mailgun_1.getMailgunConfig)();
    if (!cfg)
        return null;
    const before = change.before.data();
    const after = change.after.data();
    if (before.stageId === after.stageId)
        return null;
    const clientUid = after.clientUid;
    if (!clientUid)
        return null;
    let clientEmail = null;
    try {
        const user = await admin.auth().getUser(clientUid);
        clientEmail = user.email ?? null;
    }
    catch {
        const clientSnap = await admin.firestore().collection("clients").doc(clientUid).get();
        const profile = clientSnap.data();
        clientEmail = profile?.email ?? null;
    }
    if (!clientEmail)
        return null;
    const runId = after.runId;
    const runSnap = await admin.firestore().collection("runs").doc(runId).get();
    const runName = runSnap.exists ? runSnap.data()?.name || "Your run" : "Your run";
    const stagesSnap = await admin.firestore().collection("runs").doc(runId).collection("stages").get();
    const stages = stagesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const newStage = stages.find((s) => s.id === after.stageId);
    // Use label (subcategory e.g. "Body Shaping") so email shows specific stage, not just "In Build"
    const newStageLabel = newStage?.label || newStage?.clientStatusLabel || after.stageId;
    const oldStage = stages.find((s) => s.id === before.stageId);
    const oldStageLabel = oldStage?.label || oldStage?.clientStatusLabel || before.stageId;
    const model = after.model || "Your guitar";
    const finish = after.finish || "";
    const guitarLabel = finish ? `${model} – ${finish}` : model;
    const subject = `Update: ${guitarLabel} – ${newStageLabel}`;
    const html = (0, emailTemplates_1.stageChangeHtml)({ brandName: cfg.fromName, portalUrl: cfg.portalUrl, logoUrl: cfg.logoUrl }, guitarLabel, runName, oldStageLabel, newStageLabel);
    const text = `Your guitar ${guitarLabel} (${runName}) has moved from ${oldStageLabel} to ${newStageLabel}. Log in to the portal for details.`;
    await (0, mailgun_1.sendEmail)(clientEmail, subject, html, text);
    return null;
});
//# sourceMappingURL=onGuitarStageChange.js.map