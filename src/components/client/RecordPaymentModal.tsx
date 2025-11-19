import { useState } from "react";
import type { InvoiceRecord } from "@/types/guitars";
import { recordInvoicePayment } from "@/lib/firestore";

interface RecordPaymentModalProps {
  clientUid: string;
  invoice: InvoiceRecord | null;
  isOpen: boolean;
  onClose: () => void;
}

export function RecordPaymentModal({
  clientUid,
  invoice,
  isOpen,
  onClose,
}: RecordPaymentModalProps) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("bank transfer");
  const [note, setNote] = useState("");
  const [paidAt, setPaidAt] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !invoice) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      const amountValue = parseFloat(amount);
      if (isNaN(amountValue)) {
        throw new Error("Amount must be a number");
      }

      await recordInvoicePayment(clientUid, invoice.id, {
        amount: amountValue,
        currency: invoice.currency,
        method,
        note: note || undefined,
        recordedBy: "system",
        paidAt: paidAt ? new Date(paidAt).getTime() : undefined,
      });

      setAmount("");
      setMethod("bank transfer");
      setNote("");
      setPaidAt("");
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
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h3 className="text-lg font-semibold">Record Payment</h3>
            <p className="text-sm text-gray-500">{invoice.title}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full border rounded-md px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
            <input
              type="text"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full border rounded-md px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
            <input
              type="date"
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
              className="w-full border rounded-md px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full border rounded-md px-3 py-2"
              rows={2}
              placeholder="Optional note"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-md hover:bg-gray-50"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Record Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

