"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onNoteCommentCreated = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const notifyStaff_1 = require("./notifyStaff");
const opts = { memory: "256MB", timeoutSeconds: 30 };
/**
 * When a comment is added on a guitar note, notify all staff so they don't miss it.
 */
exports.onNoteCommentCreated = functions
    .runWith(opts)
    .firestore.document("guitars/{guitarId}/notes/{noteId}/comments/{commentId}")
    .onCreate(async (snap, context) => {
    const { guitarId, noteId } = context.params;
    const comment = snap.data();
    const authorName = comment.authorName || "Someone";
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
    await (0, notifyStaff_1.notifyAllStaff)({
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
//# sourceMappingURL=onNoteCommentCreated.js.map