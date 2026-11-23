import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { sendEmail, getMailgunConfig } from "./mailgun";
import { runUpdateHtml } from "./emailTemplates";
import { notifyAllStaff, notifyUser } from "./notifyStaff";

const opts = { memory: "256MB" as const, timeoutSeconds: 60 };

/**
 * Triggered when a run update document is created. Handles notifications and,
 * when visible to clients, emails all clients who have guitars in the run.
 */
export const onRunUpdateCreated = functions
  .runWith(opts)
  .firestore.document("runs/{runId}/updates/{updateId}")
  .onCreate(async (snap, context) => {
    const data = snap.data();
    const runId = context.params.runId;
    const title = (data.title as string) || "Run update";
    const message = (data.message as string) || "";
    const authorName = (data.authorName as string) || "The team";

    const runSnap = await admin.firestore().collection("runs").doc(runId).get();
    const runName = runSnap.exists ? (runSnap.data()?.name as string) || "the run" : "the run";

    const guitarsSnap = await admin
      .firestore()
      .collection("guitars")
      .where("runId", "==", runId)
      .get();

    const clientUids = new Set<string>();
    guitarsSnap.docs.forEach((d) => {
      const uid = d.data().clientUid;
      if (uid) clientUids.add(uid);
    });

    const notificationPayload = {
      type: "run_update",
      title,
      message,
      runId,
      metadata: { runName, authorName },
    };

    const notificationTasks: Promise<void>[] = [
      notifyAllStaff({
        ...notificationPayload,
        title: `Run Update: ${title}`,
        message: `${authorName} posted an update to ${runName}`,
      }),
    ];

    if (data.visibleToClients) {
      for (const uid of clientUids) {
        notificationTasks.push(notifyUser(uid, notificationPayload));
      }
    }
    await Promise.all(notificationTasks);

    if (!data.visibleToClients) return null;

    const cfg = getMailgunConfig();
    if (!cfg) return null;

    const emails: string[] = [];
    for (const uid of clientUids) {
      try {
        const user = await admin.auth().getUser(uid);
        if (user.email) emails.push(user.email);
      } catch {
        const clientSnap = await admin.firestore().collection("clients").doc(uid).get();
        const profile = clientSnap.data();
        if (profile?.email) emails.push(profile.email);
      }
    }

    const subject = `${runName}: ${title}`;
    const html = runUpdateHtml(
      { brandName: cfg.fromName, portalUrl: cfg.portalUrl, logoUrl: cfg.logoUrl },
      runName,
      title,
      authorName,
      message
    );
    const text = `${runName}: ${title}\n\n${authorName}:\n${message}\n\nLog in to the portal for full details.`;

    await Promise.all(emails.map((to) => sendEmail(to, subject, html, text)));

    return null;
  });
