"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { subscribeAllInvoices, recordInvoicePayment, type InvoiceWithClient } from "@/lib/firestore";
import type { InvoiceRecord, InvoicePayment } from "@/types/guitars";
import {
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Download,
  Filter,
  Search,
  Calendar,
  User,
  FileText,
} from "lucide-react";

export default function AccountingPage() {
  const { currentUser, userRole, loading } = useAuth();
  const router = useRouter();
  const [invoices, setInvoices] = useState<InvoiceWithClient[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvoiceRecord["status"] | "all">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithClient | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!currentUser) {
      router.push("/login");
      return;
    }

    if (userRole !== "accounting" && userRole !== "admin") {
      router.push("/");
      return;
    }
  }, [currentUser, userRole, loading, router]);

  useEffect(() => {
    if (!currentUser || (userRole !== "accounting" && userRole !== "admin")) return;

    setLoadingInvoices(true);
    const unsubscribe = subscribeAllInvoices((loadedInvoices) => {
      setInvoices(loadedInvoices);
      setLoadingInvoices(false);
    });

    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, [currentUser, userRole]);

  // Calculate financial summary
  const financialSummary = useMemo(() => {
    const now = Date.now();
    let totalRevenue = 0;
    let totalOutstanding = 0;
    let totalPaid = 0;
    let overdueCount = 0;
    let pendingCount = 0;
    let paidCount = 0;

    invoices.forEach((invoice) => {
      const totalPaidAmount = (invoice.payments || []).reduce((sum, p) => sum + p.amount, 0);
      const outstanding = invoice.amount - totalPaidAmount;

      if (invoice.status === "paid") {
        totalPaid += invoice.amount;
        paidCount++;
      } else {
        totalOutstanding += outstanding;
        // Check if overdue: either status is "overdue" or due date has passed
        const isOverdue = invoice.status === "overdue" || (invoice.dueDate && invoice.dueDate < now);
        if (isOverdue) {
          overdueCount++;
        }
        if (invoice.status === "pending") {
          pendingCount++;
        }
      }
      totalRevenue += invoice.amount;
    });

    return {
      totalRevenue,
      totalOutstanding,
      totalPaid,
      overdueCount,
      pendingCount,
      paidCount,
      totalInvoices: invoices.length,
    };
  }, [invoices]);

  // Filter invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
          invoice.title?.toLowerCase().includes(searchLower) ||
          invoice.clientName?.toLowerCase().includes(searchLower) ||
          invoice.clientEmail?.toLowerCase().includes(searchLower) ||
          invoice.id.toLowerCase().includes(searchLower) ||
          invoice.description?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (statusFilter !== "all" && invoice.status !== statusFilter) {
        return false;
      }

      // Date filter
      if (dateFrom) {
        const fromDate = new Date(dateFrom).getTime();
        if (invoice.uploadedAt < fromDate) return false;
      }
      if (dateTo) {
        const toDate = new Date(dateTo).getTime() + 86400000; // Add 1 day to include the full day
        if (invoice.uploadedAt > toDate) return false;
      }

      return true;
    });
  }, [invoices, searchTerm, statusFilter, dateFrom, dateTo]);

  const handleExportCSV = () => {
    const headers = [
      "Invoice ID",
      "Client UID",
      "Client Name",
      "Client Email",
      "Title",
      "Amount",
      "Currency",
      "Status",
      "Due Date",
      "Total Paid",
      "Outstanding",
      "Payment Count",
      "Created Date",
    ];

    const rows = filteredInvoices.map((invoice) => {
      const totalPaid = (invoice.payments || []).reduce((sum, p) => sum + p.amount, 0);
      const outstanding = invoice.amount - totalPaid;
      return [
        invoice.id,
        invoice.clientUid,
        invoice.clientName || "",
        invoice.clientEmail || "",
        invoice.title,
        invoice.amount.toString(),
        invoice.currency,
        invoice.status,
        invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "",
        totalPaid.toString(),
        outstanding.toString(),
        (invoice.payments || []).length.toString(),
        new Date(invoice.uploadedAt).toLocaleDateString(),
      ];
    });

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `invoices-${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading || loadingInvoices) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-lg">Loading...</div>
        </div>
      </AppLayout>
    );
  }

  if (!currentUser || (userRole !== "accounting" && userRole !== "admin")) {
    return null;
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Accounting & Finance</h1>
              <p className="text-gray-600">Manage invoices, payments, and financial reports</p>
            </div>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Financial Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Total Revenue</h3>
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              ${financialSummary.totalRevenue.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 mt-1">{financialSummary.totalInvoices} invoices</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Outstanding</h3>
              <AlertCircle className="w-5 h-5 text-yellow-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              ${financialSummary.totalOutstanding.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {financialSummary.pendingCount} pending, {financialSummary.overdueCount} overdue
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Total Paid</h3>
              <CheckCircle className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              ${financialSummary.totalPaid.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 mt-1">{financialSummary.paidCount} paid invoices</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Overdue</h3>
              <TrendingUp className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{financialSummary.overdueCount}</p>
            <p className="text-xs text-gray-500 mt-1">Requires attention</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Search className="w-4 h-4 inline mr-1" />
                Search
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search invoices..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as InvoiceRecord["status"] | "all")}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="partial">Partial</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                From Date
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                To Date
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Invoices Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              All Invoices ({filteredInvoices.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Paid
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Outstanding
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                      No invoices found
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((invoice) => {
                    const totalPaid = (invoice.payments || []).reduce((sum, p) => sum + p.amount, 0);
                    const outstanding = invoice.amount - totalPaid;
                    const isOverdue = invoice.dueDate && invoice.dueDate < Date.now() && invoice.status !== "paid";

                    return (
                      <tr key={invoice.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{invoice.title}</div>
                            <div className="text-xs text-gray-500">ID: {invoice.id.substring(0, 8)}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm text-gray-900">{invoice.clientName || "Unknown"}</div>
                            <div className="text-xs text-gray-500">{invoice.clientEmail || invoice.clientUid.substring(0, 8)}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {invoice.currency} ${invoice.amount.toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              invoice.status === "paid"
                                ? "bg-green-100 text-green-800"
                                : invoice.status === "overdue" || isOverdue
                                ? "bg-red-100 text-red-800"
                                : invoice.status === "partial"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {invoice.status}
                            {isOverdue && invoice.status !== "overdue" && " (overdue)"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {invoice.currency} ${totalPaid.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {invoice.currency} ${outstanding.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              setShowPaymentModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-900 font-medium"
                          >
                            Record Payment
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedInvoice && (
        <RecordPaymentModal
          invoice={selectedInvoice}
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedInvoice(null);
          }}
        />
      )}
    </AppLayout>
  );
}

// Payment Modal Component
function RecordPaymentModal({
  invoice,
  isOpen,
  onClose,
}: {
  invoice: InvoiceWithClient;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("bank transfer");
  const [note, setNote] = useState("");
  const [paidAt, setPaidAt] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const totalPaid = (invoice.payments || []).reduce((sum, p) => sum + p.amount, 0);
  const outstanding = invoice.amount - totalPaid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      const amountValue = parseFloat(amount);
      if (isNaN(amountValue) || amountValue <= 0) {
        throw new Error("Amount must be a positive number");
      }
      if (amountValue > outstanding) {
        throw new Error(`Amount cannot exceed outstanding balance of ${invoice.currency} ${outstanding.toLocaleString()}`);
      }

      await recordInvoicePayment(invoice.clientUid, invoice.id, {
        amount: amountValue,
        currency: invoice.currency,
        method,
        note: note || undefined,
        recordedBy: "accounting",
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
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Record Payment</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Invoice: {invoice.title}</div>
            <div className="text-sm text-gray-600 mb-1">Client: {invoice.clientName || invoice.clientEmail || invoice.clientUid}</div>
            <div className="text-sm font-medium text-gray-900">
              Total: {invoice.currency} ${invoice.amount.toLocaleString()} | 
              Paid: {invoice.currency} ${totalPaid.toLocaleString()} | 
              Outstanding: {invoice.currency} ${outstanding.toLocaleString()}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Amount *
              </label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`Max: ${invoice.currency} ${outstanding.toLocaleString()}`}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Method *
              </label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="bank transfer">Bank Transfer</option>
                <option value="credit card">Credit Card</option>
                <option value="paypal">PayPal</option>
                <option value="stripe">Stripe</option>
                <option value="cash">Cash</option>
                <option value="check">Check</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Date
              </label>
              <input
                type="date"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Leave empty to use today's date</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Payment reference, transaction ID, etc."
              />
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
                disabled={isSaving}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? "Recording..." : "Record Payment"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

