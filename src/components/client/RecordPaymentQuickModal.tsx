"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { InvoiceRecord } from "@/types/guitars";
import { recordInvoicePayment, createInvoiceRecord } from "@/lib/firestore";
import { X, DollarSign } from "lucide-react";

interface RecordPaymentQuickModalProps {
  clientUid: string;
  invoices: InvoiceRecord[];
  guitars?: Array<{ id: string; model?: string; finish?: string }>;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function RecordPaymentQuickModal({
  clientUid,
  invoices,
  guitars = [],
  isOpen,
  onClose,
  onSuccess,
}: RecordPaymentQuickModalProps) {
  const { currentUser } = useAuth();
  const [useInvoiceNumber, setUseInvoiceNumber] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [selectedGuitarId, setSelectedGuitarId] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("AUD");
  const [method, setMethod] = useState("bank transfer");
  const [note, setNote] = useState("");
  const [paidAt, setPaidAt] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const selectedInvoice = invoices.find((inv) => inv.id === selectedInvoiceId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const amountValue = parseFloat(amount);
      if (isNaN(amountValue) || amountValue <= 0) {
        throw new Error("Amount must be a positive number");
      }

      if (!paidAt) {
        throw new Error("Date of payment is required");
      }

      const paidAtTimestamp = new Date(paidAt).getTime();

      let targetInvoiceId: string;
      let invoiceCurrency: string = currency;

      if (useInvoiceNumber) {
        // User entered invoice number manually
        if (!invoiceNumber.trim()) {
          throw new Error("Invoice number is required");
        }

        // Try to find existing invoice by number (check title or description)
        const matchingInvoice = invoices.find(
          (inv) =>
            inv.title?.toLowerCase().includes(invoiceNumber.toLowerCase()) ||
            inv.description?.toLowerCase().includes(invoiceNumber.toLowerCase())
        );

        if (matchingInvoice) {
          // Use existing invoice
          targetInvoiceId = matchingInvoice.id;
          invoiceCurrency = matchingInvoice.currency;
        } else {
          // Create a new invoice with the invoice number
          if (!currentUser) {
            throw new Error("You must be logged in to create invoices");
          }
          targetInvoiceId = await createInvoiceRecord(clientUid, {
            title: `Invoice ${invoiceNumber}`,
            description: `Payment recorded for invoice number: ${invoiceNumber}`,
            amount: amountValue, // Set invoice amount to match payment (can be adjusted later)
            currency: currency,
            status: "pending",
            uploadedBy: currentUser.uid,
            ...(selectedGuitarId ? { guitarId: selectedGuitarId } : {}),
          });
        }
      } else {
        // User selected from existing invoices
        if (!selectedInvoiceId) {
          throw new Error("Please select an invoice");
        }
        if (!selectedInvoice) {
          throw new Error("Selected invoice not found");
        }
        targetInvoiceId = selectedInvoiceId;
        invoiceCurrency = selectedInvoice.currency;
      }

      await recordInvoicePayment(clientUid, targetInvoiceId, {
        amount: amountValue,
        currency: invoiceCurrency,
        method,
        note: note || undefined,
        recordedBy: "staff", // Staff-recorded payments are auto-approved
        paidAt: paidAtTimestamp,
      });

      // Reset form
      setSelectedInvoiceId("");
      setInvoiceNumber("");
      setSelectedGuitarId("");
      setAmount("");
      setCurrency("AUD");
      setMethod("bank transfer");
      setNote("");
      setPaidAt("");
      setUseInvoiceNumber(false);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error("Failed to record payment", err);
      setError(err?.message || "Failed to record payment");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Record Payment</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <div className="flex items-center gap-4 mb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={!useInvoiceNumber}
                  onChange={() => {
                    setUseInvoiceNumber(false);
                    setInvoiceNumber("");
                  }}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm font-medium text-gray-700">Select existing invoice</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={useInvoiceNumber}
                  onChange={() => {
                    setUseInvoiceNumber(true);
                    setSelectedInvoiceId("");
                  }}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm font-medium text-gray-700">Enter invoice number</span>
              </label>
            </div>

            {!useInvoiceNumber ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Invoice <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedInvoiceId}
                  onChange={(e) => setSelectedInvoiceId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required={!useInvoiceNumber}
                >
                  <option value="">Select an invoice...</option>
                  {invoices.map((invoice) => (
                    <option key={invoice.id} value={invoice.id}>
                      {invoice.title} - {invoice.currency} {invoice.amount.toLocaleString()}
                    </option>
                  ))}
                </select>
                {selectedInvoice && (
                  <p className="text-xs text-gray-500 mt-1">
                    Due: {selectedInvoice.dueDate ? new Date(selectedInvoice.dueDate).toLocaleDateString() : "N/A"}
                  </p>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Invoice Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., INV-2026-001"
                  required={useInvoiceNumber}
                />
                <p className="text-xs text-gray-500 mt-1">
                  If the invoice doesn't exist, a new invoice will be created with this number.
                </p>
              </div>
            )}
          </div>

          {useInvoiceNumber && guitars.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Link to Guitar (Optional)
              </label>
              <select
                value={selectedGuitarId}
                onChange={(e) => setSelectedGuitarId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">No guitar (general payment)</option>
                {guitars.map((guitar) => (
                  <option key={guitar.id} value={guitar.id}>
                    {guitar.model || "Guitar"} {guitar.finish ? `- ${guitar.finish}` : ""}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Linking to a guitar will update the guitar's payment totals.
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                  required
                />
              </div>
              {useInvoiceNumber && (
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="AUD">AUD</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              )}
            </div>
            {!useInvoiceNumber && selectedInvoice && (
              <p className="text-xs text-gray-500 mt-1">
                Currency: {selectedInvoice.currency}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Method
            </label>
            <input
              type="text"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., bank transfer, cash, credit card"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date of Payment <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Note (Optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={2}
              placeholder="Additional notes about this payment..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSaving}
            >
              {isSaving ? "Recording..." : "Record Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
