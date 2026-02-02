"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onInvoiceUpdated = void 0;
const functions = require("firebase-functions");
const notifyStaff_1 = require("./notifyStaff");
const opts = { memory: "256MB", timeoutSeconds: 30 };
/**
 * When a client adds a payment (pending approval) to an invoice, notify all staff/accounting
 * so they don't miss the approval request.
 */
exports.onInvoiceUpdated = functions
    .runWith(opts)
    .firestore.document("clients/{clientUid}/invoices/{invoiceId}")
    .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const beforePayments = before.payments || [];
    const afterPayments = after.payments || [];
    // Check if a new payment with approvalStatus "pending" (client-recorded) was added
    const beforeIds = new Set(beforePayments.map((p) => p.id).filter(Boolean));
    const newPending = afterPayments.filter((p) => p.approvalStatus === "pending" && !beforeIds.has(p.id));
    if (newPending.length === 0)
        return null;
    const payment = newPending[0];
    const invoiceTitle = after.title || "Invoice";
    const amount = payment.amount ?? 0;
    const currency = payment.currency ?? "AUD";
    await (0, notifyStaff_1.notifyAllStaff)({
        type: "payment_pending_approval",
        title: "Payment recorded – awaiting approval",
        message: `Client recorded ${currency} ${amount.toLocaleString()} for invoice: ${invoiceTitle}. Please review and approve.`,
        guitarId: after.guitarId,
        metadata: {
            invoiceTitle,
            amount,
            currency,
            clientUid: context.params.clientUid,
            invoiceId: context.params.invoiceId,
        },
    });
    return null;
});
//# sourceMappingURL=onInvoiceUpdated.js.map