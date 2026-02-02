import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { notifyAllStaff } from "./notifyStaff";

const opts = { memory: "256MB" as const, timeoutSeconds: 30 };

/**
 * When a comment is added on a guitar note, notify all staff so they don't miss it.
 */
export const onNoteCommentCreated = functions
  .runWith(opts)
  .firestore.document("guitars/{guitarId}/notes/{noteId}/comments/{commentId}")
  .onCreate(async (snap, context) => {
    const { guitarId, noteId } = context.params;
    const comment = snap.data();
    const authorName = (comment.authorName as string) || "Someone";
    const message = (comment.message as string) || "";
    const preview = message.length > 80 ? message.slice(0, 80) + "…" : message;

    const db = admin.firestore();
    const guitarSnap = await db.collection("guitars").doc(guitarId).get();
    if (!guitarSnap.exists) return null;
    const guitar = guitarSnap.data() as { model?: string; finish?: string; runId?: string; customerName?: string };
    const runId = guitar.runId as string | undefined;
    let runName = "the run";
    if (runId) {
      const runSnap = await db.collection("runs").doc(runId).get();
      if (runSnap.exists) runName = (runSnap.data()?.name as string) || runName;
    }

    const guitarLabel = [guitar.model, guitar.finish].filter(Boolean).join(" – ") || "Guitar";

    await notifyAllStaff({
      type: "guitar_note_comment",
      title: `New comment on ${guitarLabel}`,
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
      },
    });
    return null;
  });
