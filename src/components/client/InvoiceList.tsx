"use client";

import { useState } from "react";
import type { InvoiceRecord, InvoicePayment, GuitarBuild } from "@/types/guitars";
import {
  updateInvoiceRecord,
  deleteInvoiceRecord,
  updateInvoicePayment,
  deleteInvoicePayment,
  type InvoiceRecordUpdate,
} from "@/lib/firestore";
import { Pencil, Trash2, Guitar } from "lucide-react";

interface InvoiceListProps {
  invoices: InvoiceRecord[];
  onUploadInvoice?: () => void;
  onRecordPayment?: (invoice: InvoiceRecord) => void;
  canManage?: boolean;
  /** When true, show Edit/Delete on invoices and payments. Requires clientUid. */
  canEditDelete?: boolean;
  /** Client UID whose invoices these are (required for edit/delete). */
  clientUid?: string;
  /** Total order amount (client profile) – used on account/settings when no single guitar price. */
  totalOrderAmount?: number;
  /** Currency for order total and overall balance summary. */
  totalOrderCurrency?: string;
  /** This guitar's price – preferred on the guitar detail page for the summary cards. */
  guitarPrice?: number;
  guitarCurrency?: string;
  /** Client's guitars – for allocating an invoice to a specific guitar when editing/creating. */
  clientGuitars?: GuitarBuild[];
}

