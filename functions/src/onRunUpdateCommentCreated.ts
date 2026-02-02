import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { notifyAllStaff } from "./notifyStaff";

const opts = { memory: "256MB" as const, timeoutSeconds: 30 };

/**
 * When a comment is added on a run update, notify all staff so they don't miss it.
 */
export const onRunUpdateCommentCreated = functions
  .runWith(opts)
  .firestore.document("runs/{runId}/updates/{updateId}/comments/{commentId}")
  .onCreate(async (snap, context) => {
    const { runId, updateId } = context.params;
    const comment = snap.data();
    const authorName = (comment.authorName as string) || "Someone";
    const message = (comment.message as string) || "";
    const preview = message.length > 80 ? message.slice(0, 80) + "…" : message;

    const db = admin.firestore();
    const runSnap = await db.collection("runs").doc(runId).get();
    const runName = runSnap.exists ? ((runSnap.data()?.name as string) || "Run") : "Run";
    const updateSnap = await db.collection("runs").doc(runId).collection("updates").doc(updateId).get();
    const updateTitle = updateSnap.exists ? ((updateSnap.data()?.title as string) || "Update") : "Update";

    await notifyAllStaff({
      type: "run_update_comment",
      title: `New comment on run update: ${updateTitle}`,
      message: `${authorName} on ${runName}: ${preview}`,
      runId,
      metadata: {
        runName,
        updateTitle,
        authorName,
      },
    });
    return null;
  });
