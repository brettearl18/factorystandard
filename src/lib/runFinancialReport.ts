import type { GuitarBuild, InvoiceRecord, InvoicePayment } from "@/types/guitars";

export type RunFinancialStatus =
  | "no_client"
  | "no_financials"
  | "partial"
  | "paid"
  | "over_invoiced"
  | "unknown_balance";

/** One recorded payment line for display in the run financial report */
export interface RunFinancialPaymentLine {
  id: string;
  paidAt: number;
  amount: number;
  currency: string;
  method: string;
  approvalStatus?: InvoicePayment["approvalStatus"];
  invoiceTitle: string;
  note?: string;
  receiptNumber?: string;
}

export interface InvoiceDueSummary {
  invoiceCount: number;
  nextDueDate: number | null;
  hasOverdue: boolean;
  overdueCount: number;
  /** Short label for table cells */
  dueLabel: string;
}

export interface RunFinancialRow {
  guitar: GuitarBuild;
  runId: string;
  runName: string;
  clientLabel: string;
  clientEmail: string | null;
  stageLabel: string;
  totalDue: number | null;
  currency: string;
  invoicedTotal: number;
  paidApproved: number;
  paidPending: number;
  balanceRemaining: number | null;
  lastPaymentAt: number | null;
  lastPaymentAmount: number | null;
  invoiceCount: number;
  invoiceDue: InvoiceDueSummary;
  paymentCount: number;
  approvedPaymentCount: number;
  pendingPaymentCount: number;
  /** All payments, newest first */
  paymentLines: RunFinancialPaymentLine[];
  /** Source invoices for expanded detail panel */
  invoices: InvoiceRecord[];
  status: RunFinancialStatus;
  statusLabel: string;
}

export interface RunFinancialSummary {
  guitarCount: number;
  noFinancialsCount: number;
  noClientCount: number;
  totalDueKnown: number;
  totalInvoiced: number;
  totalPaidApproved: number;
  totalPending: number;
  totalBalanceRemaining: number;
  totalPaymentCount: number;
  currency: string;
}

function isApprovedPayment(p: Pick<InvoicePayment, "approvalStatus">): boolean {
  return p.approvalStatus !== "rejected" && (p.approvalStatus === "approved" || p.approvalStatus === undefined);
}

function isPendingPayment(p: Pick<InvoicePayment, "approvalStatus">): boolean {
  return p.approvalStatus === "pending";
}

function invoiceOutstanding(inv: InvoiceRecord): number {
  const paid = (inv.payments ?? [])
    .filter((p) => isApprovedPayment(p))
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  return Math.max((inv.amount || 0) - paid, 0);
}

export function summarizeInvoiceDueDates(invoices: InvoiceRecord[]): InvoiceDueSummary {
  const now = Date.now();
  let nextDueDate: number | null = null;
  let overdueCount = 0;

  for (const inv of invoices) {
    if (invoiceOutstanding(inv) <= 0) continue;
    if (!inv.dueDate) continue;
    if (inv.dueDate < now) overdueCount++;
    if (nextDueDate == null || inv.dueDate < nextDueDate) {
      nextDueDate = inv.dueDate;
    }
  }

  const invoiceCount = invoices.length;
  let dueLabel: string;
  if (invoiceCount === 0) {
    dueLabel = "No invoices";
  } else if (nextDueDate == null) {
    dueLabel = `${invoiceCount} invoice${invoiceCount !== 1 ? "s" : ""} · no due date`;
  } else {
    const formatted = new Date(nextDueDate).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    dueLabel =
      overdueCount > 0
        ? `${overdueCount} overdue · next ${formatted}`
        : `Next due ${formatted}`;
  }

  return {
    invoiceCount,
    nextDueDate,
    hasOverdue: overdueCount > 0,
    overdueCount,
    dueLabel,
  };
}

