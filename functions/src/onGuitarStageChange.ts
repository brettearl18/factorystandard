import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { sendEmail, getMailgunConfig } from "./mailgun";
import { stageChangeHtml } from "./emailTemplates";

const opts = { memory: "256MB" as const, timeoutSeconds: 60 };

/**
 * Triggered when a guitar document is updated. If stageId changed and the guitar
 * has a client, send the client an email via Mailgun (if configured).
 */
export const onGuitarStageChange = functions
  .runWith(opts)
  .firestore.document("guitars/{guitarId}")
  .onUpdate(async (change, context) => {
    const cfg = getMailgunConfig();
    if (!cfg) return null;

    const before = change.before.data();
    const after = change.after.data();

    if (before.stageId === after.stageId) return null;

    const clientUid = after.clientUid as string | undefined;
    if (!clientUid) return null;

    let clientEmail: string | null = null;
    try {
      const user = await admin.auth().getUser(clientUid);
      clientEmail = user.email ?? null;
    } catch {
      const clientSnap = await admin.firestore().collection("clients").doc(clientUid).get();
      const profile = clientSnap.data();
      clientEmail = profile?.email ?? null;
    }
    if (!clientEmail) return null;

    const runId = after.runId as string;
    const runSnap = await admin.firestore().collection("runs").doc(runId).get();
    const runName = runSnap.exists ? (runSnap.data()?.name as string) || "Your run" : "Your run";

    const stagesSnap = await admin.firestore().collection("runs").doc(runId).collection("stages").get();
    type StageData = { id: string; label?: string; clientStatusLabel?: string };
    const stages = stagesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as StageData));
    const newStage = stages.find((s) => s.id === after.stageId);
    // Use label (subcategory e.g. "Body Shaping") so email shows specific stage, not just "In Build"
    const newStageLabel = newStage?.label || newStage?.clientStatusLabel || (after.stageId as string);
    const oldStage = stages.find((s) => s.id === before.stageId);
    const oldStageLabel = oldStage?.label || oldStage?.clientStatusLabel || (before.stageId as string);

    const model = (after.model as string) || "Your guitar";
    const finish = (after.finish as string) || "";
    const guitarLabel = finish ? `${model} – ${finish}` : model;

    const subject = `Update: ${guitarLabel} – ${newStageLabel}`;
    const html = stageChangeHtml(
      { brandName: cfg.fromName, portalUrl: cfg.portalUrl, logoUrl: cfg.logoUrl },
      guitarLabel,
      runName,
      oldStageLabel,
      newStageLabel
    );
    const text = `Your guitar ${guitarLabel} (${runName}) has moved from ${oldStageLabel} to ${newStageLabel}. Log in to the portal for details.`;

    await sendEmail(clientEmail, subject, html, text);
    return null;
  });
