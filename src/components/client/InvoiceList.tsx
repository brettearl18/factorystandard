import type { InvoiceRecord } from "@/types/guitars";

interface InvoiceListProps {
  invoices: InvoiceRecord[];
  onUploadInvoice?: () => void;
  onRecordPayment?: (invoice: InvoiceRecord) => void;
  canManage?: boolean;
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
}: InvoiceListProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Invoices & Payments</h2>
          <p className="text-sm text-gray-500">View your invoices and payment history.</p>
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

      {invoices.length === 0 ? (
        <div className="text-center text-gray-500 py-10 border border-dashed rounded-lg">
          No invoices yet.
        </div>
      ) : (
        <div className="space-y-4">
          {invoices.map((invoice) => {
            const payments = invoice.payments || [];
            const paidAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
            const outstanding = Math.max(invoice.amount - paidAmount, 0);

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
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div className="bg-white rounded border border-gray-200 p-3">
                    <p className="text-gray-500">Paid</p>
                    <p className="font-semibold">{formatCurrency(paidAmount, invoice.currency)}</p>
                  </div>
                  <div className="bg-white rounded border border-gray-200 p-3">
                    <p className="text-gray-500">Outstanding</p>
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

                {payments.length > 0 && (
                  <div className="mt-4 bg-white rounded border border-gray-200 p-3">
                    <p className="text-sm font-semibold mb-2">Payments</p>
                    <div className="space-y-2">
                      {payments.map((payment) => (
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
    </div>
  );
}

