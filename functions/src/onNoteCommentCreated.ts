import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { notifyAllStaff, notifyUser } from "./notifyStaff";
import { getMailgunConfig, sendEmail } from "./mailgun";
import { clientActivityStaffNotifyHtml } from "./emailTemplates";

const opts = { memory: "256MB" as const, timeoutSeconds: 60 };

const STAFF_EMAIL = "guitars@ormsbyguitars.com";

/**
 * When a comment is added on a guitar note:
 * - Client comment → in-app notify staff + email guitars@
 * - Staff/admin reply → notify the client (in-app)
 */
export const onNoteCommentCreated = functions
  .runWith(opts)
  .firestore.document("guitars/{guitarId}/notes/{noteId}/comments/{commentId}")
  .onCreate(async (snap, context) => {
    const { guitarId, noteId } = context.params;
    const comment = snap.data();
    const authorName = (comment.authorName as string) || "Someone";
    const authorUid = (comment.authorUid as string) || "";
    const message = (comment.message as string) || "";
    const preview = message.length > 80 ? message.slice(0, 80) + "…" : message;

    const db = admin.firestore();
    const guitarSnap = await db.collection("guitars").doc(guitarId).get();
    if (!guitarSnap.exists) return null;
    const guitar = guitarSnap.data() as {
      model?: string;
      finish?: string;
      runId?: string;
      customerName?: string;
      customerEmail?: string;
      clientUid?: string;
    };
    const runId = guitar.runId as string | undefined;
    let runName = "the run";
    if (runId) {
      const runSnap = await db.collection("runs").doc(runId).get();
      if (runSnap.exists) runName = (runSnap.data()?.name as string) || runName;
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
      await notifyAllStaff(payload);

      const cfg = getMailgunConfig();
      if (cfg) {
        let clientEmail = guitar.customerEmail || "";
        try {
          const user = await admin.auth().getUser(authorUid);
          if (user.email) clientEmail = user.email;
        } catch {
          // keep customerEmail fallback
        }

        const portal = (cfg.portalUrl || "").replace(/\/$/, "");
        const ctaUrl = portal
          ? runId
            ? `${portal}/runs/${runId}/board`
            : `${portal}/guitars/${guitarId}`
          : undefined;

        const subject = `Client comment on ${guitarLabel}`;
        const html = clientActivityStaffNotifyHtml(
          {
            brandName: cfg.fromName,
            portalUrl: cfg.portalUrl,
            logoUrl: cfg.logoUrl,
          },
          "A client left a comment on a build update.",
          guitarLabel,
          guitar.customerName || authorName || null,
          clientEmail || null,
          `${authorName}: ${message}`,
          ctaUrl
        );
        const text = `Client comment on ${guitarLabel}\nFrom: ${authorName}${clientEmail ? ` <${clientEmail}>` : ""}\n\n${message}`;
        await sendEmail(STAFF_EMAIL, subject, html, text, { noCc: true });
        functions.logger.info("Client comment email sent to staff", { guitarId, noteId });
      }
    } else if (clientUid) {
      await notifyUser(clientUid, payload);
    } else {
      await notifyAllStaff(payload);
    }

    return null;
  });
