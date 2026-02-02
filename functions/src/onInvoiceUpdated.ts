import * as functions from "firebase-functions";
import { notifyAllStaff } from "./notifyStaff";

const opts = { memory: "256MB" as const, timeoutSeconds: 30 };

/**
 * When a client adds a payment (pending approval) to an invoice, notify all staff/accounting
 * so they don't miss the approval request.
 */
export const onInvoiceUpdated = functions
  .runWith(opts)
  .firestore.document("clients/{clientUid}/invoices/{invoiceId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const beforePayments = (before.payments as Array<{ id?: string; approvalStatus?: string }>) || [];
    const afterPayments = (after.payments as Array<{ id?: string; approvalStatus?: string; amount?: number; currency?: string }>) || [];

    // Check if a new payment with approvalStatus "pending" (client-recorded) was added
    const beforeIds = new Set(beforePayments.map((p) => p.id).filter(Boolean));
    const newPending = afterPayments.filter(
      (p) => p.approvalStatus === "pending" && !beforeIds.has(p.id)
    );
    if (newPending.length === 0) return null;

    const payment = newPending[0];
    const invoiceTitle = (after.title as string) || "Invoice";
    const amount = payment.amount ?? 0;
    const currency = payment.currency ?? "AUD";

    await notifyAllStaff({
      type: "payment_pending_approval",
      title: "Payment recorded – awaiting approval",
      message: `Client recorded ${currency} ${amount.toLocaleString()} for invoice: ${invoiceTitle}. Please review and approve.`,
      guitarId: after.guitarId as string | undefined,
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
