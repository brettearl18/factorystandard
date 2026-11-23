"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createInvoiceRecord, recordInvoicePayment } from "@/lib/firestore";
import type { GuitarBuild, InvoiceRecord } from "@/types/guitars";
import { DollarSign, X } from "lucide-react";

const PAYMENT_METHODS = [
  "Cash",
  "In-store",
  "Bank transfer",
  "Credit card",
  "PayPal",
  "Shopify",
  "Xero Invoice",
  "Other",
] as const;

function todayInputValue(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

interface GuitarRecordPaymentModalProps {
  guitar: GuitarBuild;
  invoices: InvoiceRecord[];
  /** Pre-select an invoice when opened from an invoice row */
  initialInvoiceId?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function GuitarRecordPaymentModal({
  guitar,
  invoices,
  initialInvoiceId = null,
  isOpen,
  onClose,
  onSuccess,
}: GuitarRecordPaymentModalProps) {
  const { currentUser } = useAuth();
  const currency = guitar.currency || "AUD";

  const [invoiceTarget, setInvoiceTarget] = useState<"existing" | "new">("new");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<string>("Cash");
  const [paidAt, setPaidAt] = useState(todayInputValue());
  const [receiptNumber, setReceiptNumber] = useState("");
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setPaidAt(todayInputValue());
    setMethod("Cash");
    setReceiptNumber("");
    setNote("");
    setAmount("");

    if (initialInvoiceId && invoices.some((i) => i.id === initialInvoiceId)) {
      setInvoiceTarget("existing");
      setSelectedInvoiceId(initialInvoiceId);
    } else if (invoices.length > 0) {
      setInvoiceTarget("existing");
      setSelectedInvoiceId(invoices[0].id);
    } else {
      setInvoiceTarget("new");
      setSelectedInvoiceId("");
    }
  }, [isOpen, initialInvoiceId, invoices]);

  if (!isOpen || !guitar.clientUid) return null;

  const clientUid = guitar.clientUid;
  const selectedInvoice = invoices.find((i) => i.id === selectedInvoiceId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const amountValue = parseFloat(amount);
      if (Number.isNaN(amountValue) || amountValue <= 0) {
        throw new Error("Enter a valid payment amount");
      }
      if (!paidAt) {
        throw new Error("Payment date is required");
      }
      if (!currentUser) {
        throw new Error("You must be signed in");
      }

      let targetInvoiceId: string;
      let invoiceCurrency = currency;

      if (invoiceTarget === "existing") {
        if (!selectedInvoiceId || !selectedInvoice) {
          throw new Error("Select an invoice to apply this payment to");
        }
        targetInvoiceId = selectedInvoiceId;
        invoiceCurrency = selectedInvoice.currency || currency;
      } else {
        const dateLabel = new Date(paidAt).toLocaleDateString("en-AU", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
        targetInvoiceId = await createInvoiceRecord(clientUid, {
          title: `Payment — ${method} — ${guitar.orderNumber}`,
          description: `Manual payment recorded ${dateLabel} (${method})`,
          amount: amountValue,
          currency,
          status: "pending",
          uploadedBy: currentUser.uid,
          guitarId: guitar.id,
          dueDate: new Date(paidAt).getTime(),
        });
      }

      await recordInvoicePayment(clientUid, targetInvoiceId, {
        amount: amountValue,
        currency: invoiceCurrency,
        method,
        receiptNumber: receiptNumber.trim() || undefined,
        note: note.trim() || undefined,
        recordedBy: "staff",
        paidAt: new Date(paidAt).getTime(),
      });

      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to record payment";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            <h3 className="text-lg font-semibold text-gray-900">Record payment</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <p className="text-sm text-gray-600">
            Log cash, in-store, or other manual payments for{" "}
            <strong>{guitar.model}</strong> (order #{guitar.orderNumber}).
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {invoices.length > 0 && (
            <div>
              <span className="block text-sm font-medium text-gray-700 mb-2">Apply to</span>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="invoiceTarget"
                    checked={invoiceTarget === "existing"}
                    onChange={() => setInvoiceTarget("existing")}
                    className="text-blue-600"
                  />
                  <span className="text-sm text-gray-700">Existing invoice</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="invoiceTarget"
                    checked={invoiceTarget === "new"}
                    onChange={() => setInvoiceTarget("new")}
                    className="text-blue-600"
                  />
                  <span className="text-sm text-gray-700">
                    New payment entry (no invoice yet — creates one automatically)
                  </span>
                </label>
              </div>
            </div>
          )}

          {invoiceTarget === "existing" && invoices.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Invoice <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedInvoiceId}
                onChange={(e) => setSelectedInvoiceId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                required
              >
                <option value="">Select invoice…</option>
                {invoices.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.title} — {inv.currency} {inv.amount.toLocaleString()}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount ({currency}) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment method <span className="text-red-500">*</span>
            </label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date received <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Receipt number (optional)
            </label>
            <input
              type="text"
              value={receiptNumber}
              onChange={(e) => setReceiptNumber(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="e.g. Shopify order #, Xero invoice #, store receipt"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="e.g. Paid at Perth showroom"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
            >
              {isSaving ? "Recording…" : "Record payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
