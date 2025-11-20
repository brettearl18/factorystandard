import { useState } from "react";
import { uploadInvoiceFile } from "@/lib/storage";
import { createInvoiceRecord } from "@/lib/firestore";

interface UploadInvoiceModalProps {
  clientUid: string;
  uploadedBy: string;
  isOpen: boolean;
  onClose: () => void;
}

export function UploadInvoiceModal({
  clientUid,
  uploadedBy,
  isOpen,
  onClose,
}: UploadInvoiceModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("AUD");
  const [dueDate, setDueDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [paymentLink, setPaymentLink] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const reset = () => {
    setTitle("");
    setDescription("");
    setAmount("");
    setCurrency("AUD");
    setDueDate("");
    setFile(null);
    setPaymentLink("");
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount) {
      setError("Title and amount are required.");
      return;
    }

    // Either file or payment link (or both) must be provided
    if (!file && !paymentLink.trim()) {
      setError("Please provide either an invoice file or a payment link (or both).");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const amountValue = parseFloat(amount);
      if (isNaN(amountValue)) {
        throw new Error("Amount must be a number");
      }

      // Validate payment link URL if provided
      if (paymentLink.trim()) {
        try {
          new URL(paymentLink.trim());
        } catch {
          throw new Error("Payment link must be a valid URL");
        }
      }

      let downloadUrl: string | undefined;
      if (file) {
        downloadUrl = await uploadInvoiceFile(clientUid, file);
      }

      await createInvoiceRecord(clientUid, {
        title,
        description: description || undefined,
        amount: amountValue,
        currency,
        status: "pending",
        dueDate: dueDate ? new Date(dueDate).getTime() : undefined,
        downloadUrl,
        paymentLink: paymentLink.trim() || undefined,
        uploadedBy,
      });

      reset();
      onClose();
    } catch (err: any) {
      console.error("Failed to upload invoice", err);
      setError(err?.message || "Failed to upload invoice");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">Upload Invoice</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border rounded-md px-3 py-2"
              placeholder="Deposit invoice"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border rounded-md px-3 py-2"
              rows={2}
              placeholder="Optional notes about this invoice"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full border rounded-md px-3 py-2"
              >
                <option value="AUD">AUD</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full border rounded-md px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Invoice File (PDF/Image) <span className="text-gray-500 text-xs">(Optional if payment link provided)</span>
            </label>
            <input
              type="file"
              accept="application/pdf,image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Link <span className="text-gray-500 text-xs">(Optional if invoice file provided)</span>
            </label>
            <input
              type="url"
              value={paymentLink}
              onChange={(e) => setPaymentLink(e.target.value)}
              className="w-full border rounded-md px-3 py-2"
              placeholder="https://pay.stripe.com/..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Link to payment page (e.g., Stripe, PayPal, bank transfer)
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-md hover:bg-gray-50"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Uploading..." : "Upload"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