function formatCurrency(amount: number, currency: string = "AUD") {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString("en-AU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function getGuitarLabel(guitarId: string | undefined, clientGuitars: GuitarBuild[]): string {
  if (!guitarId) return "All guitars";
  const g = clientGuitars.find((x) => x.id === guitarId);
  if (!g) return "One guitar";
  return [g.model, g.finish].filter(Boolean).join(" — ") || g.id;
}

export function InvoiceList({
  invoices,
  onUploadInvoice,
  onRecordPayment,
  canManage = false,
  canEditDelete = false,
  clientUid,
  totalOrderAmount,
  totalOrderCurrency = "AUD",
  guitarPrice,
  guitarCurrency,
  clientGuitars = [],
}: InvoiceListProps) {
  const [editingInvoice, setEditingInvoice] = useState<InvoiceRecord | null>(null);

  const totalPaymentsReceived = invoices.reduce((sum, inv) => {
    const payments = inv.payments || [];
    const approved = payments.filter(
      (p) =>
        p.approvalStatus !== "rejected" &&
        (p.approvalStatus === "approved" || p.approvalStatus === undefined)
    );
    return sum + approved.reduce((s, p) => s + (p.amount || 0), 0);
  }, 0);

  const currency = guitarCurrency || totalOrderCurrency || "AUD";
  const totalDue =
    guitarPrice != null && guitarPrice > 0
      ? guitarPrice
      : totalOrderAmount != null && totalOrderAmount > 0
        ? totalOrderAmount
        : null;
  const isGuitarSummary = guitarPrice != null && guitarPrice > 0;
  const balanceRemaining =
    totalDue != null ? Math.max(totalDue - totalPaymentsReceived, 0) : null;
  const showSummary = totalDue != null || totalPaymentsReceived > 0;
  const [editingPayment, setEditingPayment] = useState<{ invoice: InvoiceRecord; payment: InvoicePayment } | null>(null);
  const [deletingInvoiceId, setDeletingInvoiceId] = useState<string | null>(null);
  const [deletingPayment, setDeletingPayment] = useState<{ invoiceId: string; paymentId: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canEdit = canEditDelete && clientUid;

  const handleUpdateInvoice = async (updates: InvoiceRecordUpdate) => {
    if (!clientUid || !editingInvoice) return;
    setSaving(true);
    setError(null);
    try {
      await updateInvoiceRecord(clientUid, editingInvoice.id, updates);
      setEditingInvoice(null);
    } catch (e: any) {
      setError(e?.message || "Failed to update invoice");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteInvoice = async () => {
    if (!clientUid || !deletingInvoiceId) return;
    setSaving(true);
    setError(null);
    try {
      await deleteInvoiceRecord(clientUid, deletingInvoiceId);
      setDeletingInvoiceId(null);
    } catch (e: any) {
      setError(e?.message || "Failed to delete invoice");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePayment = async (updates: Partial<Pick<InvoicePayment, "amount" | "currency" | "method" | "note" | "paidAt">>) => {
    if (!clientUid || !editingPayment) return;
    setSaving(true);
    setError(null);
    try {
      await updateInvoicePayment(clientUid, editingPayment.invoice.id, editingPayment.payment.id, updates);
      setEditingPayment(null);
    } catch (e: any) {
      setError(e?.message || "Failed to update payment");
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePayment = async () => {
    if (!clientUid || !deletingPayment) return;
    setSaving(true);
    setError(null);
    try {
      await deleteInvoicePayment(clientUid, deletingPayment.invoiceId, deletingPayment.paymentId);
      setDeletingPayment(null);
    } catch (e: any) {
      setError(e?.message || "Failed to delete payment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-5 min-w-0 overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Invoices & payments</h2>
          <p className="text-xs text-gray-500 mt-0.5 max-w-xl">
            View invoices and payment history. Approved payments and balance remaining are shown below.
          </p>
        </div>
        {canManage && onUploadInvoice && (
          <button
            onClick={onUploadInvoice}
            className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
          >
            Upload invoice
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {showSummary && (
        <div className="mb-4 min-w-0">
          <p className="text-xs font-medium text-gray-500 mb-2">Your build — payment summary</p>
          <div className="grid grid-cols-1 gap-2">
            <div className="min-w-0 bg-gray-50 rounded-lg border border-gray-200 px-3 py-2.5">
              <p className="text-xs font-medium text-gray-600">
                {isGuitarSummary ? "Total amount" : "Total order"}
              </p>
              <p className="mt-0.5 text-base font-bold text-gray-900 tabular-nums leading-tight break-words">
                {totalDue != null ? formatCurrency(totalDue, currency) : "—"}
              </p>
              {totalDue == null && (
                <p className="text-[10px] text-gray-500 mt-0.5">Price not set yet</p>
              )}
            </div>
            <div className="min-w-0 bg-green-50 rounded-lg border border-green-200 px-3 py-2.5">
              <p className="text-xs font-medium text-green-800/80">Payments received</p>
              <p className="mt-0.5 text-base font-bold text-green-800 tabular-nums leading-tight break-words">
                {formatCurrency(totalPaymentsReceived, currency)}
              </p>
            </div>
            <div
              className={`min-w-0 rounded-lg border px-3 py-2.5 ${
                balanceRemaining != null && balanceRemaining > 0
                  ? "bg-amber-50 border-amber-200"
                  : "bg-emerald-50 border-emerald-200"
              }`}
            >
              <p
                className={`text-xs font-medium ${
                  balanceRemaining != null && balanceRemaining > 0
                    ? "text-amber-800/80"
                    : "text-emerald-800/80"
                }`}
              >
                {balanceRemaining != null && balanceRemaining <= 0 && totalDue != null
                  ? "Paid in full"
                  : "Balance remaining"}
              </p>
              <p
                className={`mt-0.5 text-base font-bold tabular-nums leading-tight break-words ${
                  balanceRemaining != null && balanceRemaining > 0
                    ? "text-amber-900"
                    : "text-emerald-900"
                }`}
              >
                {balanceRemaining != null
                  ? formatCurrency(balanceRemaining, currency)
                  : "—"}
              </p>
            </div>
          </div>
        </div>
      )}

      {invoices.length === 0 ? (
        <div className="text-center text-gray-500 py-12 border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
          <p className="font-medium">No invoices yet</p>
          <p className="text-sm mt-1">Invoices and deposits will appear here once added.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Invoices & deposits</p>
          {invoices.map((invoice) => {
            const payments = invoice.payments || [];
            const approvedPayments = payments.filter(p => p.approvalStatus !== "rejected" && (p.approvalStatus === "approved" || p.approvalStatus === undefined));
            const paidAmount = approvedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
            const outstanding = Math.max(invoice.amount - paidAmount, 0);
            const pendingPayments = payments.filter(p => p.approvalStatus === "pending");
            const guitarLabel = clientGuitars.length > 0 ? getGuitarLabel(invoice.guitarId, clientGuitars) : null;
            const hasActions = Boolean(invoice.downloadUrl || invoice.paymentLink || onRecordPayment);

            return (
              <div key={invoice.id} className="border border-gray-200 rounded-lg bg-white overflow-hidden">
                <div className="px-3 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h3 className="text-sm font-semibold text-gray-900 leading-snug">{invoice.title}</h3>
                        <span
                          className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${
                            invoice.status === "paid"
                              ? "bg-green-100 text-green-800"
                              : invoice.status === "overdue"
                              ? "bg-red-100 text-red-800"
                              : invoice.status === "partial"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {invoice.status}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500">
                        {guitarLabel && (
                          <span className="inline-flex items-center gap-1">
                            <Guitar className="w-3 h-3 shrink-0" />
                            {guitarLabel}
                          </span>
                        )}
                        {invoice.description && (
                          <span className="text-gray-600">{invoice.description}</span>
                        )}
                        <span>Due {invoice.dueDate ? formatDate(invoice.dueDate) : "N/A"}</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-1 shrink-0">
                      <p className="text-base font-bold text-gray-900 tabular-nums leading-none pt-0.5">
                        {formatCurrency(invoice.amount, invoice.currency)}
                      </p>
                      {canEdit && (
                        <div className="flex flex-col -mr-1">
                          <button
                            type="button"
                            onClick={() => setEditingInvoice(invoice)}
                            className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors"
                            title="Edit invoice"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingInvoiceId(invoice.id)}
                            className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                            title="Delete invoice"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-600">
                    <span>
                      <span className="text-gray-400">Received</span>{" "}
                      <span className="font-medium tabular-nums">{formatCurrency(paidAmount, invoice.currency)}</span>
                    </span>
                    <span>
                      <span className="text-gray-400">Balance</span>{" "}
                      <span className={`font-medium tabular-nums ${outstanding > 0 ? "text-amber-700" : "text-green-700"}`}>
                        {formatCurrency(outstanding, invoice.currency)}
                      </span>
                    </span>
                    <span>
                      <span className="text-gray-400">Updated</span> {formatDate(invoice.uploadedAt)}
                    </span>
                  </div>
                </div>

                {hasActions && (
                  <div className="px-3 py-2 border-t border-gray-100 flex flex-wrap items-center gap-2">
                    {invoice.downloadUrl && (
                      <a
                        href={invoice.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-blue-600 hover:text-blue-700 underline"
                      >
                        Download
                      </a>
                    )}
                    {invoice.paymentLink && (
                      <a
                        href={invoice.paymentLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded border border-green-200 hover:bg-green-100"
                      >
                        Pay now
                      </a>
                    )}
                    {onRecordPayment && (
                      <button
                        onClick={() => onRecordPayment(invoice)}
                        className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-200 hover:bg-blue-100"
                      >
                        Record payment
                      </button>
                    )}
                  </div>
                )}

                {pendingPayments.length > 0 && (
                  <div className="px-3 py-2 border-t border-amber-100 bg-amber-50/60">
                    <p className="text-[10px] font-semibold text-amber-800 uppercase tracking-wide mb-1">Pending approval</p>
                    <div className="space-y-1">
                      {pendingPayments.map((payment) => (
                        <div
                          key={payment.id}
                          className="flex items-center justify-between gap-2 text-xs text-amber-900"
                        >
                          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                            <span className="tabular-nums truncate">
                              {formatDate(payment.paidAt)} — {payment.method || "Payment"}
                            </span>
                            {payment.receiptUrl && (
                              <a
                                href={payment.receiptUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-700 underline shrink-0"
                              >
                                Receipt
                              </a>
                            )}
                            {canEdit && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setEditingPayment({ invoice, payment })}
                                  className="p-0.5 text-amber-700 hover:text-blue-600"
                                  title="Edit payment"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeletingPayment({ invoiceId: invoice.id, paymentId: payment.id })}
                                  className="p-0.5 text-amber-700 hover:text-red-600"
                                  title="Delete payment"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </>
                            )}
                          </div>
                          <span className="font-semibold tabular-nums shrink-0">
                            {formatCurrency(payment.amount, payment.currency)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {approvedPayments.length > 0 && (
                  <div className="px-3 py-2 border-t border-gray-100">
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Payments</p>
                    <div className="space-y-1">
                      {approvedPayments.map((payment) => (
                        <div
                          key={payment.id}
                          className="flex items-center justify-between gap-2 text-xs text-gray-700"
                        >
                          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                            <span className="tabular-nums truncate">
                              {formatDate(payment.paidAt)} — {payment.method || "Payment"}
                            </span>
                            {payment.receiptUrl && (
                              <a
                                href={payment.receiptUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-700 underline shrink-0"
                              >
                                Receipt
                              </a>
                            )}
                            {canEdit && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setEditingPayment({ invoice, payment })}
                                  className="p-0.5 text-gray-400 hover:text-blue-600"
                                  title="Edit payment"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeletingPayment({ invoiceId: invoice.id, paymentId: payment.id })}
                                  className="p-0.5 text-gray-400 hover:text-red-600"
                                  title="Delete payment"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </>
                            )}
                          </div>
                          <span className="font-semibold tabular-nums shrink-0">
                            {formatCurrency(payment.amount, payment.currency)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Invoice Modal */}
      {editingInvoice && (
        <EditInvoiceModal
          invoice={editingInvoice}
          clientGuitars={clientGuitars}
          onSave={handleUpdateInvoice}
          onClose={() => setEditingInvoice(null)}
          saving={saving}
        />
      )}

      {/* Edit Payment Modal */}
      {editingPayment && (
        <EditPaymentModal
          payment={editingPayment.payment}
          onSave={handleUpdatePayment}
          onClose={() => setEditingPayment(null)}
          saving={saving}
        />
      )}

      {/* Delete Invoice Confirm */}
      {deletingInvoiceId && (
        <ConfirmModal
          title="Delete invoice?"
          message="This will permanently remove this invoice and all its payment records. This cannot be undone."
          onConfirm={handleDeleteInvoice}
          onCancel={() => setDeletingInvoiceId(null)}
          saving={saving}
          confirmLabel="Delete"
          danger
        />
      )}

      {/* Delete Payment Confirm */}
      {deletingPayment && (
        <ConfirmModal
          title="Delete payment?"
          message="This payment will be removed from the invoice. Outstanding amount will be recalculated."
          onConfirm={handleDeletePayment}
          onCancel={() => setDeletingPayment(null)}
          saving={saving}
          confirmLabel="Delete"
          danger
        />
      )}
    </div>
  );
}

function EditInvoiceModal({
  invoice,
  clientGuitars = [],
  onSave,
  onClose,
  saving,
}: {
  invoice: InvoiceRecord;
  clientGuitars?: GuitarBuild[];
  onSave: (u: InvoiceRecordUpdate) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [title, setTitle] = useState(invoice.title);
  const [amount, setAmount] = useState(invoice.amount.toString());
  const [dueDate, setDueDate] = useState(
    invoice.dueDate ? new Date(invoice.dueDate).toISOString().slice(0, 10) : ""
  );
  const [description, setDescription] = useState(invoice.description || "");
  const [currency, setCurrency] = useState(invoice.currency || "AUD");
  const [guitarId, setGuitarId] = useState(invoice.guitarId ?? "");  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (isNaN(num) || num < 0) return;
    onSave({
      title: title.trim() || invoice.title,
      amount: num,
      dueDate: dueDate ? new Date(dueDate).getTime() : undefined,
      description: description.trim() || undefined,
      currency: currency || "AUD",
      guitarId: guitarId.trim() ? guitarId.trim() : null,
    });
  };  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit invoice</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="e.g. Deposit 1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="AUD">AUD</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Due date (optional)</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Optional note"
            />
          </div>
          {clientGuitars.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Allocate to guitar (optional)</label>
              <select
                value={guitarId}
                onChange={(e) => setGuitarId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">All guitars (unallocated)</option>
                {clientGuitars.map((g) => (
                  <option key={g.id} value={g.id}>
                    {[g.model, g.finish].filter(Boolean).join(" — ") || g.id}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Unallocated invoices apply to all guitars. Allocating links this invoice to one guitar only.</p>
            </div>
          )}
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditPaymentModal({
  payment,
  onSave,
  onClose,
  saving,
}: {
  payment: InvoicePayment;
  onSave: (u: Partial<Pick<InvoicePayment, "amount" | "currency" | "method" | "note" | "paidAt">>) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [amount, setAmount] = useState(payment.amount.toString());
  const [currency, setCurrency] = useState(payment.currency || "AUD");
  const [method, setMethod] = useState(payment.method || "");
  const [note, setNote] = useState(payment.note || "");
  const [paidAt, setPaidAt] = useState(
    payment.paidAt ? new Date(payment.paidAt).toISOString().slice(0, 10) : ""
  );  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (isNaN(num) || num < 0) return;
    onSave({
      amount: num,
      currency: currency || "AUD",
      method: method.trim() || "Payment",
      note: note.trim() || undefined,
      paidAt: paidAt ? new Date(paidAt).getTime() : payment.paidAt,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit payment</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="AUD">AUD</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
            <input
              type="text"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="e.g. Bank transfer, Card"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date paid</label>
            <input
              type="date"
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}function ConfirmModal({
  title,
  message,
  onConfirm,
  onCancel,
  saving,
  confirmLabel,
  danger,
}: {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  saving: boolean;
  confirmLabel: string;
  danger?: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-4">{message}</p>
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onCancel} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={saving}
            className={`px-4 py-2 rounded-lg text-white disabled:opacity-50 ${danger ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"}`}
          >
            {saving ? "..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
