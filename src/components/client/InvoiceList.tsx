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
  /** Total order amount (guitars) – deposits/payments are calculated against this. */
  totalOrderAmount?: number;
  /** Currency for order total and overall balance summary. */
  totalOrderCurrency?: string;
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
  clientGuitars = [],
}: InvoiceListProps) {
  const [editingInvoice, setEditingInvoice] = useState<InvoiceRecord | null>(null);

  const totalPaymentsReceived = invoices.reduce((sum, inv) => {
    const payments = inv.payments || [];
    const approved = payments.filter(p => p.approvalStatus !== "rejected" && (p.approvalStatus === "approved" || p.approvalStatus === undefined));
    return sum + approved.reduce((s, p) => s + (p.amount || 0), 0);
  }, 0);
  const overallBalance = totalOrderAmount != null ? Math.max((totalOrderAmount - totalPaymentsReceived), 0) : null;
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
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-2">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Invoices & payments</h2>
          <p className="text-sm text-gray-500 mt-1 max-w-xl">
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

      {totalOrderAmount != null && totalOrderAmount > 0 && (
        <div className="mb-8">
          <p className="text-sm font-medium text-gray-500 mb-3">Summary</p>
          <div className="grid grid-cols-1 gap-3">
            <div className="bg-emerald-50 rounded-xl border border-emerald-200 px-5 py-4">
              <p className="text-sm font-medium text-emerald-800/80">Total order (guitars)</p>
              <p className="mt-1 text-2xl font-bold text-emerald-900 tabular-nums">{formatCurrency(totalOrderAmount, totalOrderCurrency)}</p>
            </div>
            <div className="bg-blue-50 rounded-xl border border-blue-200 px-5 py-4">
              <p className="text-sm font-medium text-blue-800/80">Payments received & approved</p>
              <p className="mt-1 text-2xl font-bold text-blue-900 tabular-nums">{formatCurrency(totalPaymentsReceived, totalOrderCurrency)}</p>
            </div>
            <div className="bg-amber-50 rounded-xl border border-amber-200 px-5 py-4">
              <p className="text-sm font-medium text-amber-800/80">Balance remaining</p>
              <p className="mt-1 text-2xl font-bold text-amber-900 tabular-nums">{formatCurrency(overallBalance ?? 0, totalOrderCurrency)}</p>
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
        <div className="space-y-6">
          <p className="text-sm font-medium text-gray-500">Invoices & deposits</p>
          {invoices.map((invoice) => {
            const payments = invoice.payments || [];
            const approvedPayments = payments.filter(p => p.approvalStatus !== "rejected" && (p.approvalStatus === "approved" || p.approvalStatus === undefined));
            const paidAmount = approvedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
            const outstanding = Math.max(invoice.amount - paidAmount, 0);
            const pendingPayments = payments.filter(p => p.approvalStatus === "pending");
            const guitarLabel = clientGuitars.length > 0 ? getGuitarLabel(invoice.guitarId, clientGuitars) : null;

            return (
              <div key={invoice.id} className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
                {/* Header row: title, guitar, amount, status, actions */}
                <div className="flex flex-wrap items-start justify-between gap-4 px-5 py-4 bg-gray-50/80 border-b border-gray-100">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-gray-900">{invoice.title}</h3>
                      {guitarLabel && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-200/90 text-gray-700">
                          <Guitar className="w-3.5 h-3.5" />
                          {guitarLabel}
                        </span>
                      )}
                    </div>
                    {invoice.description && (
                      <p className="text-sm text-gray-500 mt-1">{invoice.description}</p>
                    )}
                    <p className="text-sm text-gray-500 mt-1">
                      Due {invoice.dueDate ? formatDate(invoice.dueDate) : "N/A"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Amount</p>
                      <p className="text-xl font-bold text-gray-900 tabular-nums">{formatCurrency(invoice.amount, invoice.currency)}</p>
                      <span
                        className={`inline-flex mt-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold ${
                          invoice.status === "paid"
                            ? "bg-green-100 text-green-800"
                            : invoice.status === "overdue"
                            ? "bg-red-100 text-red-800"
                            : invoice.status === "partial"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {invoice.status.replace(/^\w/, (c) => c.toUpperCase())}
                      </span>
                    </div>
                    {canEdit && (
                      <div className="flex flex-col gap-0.5">
                        <button
                          type="button"
                          onClick={() => setEditingInvoice(invoice)}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit invoice"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingInvoiceId(invoice.id)}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete invoice"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Summary row for this invoice */}
                <div className="px-5 py-4 grid grid-cols-1 gap-3">
                  <div className="rounded-lg bg-gray-50 border border-gray-100 px-4 py-3">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Payments received & approved</p>
                    <p className="mt-1 text-lg font-semibold text-gray-900 tabular-nums">{formatCurrency(paidAmount, invoice.currency)}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 border border-gray-100 px-4 py-3">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Balance remaining</p>
                    <p className="mt-1 text-lg font-semibold text-gray-900 tabular-nums">{formatCurrency(outstanding, invoice.currency)}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 border border-gray-100 px-4 py-3">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Last updated</p>
                    <p className="mt-1 text-base font-medium text-gray-700">{formatDate(invoice.uploadedAt)}</p>
                  </div>
                </div>

                <div className="px-5 py-4 border-t border-gray-100 flex flex-wrap items-center gap-3">
                  {invoice.downloadUrl && (
                    <a
                      href={invoice.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-blue-600 hover:text-blue-700 underline"
                    >
                      📄 Download invoice
                    </a>
                  )}
                  {invoice.paymentLink && (
                    <a
                      href={invoice.paymentLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-green-700 bg-green-50 px-3 py-2 rounded-lg border border-green-200 hover:bg-green-100"
                    >
                      💳 Pay now
                    </a>
                  )}
                  {onRecordPayment && (
                    <button
                      onClick={() => onRecordPayment(invoice)}
                      className="text-sm font-medium text-blue-700 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200 hover:bg-blue-100"
                    >
                      Record payment
                    </button>
                  )}
                </div>

                {pendingPayments.length > 0 && (
                  <div className="mx-5 mb-4 bg-amber-50 rounded-lg border border-amber-200 px-4 py-3">
                    <p className="text-sm font-semibold text-amber-900 mb-2">Pending approval</p>
                    <div className="space-y-2">
                      {pendingPayments.map((payment) => (
                        <div
                          key={payment.id}
                          className="flex items-center justify-between text-sm text-amber-800"
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <span>
                              {formatDate(payment.paidAt)} — {payment.method || "Payment"} (awaiting approval)
                            </span>
                            {payment.receiptUrl && (
                              <a
                                href={payment.receiptUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-700 underline text-xs"
                              >
                                View Receipt
                              </a>
                            )}
                            {canEdit && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setEditingPayment({ invoice, payment })}
                                  className="p-1 text-amber-700 hover:text-blue-600"
                                  title="Edit payment"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeletingPayment({ invoiceId: invoice.id, paymentId: payment.id })}
                                  className="p-1 text-amber-700 hover:text-red-600"
                                  title="Delete payment"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                          <span className="font-semibold">
                            {formatCurrency(payment.amount, payment.currency)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {approvedPayments.length > 0 && (
                  <div className="mx-5 mb-5 rounded-lg border border-gray-200 bg-gray-50/50 px-4 py-3">
                    <p className="text-sm font-semibold text-gray-700 mb-3">Approved payments</p>
                    <div className="space-y-2">
                      {approvedPayments.map((payment) => (
                        <div
                          key={payment.id}
                          className="flex items-center justify-between text-sm text-gray-700"
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="tabular-nums">
                              {formatDate(payment.paidAt)} — {payment.method || "Payment"}
                            </span>
                            {payment.receiptUrl && (
                              <a
                                href={payment.receiptUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-700 underline text-xs"
                              >
                                View Receipt
                              </a>
                            )}
                            {canEdit && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setEditingPayment({ invoice, payment })}
                                  className="p-1 text-gray-500 hover:text-blue-600"
                                  title="Edit payment"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeletingPayment({ invoiceId: invoice.id, paymentId: payment.id })}
                                  className="p-1 text-gray-500 hover:text-red-600"
                                  title="Delete payment"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                          <span className="font-semibold">
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
  const [guitarId, setGuitarId] = useState(invoice.guitarId ?? "");

  const handleSubmit = (e: React.FormEvent) => {
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
  };

  return (
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
  );

  const handleSubmit = (e: React.FormEvent) => {
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