export function collectPaymentLines(invoices: InvoiceRecord[]): RunFinancialPaymentLine[] {
  const lines: RunFinancialPaymentLine[] = [];
  for (const inv of invoices) {
    for (const p of inv.payments ?? []) {
      lines.push({
        id: p.id,
        paidAt: p.paidAt,
        amount: p.amount,
        currency: p.currency,
        method: p.method,
        approvalStatus: p.approvalStatus,
        invoiceTitle: inv.title,
        note: p.note,
        receiptNumber: p.receiptNumber,
      });
    }
  }
  lines.sort((a, b) => b.paidAt - a.paidAt);
  return lines;
}

export function sumApprovedPayments(invoices: InvoiceRecord[]): {
  paidApproved: number;
  paidPending: number;
  lastPaymentAt: number | null;
  lastPaymentAmount: number | null;
  paymentCount: number;
  approvedPaymentCount: number;
  pendingPaymentCount: number;
  paymentLines: RunFinancialPaymentLine[];
} {
  const paymentLines = collectPaymentLines(invoices);
  let paidApproved = 0;
  let paidPending = 0;
  let lastPaymentAt: number | null = null;
  let lastPaymentAmount: number | null = null;
  let approvedPaymentCount = 0;
  let pendingPaymentCount = 0;

  for (const p of paymentLines) {
    if (isApprovedPayment(p)) {
      approvedPaymentCount++;
      paidApproved += p.amount || 0;
      if (p.paidAt && (lastPaymentAt == null || p.paidAt > lastPaymentAt)) {
        lastPaymentAt = p.paidAt;
        lastPaymentAmount = p.amount;
      }
    } else if (isPendingPayment(p)) {
      pendingPaymentCount++;
      paidPending += p.amount || 0;
    }
  }

  return {
    paidApproved,
    paidPending,
    lastPaymentAt,
    lastPaymentAmount,
    paymentCount: paymentLines.length,
    approvedPaymentCount,
    pendingPaymentCount,
    paymentLines,
  };
}

export function buildRunFinancialRow(
  guitar: GuitarBuild,
  invoices: InvoiceRecord[],
  stageLabel: string,
  clientLabel: string,
  clientEmail: string | null,
  runName: string = "—"
): RunFinancialRow {
  const currency = guitar.currency || "AUD";
  const totalDue = typeof guitar.price === "number" && !Number.isNaN(guitar.price) ? guitar.price : null;
  const invoicedTotal = invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
  const {
    paidApproved,
    paidPending,
    lastPaymentAt,
    lastPaymentAmount,
    paymentCount,
    approvedPaymentCount,
    pendingPaymentCount,
    paymentLines,
  } = sumApprovedPayments(invoices);

  let balanceRemaining: number | null = null;
  if (totalDue != null) {
    balanceRemaining = Math.max(totalDue - paidApproved, 0);
  }

  let status: RunFinancialStatus;
  let statusLabel: string;

  if (!guitar.clientUid) {
    status = "no_client";
    statusLabel = "No client assigned";
  } else if (totalDue == null && invoices.length === 0) {
    status = "no_financials";
    statusLabel = "No financials set up";
  } else if (totalDue == null) {
    status = "unknown_balance";
    statusLabel = "Price not set";
  } else if (paidApproved >= totalDue) {
    status = "paid";
    statusLabel = "Paid in full";
  } else if (paidApproved > 0) {
    status = "partial";
    statusLabel = "Partially paid";
  } else if (invoicedTotal > 0) {
    status = "partial";
    statusLabel = "Awaiting payment";
  } else {
    status = "no_financials";
    statusLabel = "No invoices yet";
  }

  const invoiceDue = summarizeInvoiceDueDates(invoices);

  return {
    guitar,
    runId: guitar.runId,
    runName,
    clientLabel,
    clientEmail,
    stageLabel,
    totalDue,
    currency,
    invoicedTotal,
    paidApproved,
    paidPending,
    balanceRemaining,
    lastPaymentAt,
    lastPaymentAmount,
    invoiceCount: invoices.length,
    invoiceDue,
    paymentCount,
    approvedPaymentCount,
    pendingPaymentCount,
    paymentLines,
    invoices,
    status,
    statusLabel,
  };
}

