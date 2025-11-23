"use client";

import { useEffect, useState } from "react";
import { Plus, DollarSign, Calendar, FileText, X, AlertCircle } from "lucide-react";
import { subscribeGuitarInvoices, createInvoiceRecord, calculateGuitarTotalPaid, subscribeGuitar, subscribeRunStages } from "@/lib/firestore";
import { useAuth } from "@/contexts/AuthContext";
import type { InvoiceRecord, GuitarBuild, RunStage } from "@/types/guitars";

interface GuitarInvoiceManagerProps {
  guitar: GuitarBuild;
  onUpdate?: () => void;
}

export function GuitarInvoiceManager({ guitar, onUpdate }: GuitarInvoiceManagerProps) {
  const { currentUser } = useAuth();
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [stages, setStages] = useState<RunStage[]>([]);
  const [totalPaid, setTotalPaid] = useState(0);

  useEffect(() => {
    if (!guitar.id) return;

    // Subscribe to invoices for this guitar
    const unsubscribeInvoices = subscribeGuitarInvoices(guitar.id, (loadedInvoices) => {
      setInvoices(loadedInvoices);
      setLoading(false);
      
      // Calculate total paid
      const paid = loadedInvoices.reduce((sum, inv) => {
        const payments = inv.payments || [];
        return sum + payments.reduce((pSum, p) => pSum + (p.amount || 0), 0);
      }, 0);
      setTotalPaid(paid);
    });

    // Load stages for trigger stage selection
    const unsubscribeStages = subscribeRunStages(guitar.runId, (loadedStages) => {
      setStages(loadedStages);
    });

    return () => {
      unsubscribeInvoices();
      unsubscribeStages();
    };
  }, [guitar.id, guitar.runId]);

  const price = guitar.price || 0;
  const currency = guitar.currency || "AUD";
  const remainingBalance = Math.max(price - totalPaid, 0);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center text-gray-500">Loading invoices...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Invoices & Payments</h2>
          <p className="text-sm text-gray-500">Manage invoices for this guitar</p>
        </div>
        {guitar.clientUid && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Invoice
          </button>
        )}
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">Guitar Price</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {currency} ${price.toLocaleString()}
          </p>
        </div>
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-700">Total Paid</span>
          </div>
          <p className="text-2xl font-bold text-green-700">
            {currency} ${totalPaid.toLocaleString()}
          </p>
        </div>
        <div className={`rounded-lg p-4 border ${
          remainingBalance > 0 
            ? "bg-yellow-50 border-yellow-200" 
            : "bg-gray-50 border-gray-200"
        }`}>
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className={`w-4 h-4 ${remainingBalance > 0 ? "text-yellow-600" : "text-gray-500"}`} />
            <span className={`text-sm ${remainingBalance > 0 ? "text-yellow-700" : "text-gray-600"}`}>
              Remaining
            </span>
          </div>
          <p className={`text-2xl font-bold ${remainingBalance > 0 ? "text-yellow-700" : "text-gray-900"}`}>
            {currency} ${remainingBalance.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Invoice Trigger Stage Setting */}
      {guitar.clientUid && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Invoice Trigger Stage
          </label>
          <p className="text-xs text-gray-600 mb-2">
            Select a stage that will automatically create an invoice when the guitar reaches it.
          </p>
          <select
            value={guitar.invoiceTriggerStageId || ""}
            onChange={async (e) => {
              const stageId = e.target.value || undefined;
              // Update guitar with trigger stage
              const { updateGuitar } = await import("@/lib/firestore");
              await updateGuitar(guitar.id, {
                invoiceTriggerStageId: stageId,
              });
              onUpdate?.();
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">No automatic invoice</option>
            {stages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Invoices List */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Invoices ({invoices.length})
        </h3>
        {invoices.length === 0 ? (
          <div className="text-center text-gray-500 py-8 border border-dashed rounded-lg">
            No invoices yet. Add an invoice to get started.
          </div>
        ) : (
          <div className="space-y-4">
            {invoices.map((invoice) => {
              const payments = invoice.payments || [];
              const paidAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
              const outstanding = Math.max(invoice.amount - paidAmount, 0);

              return (
                <div key={invoice.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-900">{invoice.title}</h4>
                      {invoice.description && (
                        <p className="text-sm text-gray-600 mt-1">{invoice.description}</p>
                      )}
                      {invoice.triggeredByStageId && (
                        <p className="text-xs text-blue-600 mt-1">
                          Auto-created from stage
                        </p>
                      )}
                    </div>
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
                      {invoice.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
                    <div>
                      <p className="text-gray-500">Amount</p>
                      <p className="font-semibold">{currency} ${invoice.amount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Paid</p>
                      <p className="font-semibold text-green-600">
                        {currency} ${paidAmount.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Outstanding</p>
                      <p className="font-semibold text-yellow-600">
                        {currency} ${outstanding.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Due Date</p>
                      <p className="font-semibold">
                        {invoice.dueDate
                          ? new Date(invoice.dueDate).toLocaleDateString()
                          : "N/A"}
                      </p>
                    </div>
                  </div>

                  {payments.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs font-semibold text-gray-700 mb-2">Payments:</p>
                      <div className="space-y-1">
                        {payments.map((payment) => (
                          <div
                            key={payment.id}
                            className="flex items-center justify-between text-xs text-gray-600"
                          >
                            <span>
                              {new Date(payment.paidAt).toLocaleDateString()} - {payment.method}
                            </span>
                            <span className="font-semibold">
                              {currency} ${payment.amount.toLocaleString()}
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
      </div>

      {/* Add Invoice Modal */}
      {showAddModal && guitar.clientUid && (
        <AddInvoiceModal
          guitar={guitar}
          stages={stages}
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            onUpdate?.();
          }}
        />
      )}
    </div>
  );
}

function AddInvoiceModal({
  guitar,
  stages,
  isOpen,
  onClose,
  onSuccess,
}: {
  guitar: GuitarBuild;
  stages: RunStage[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { currentUser } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(guitar.currency || "AUD");
  const [dueDate, setDueDate] = useState("");
  const [paymentLink, setPaymentLink] = useState("");
  const [triggerStageId, setTriggerStageId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !guitar.clientUid) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const amountValue = parseFloat(amount);
      if (isNaN(amountValue) || amountValue <= 0) {
        throw new Error("Amount must be a positive number");
      }

      const dueDateValue = dueDate ? new Date(dueDate).getTime() : undefined;

      await createInvoiceRecord(guitar.clientUid!, {
        title: title.trim() || `Invoice for ${guitar.model}`,
        description: description.trim() || undefined,
        amount: amountValue,
        currency: currency,
        status: "pending",
        dueDate: dueDateValue,
        paymentLink: paymentLink.trim() || undefined,
        uploadedBy: currentUser?.uid || "accounting",
        guitarId: guitar.id,
        triggeredByStageId: triggerStageId || undefined,
      });

      // Reset form
      setTitle("");
      setDescription("");
      setAmount("");
      setDueDate("");
      setPaymentLink("");
      setTriggerStageId("");

      onSuccess();
    } catch (err: any) {
      console.error("Failed to create invoice:", err);
      setError(err?.message || "Failed to create invoice");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Add Invoice</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={`Invoice for ${guitar.model}`}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Invoice description..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="AUD">AUD</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Link (Optional)
              </label>
              <input
                type="url"
                value={paymentLink}
                onChange={(e) => setPaymentLink(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Trigger Stage (Optional)
              </label>
              <select
                value={triggerStageId}
                onChange={(e) => setTriggerStageId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">No trigger</option>
                {stages.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                If set, this invoice will be created when the guitar reaches this stage
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving || !amount}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? "Creating..." : "Create Invoice"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

