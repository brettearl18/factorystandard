"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onRunUpdateCommentCreated = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const notifyStaff_1 = require("./notifyStaff");
const opts = { memory: "256MB", timeoutSeconds: 30 };
/**
 * When a comment is added on a run update, notify all staff so they don't miss it.
 */
exports.onRunUpdateCommentCreated = functions
    .runWith(opts)
    .firestore.document("runs/{runId}/updates/{updateId}/comments/{commentId}")
    .onCreate(async (snap, context) => {
    const { runId, updateId } = context.params;
    const comment = snap.data();
    const authorName = comment.authorName || "Someone";
    const message = comment.message || "";
    const preview = message.length > 80 ? message.slice(0, 80) + "…" : message;
    const db = admin.firestore();
    const runSnap = await db.collection("runs").doc(runId).get();
    const runName = runSnap.exists ? (runSnap.data()?.name || "Run") : "Run";
    const updateSnap = await db.collection("runs").doc(runId).collection("updates").doc(updateId).get();
    const updateTitle = updateSnap.exists ? (updateSnap.data()?.title || "Update") : "Update";
    await (0, notifyStaff_1.notifyAllStaff)({
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
//# sourceMappingURL=onRunUpdateCommentCreated.js.map