export function buildRunFinancialSummary(rows: RunFinancialRow[]): RunFinancialSummary {
  const currency = rows[0]?.currency || "AUD";
  let totalDueKnown = 0;
  let totalBalanceRemaining = 0;

  for (const row of rows) {
    if (row.totalDue != null) totalDueKnown += row.totalDue;
    if (row.balanceRemaining != null) totalBalanceRemaining += row.balanceRemaining;
  }

  return {
    guitarCount: rows.length,
    noFinancialsCount: rows.filter((r) => r.status === "no_financials" || r.status === "unknown_balance").length,
    noClientCount: rows.filter((r) => r.status === "no_client").length,
    totalDueKnown,
    totalInvoiced: rows.reduce((s, r) => s + r.invoicedTotal, 0),
    totalPaidApproved: rows.reduce((s, r) => s + r.paidApproved, 0),
    totalPending: rows.reduce((s, r) => s + r.paidPending, 0),
    totalBalanceRemaining,
    totalPaymentCount: rows.reduce((s, r) => s + r.paymentCount, 0),
    currency,
  };
}

export function formatMoney(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Shorter display for tight UI slots (e.g. dashboard stat cards). */
export function formatMoneyCompact(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatMoneyOrDash(amount: number | null, currency: string): string {
  if (amount == null) return "—";
  return formatMoney(amount, currency);
}

export function formatMoneyCompactOrDash(amount: number | null, currency: string): string {
  if (amount == null) return "—";
  return formatMoneyCompact(amount, currency);
}

export interface RunGuitarTotals {
  count: number;
  totalValue: number;
  pricedCount: number;
  currency: string;
}

/** Guitar count and sum of `price` for guitars in a run (excludes archived via caller). */
export function computeRunGuitarTotals(guitars: GuitarBuild[]): RunGuitarTotals {
  let totalValue = 0;
  let pricedCount = 0;
  const currency = guitars.find((g) => g.currency)?.currency || "AUD";

  for (const g of guitars) {
    if (typeof g.price === "number" && !Number.isNaN(g.price)) {
      totalValue += g.price;
      pricedCount++;
    }
  }

  return { count: guitars.length, totalValue, pricedCount, currency };
}

export function exportRunFinancialCsv(rows: RunFinancialRow[], runName: string): void {
  const headers = [
    "Run",
    "Order #",
    "Client",
    "Email",
    "Model",
    "Finish",
    "Stage",
    "Invoices",
    "Next due / due summary",
    "Total due",
    "Currency",
    "Invoiced",
    "Paid (approved)",
    "Pending approval",
    "Balance remaining",
    "Payment count",
    "Approved payments",
    "Pending payments",
    "Last payment date",
    "Last payment amount",
    "Payment history (date | amount | method | status | invoice)",
    "Invoices",
    "Status",
  ];
  const lines = rows.map((r) => [
    r.runName,
    r.guitar.orderNumber,
    r.clientLabel,
    r.clientEmail ?? "",
    r.guitar.model,
    r.guitar.finish,
    r.stageLabel,
    String(r.invoiceCount),
    r.invoiceDue.dueLabel,
    r.totalDue != null ? String(r.totalDue) : "",
    r.currency,
    String(r.invoicedTotal),
    String(r.paidApproved),
    String(r.paidPending),
    r.balanceRemaining != null ? String(r.balanceRemaining) : "",
    String(r.paymentCount),
    String(r.approvedPaymentCount),
    String(r.pendingPaymentCount),
    r.lastPaymentAt ? new Date(r.lastPaymentAt).toISOString() : "",
    r.lastPaymentAmount != null ? String(r.lastPaymentAmount) : "",
    r.paymentLines
      .map((p) => {
        const d = new Date(p.paidAt).toLocaleDateString("en-AU");
        const st = p.approvalStatus ?? "approved";
        return `${d}: ${p.amount} ${p.currency} ${p.method} (${st}) — ${p.invoiceTitle}`;
      })
      .join("; "),
    String(r.invoiceCount),
    r.statusLabel,
  ]);
  const csv = [headers, ...lines]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `run-financials-${runName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
