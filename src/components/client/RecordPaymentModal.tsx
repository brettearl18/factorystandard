import { useState } from "react";
import type { InvoiceRecord } from "@/types/guitars";
import { recordInvoicePayment } from "@/lib/firestore";
import { uploadPaymentReceipt } from "@/lib/storage";
import { Upload, X, Image as ImageIcon } from "lucide-react";

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
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !invoice) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError("Please upload an image file (screenshot/receipt)");
        return;
      }
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError("File size must be less than 10MB");
        return;
      }
      setReceiptFile(file);
      setError(null);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveReceipt = () => {
    setReceiptFile(null);
    setReceiptPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setIsUploading(false);
    setError(null);
    try {
      const amountValue = parseFloat(amount);
      if (isNaN(amountValue)) {
        throw new Error("Amount must be a number");
      }

      let receiptUrl: string | undefined;
      
      // Upload receipt screenshot if provided
      if (receiptFile) {
        setIsUploading(true);
        try {
          receiptUrl = await uploadPaymentReceipt(clientUid, invoice.id, receiptFile);
        } catch (uploadError: any) {
          throw new Error(`Failed to upload receipt: ${uploadError.message || "Unknown error"}`);
        } finally {
          setIsUploading(false);
        }
      }

      await recordInvoicePayment(clientUid, invoice.id, {
        amount: amountValue,
        currency: invoice.currency,
        method,
        note: note || undefined,
        recordedBy: "client",
        paidAt: paidAt ? new Date(paidAt).getTime() : undefined,
        receiptUrl,
      });

      setAmount("");
      setMethod("bank transfer");
      setNote("");
      setPaidAt("");
      setReceiptFile(null);
      setReceiptPreview(null);
      onClose();
    } catch (err: any) {
      console.error("Failed to record payment", err);
      setError(err?.message || "Failed to record payment");
    } finally {
      setIsSaving(false);
      setIsUploading(false);
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Receipt/Screenshot
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Upload a screenshot or photo of your payment confirmation
            </p>
            {!receiptPreview ? (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 mb-2 text-gray-400" />
                  <p className="mb-2 text-sm text-gray-500">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </label>
            ) : (
              <div className="relative">
                <img
                  src={receiptPreview}
                  alt="Receipt preview"
                  className="w-full h-48 object-contain border border-gray-200 rounded-lg bg-gray-50"
                />
                <button
                  type="button"
                  onClick={handleRemoveReceipt}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
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
              disabled={isSaving || isUploading}
            >
              {isUploading ? "Uploading..." : isSaving ? "Saving..." : "Record Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

