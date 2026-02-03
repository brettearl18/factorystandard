"use client";

import { useState } from "react";
import type { InvoiceRecord, InvoicePayment } from "@/types/guitars";
import {
  updateInvoiceRecord,
  deleteInvoiceRecord,
  updateInvoicePayment,
  deleteInvoicePayment,
} from "@/lib/firestore";
import { Pencil, Trash2 } from "lucide-react";

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
}

function formatCurrency(amount: number, currency: string = "AUD") {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
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

  const handleUpdateInvoice = async (updates: Partial<Pick<InvoiceRecord, "title" | "amount" | "dueDate" | "description" | "currency">>) => {
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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Invoices & Payments</h2>
          <p className="text-sm text-gray-500">
            View your invoices and payment history. Payments received and approved are listed below; balance remaining shows what is still due.
          </p>
        </div>
        {canManage && onUploadInvoice && (
          <button
            onClick={onUploadInvoice}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Upload Invoice
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {totalOrderAmount != null && totalOrderAmount > 0 && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="bg-emerald-50 rounded-lg border border-emerald-200 p-4">
            <p className="text-gray-600 font-medium">Total order amount (guitars)</p>
            <p className="text-xl font-bold text-emerald-800">{formatCurrency(totalOrderAmount, totalOrderCurrency)}</p>
          </div>
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
            <p className="text-gray-600 font-medium">Payments received & approved</p>
            <p className="text-xl font-bold text-blue-800">{formatCurrency(totalPaymentsReceived, totalOrderCurrency)}</p>
          </div>
          <div className="bg-amber-50 rounded-lg border border-amber-200 p-4">
            <p className="text-gray-600 font-medium">Overall balance remaining</p>
            <p className="text-xl font-bold text-amber-800">{formatCurrency(overallBalance ?? 0, totalOrderCurrency)}</p>
          </div>
        </div>
      )}

      {invoices.length === 0 ? (
        <div className="text-center text-gray-500 py-10 border border-dashed rounded-lg">
          No invoices yet.
        </div>
      ) : (
        <div className="space-y-4">
          {invoices.map((invoice) => {
            const payments = invoice.payments || [];
            const approvedPayments = payments.filter(p => p.approvalStatus !== "rejected" && (p.approvalStatus === "approved" || p.approvalStatus === undefined));
            const paidAmount = approvedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
            const outstanding = Math.max(invoice.amount - paidAmount, 0);
            const pendingPayments = payments.filter(p => p.approvalStatus === "pending");

            return (
              <div key={invoice.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{invoice.title}</h3>
                    {invoice.description && (
                      <p className="text-sm text-gray-500">{invoice.description}</p>
                    )}
                    <p className="text-sm text-gray-600 mt-1">
                      Due {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "N/A"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right space-y-1">
                      <p className="text-sm text-gray-500">Amount</p>
                      <p className="text-lg font-bold">{formatCurrency(invoice.amount, invoice.currency)}</p>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${
                          invoice.status === "paid"
                            ? "bg-green-100 text-green-700"
                            : invoice.status === "overdue"
                            ? "bg-red-100 text-red-700"
                            : invoice.status === "partial"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {invoice.status.replace(/^\w/, (c) => c.toUpperCase())}
                      </span>
                    </div>
                    {canEdit && (
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingInvoice(invoice)}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md"
                          title="Edit invoice"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingInvoiceId(invoice.id)}
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md"
                          title="Delete invoice"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div className="bg-white rounded border border-gray-200 p-3">
                    <p className="text-gray-500">Payments received & approved</p>
                    <p className="font-semibold">{formatCurrency(paidAmount, invoice.currency)}</p>
                  </div>
                  <div className="bg-white rounded border border-gray-200 p-3">
                    <p className="text-gray-500">Balance remaining</p>
                    <p className="font-semibold">{formatCurrency(outstanding, invoice.currency)}</p>
                  </div>
                  <div className="bg-white rounded border border-gray-200 p-3">
                    <p className="text-gray-500">Last updated</p>
                    <p className="font-semibold">
                      {new Date(invoice.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  {invoice.downloadUrl && (
                    <a
                      href={invoice.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-blue-600 hover:text-blue-700 underline"
                    >
                      📄 Download Invoice
                    </a>
                  )}
                  {invoice.paymentLink && (
                    <a
                      href={invoice.paymentLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-green-600 hover:text-green-700 bg-green-50 px-3 py-1.5 rounded-md border border-green-200 hover:bg-green-100"
                    >
                      💳 Pay Now
                    </a>
                  )}
                  {onRecordPayment && (
                    <button
                      onClick={() => onRecordPayment(invoice)}
                      className="text-sm font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-md border border-blue-200 hover:bg-blue-100"
                    >
                      Record Payment
                    </button>
                  )}
                </div>

                {pendingPayments.length > 0 && (
                  <div className="mt-4 bg-yellow-50 rounded border border-yellow-200 p-3">
                    <p className="text-sm font-semibold mb-2 text-yellow-800">Pending Approval</p>
                    <div className="space-y-2">
                      {pendingPayments.map((payment) => (
                        <div
                          key={payment.id}
                          className="flex items-center justify-between text-sm text-yellow-700"
                        >
                          <div className="flex items-center gap-2">
                            <span>
                              {new Date(payment.paidAt).toLocaleDateString()} —{" "}
                              {payment.method || "Payment"} (Awaiting approval)
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
                                  className="p-1 text-yellow-700 hover:text-blue-600"
                                  title="Edit payment"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeletingPayment({ invoiceId: invoice.id, paymentId: payment.id })}
                                  className="p-1 text-yellow-700 hover:text-red-600"
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
                  <div className="mt-4 bg-white rounded border border-gray-200 p-3">
                    <p className="text-sm font-semibold mb-2">Approved Payments</p>
                    <div className="space-y-2">
                      {approvedPayments.map((payment) => (
                        <div
                          key={payment.id}
                          className="flex items-center justify-between text-sm text-gray-600"
                        >
                          <div className="flex items-center gap-2">
                            <span>
                              {new Date(payment.paidAt).toLocaleDateString()} —{" "}
                              {payment.method || "Payment"}
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
  onSave,
  onClose,
  saving,
}: {
  invoice: InvoiceRecord;
  onSave: (u: Partial<Pick<InvoiceRecord, "title" | "amount" | "dueDate" | "description" | "currency">>) => void;
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
}

function ConfirmModal({
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
