import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { notifyAllStaff } from "./notifyStaff";
import { getMailgunConfig, sendEmail } from "./mailgun";
import { clientActivityStaffNotifyHtml } from "./emailTemplates";

const opts = { memory: "256MB" as const, timeoutSeconds: 60 };

const STAFF_EMAIL = "guitars@ormsbyguitars.com";

/**
 * When a client uploads gallery images to their guitar, notify staff in-app
 * and email guitars@ormsbyguitars.com.
 */
export const onGuitarGalleryUpload = functions
  .runWith(opts)
  .firestore.document("guitars/{guitarId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const guitarId = context.params.guitarId as string;

    const beforeAt = before.lastGalleryUploadAt as number | undefined;
    const afterAt = after.lastGalleryUploadAt as number | undefined;
    if (!afterAt || afterAt === beforeAt) {
      return null;
    }

    const uploadBy = (after.lastGalleryUploadBy as string) || "";
    const clientUid = (after.clientUid as string) || "";
    if (!clientUid || !uploadBy || uploadBy !== clientUid) {
      // Staff/admin upload — no client-activity email
      return null;
    }

    const beforeImgs = (before.referenceImages as string[] | undefined) || [];
    const afterImgs = (after.referenceImages as string[] | undefined) || [];
    const addedCount =
      typeof after.lastGalleryUploadAdded === "number"
        ? after.lastGalleryUploadAdded
        : Math.max(0, afterImgs.length - beforeImgs.length);

    if (addedCount <= 0) {
      return null;
    }

    const guitarLabel =
      [after.model, after.finish].filter(Boolean).join(" – ") || "Guitar";
    const customerName = (after.customerName as string) || null;
    const runId = after.runId as string | undefined;

    let clientEmail = (after.customerEmail as string) || "";
    try {
      const user = await admin.auth().getUser(clientUid);
      if (user.email) clientEmail = user.email;
      if (!customerName && user.displayName) {
        // keep customerName from guitar; displayName only as fallback in email helper
      }
    } catch {
      // ignore
    }

    const detail = `${customerName || "Client"} uploaded ${addedCount} image${addedCount === 1 ? "" : "s"} to their gallery (${afterImgs.length} total).`;

    await notifyAllStaff({
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

    const cfg = getMailgunConfig();
    if (cfg) {
      const portal = (cfg.portalUrl || "").replace(/\/$/, "");
      const ctaUrl = portal
        ? runId
          ? `${portal}/runs/${runId}/board`
          : `${portal}/guitars/${guitarId}`
        : undefined;

      const subject = `Client gallery upload: ${guitarLabel}`;
      const html = clientActivityStaffNotifyHtml(
        {
          brandName: cfg.fromName,
          portalUrl: cfg.portalUrl,
          logoUrl: cfg.logoUrl,
        },
        "A client uploaded image(s) to their guitar gallery.",
        guitarLabel,
        customerName,
        clientEmail || null,
        detail,
        ctaUrl
      );
      const text = `Client gallery upload on ${guitarLabel}\n${detail}${clientEmail ? `\nClient email: ${clientEmail}` : ""}`;
      await sendEmail(STAFF_EMAIL, subject, html, text, { noCc: true });
      functions.logger.info("Client gallery upload email sent to staff", {
        guitarId,
        addedCount,
      });
    }

    return null;
  });
