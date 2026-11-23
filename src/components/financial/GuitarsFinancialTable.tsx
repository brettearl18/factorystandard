"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import {
  buildRunFinancialSummary,
  exportRunFinancialCsv,
  formatMoney,
  formatMoneyOrDash,
  type RunFinancialPaymentLine,
  type RunFinancialRow,
} from "@/lib/runFinancialReport";
import type { InvoiceRecord } from "@/types/guitars";
import { ChevronDown, ChevronRight, DollarSign, Loader2 } from "lucide-react";

function statusClass(status: RunFinancialRow["status"]): string {
  switch (status) {
    case "paid":
      return "bg-teal/10 text-teal";
    case "partial":
      return "bg-amber-100 text-amber-800";
    case "no_financials":
    case "unknown_balance":
      return "bg-slate-100 text-slate-700";
    case "no_client":
      return "bg-red-100 text-red-800";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function formatDueDate(ms: number | null): string {
  if (ms == null) return "—";
  return new Date(ms).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export interface GuitarsFinancialTableProps {
  rows: RunFinancialRow[];
  loading?: boolean;
  showRunColumn?: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  emptyMessage?: string;
  csvFileName?: string;
  onExportCsv?: () => void;
}

export function GuitarsFinancialTable({
  rows,
  loading = false,
  showRunColumn = false,
  search,
  onSearchChange,
  emptyMessage = "No guitars found.",
  csvFileName = "guitars-financial",
  onExportCsv,
}: GuitarsFinancialTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const summary = buildRunFinancialSummary(rows);

  const filteredRows = (() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.runName.toLowerCase().includes(q) ||
        r.guitar.orderNumber.toLowerCase().includes(q) ||
        r.clientLabel.toLowerCase().includes(q) ||
        (r.clientEmail?.toLowerCase().includes(q) ?? false) ||
        r.guitar.model.toLowerCase().includes(q) ||
        r.guitar.finish.toLowerCase().includes(q) ||
        r.stageLabel.toLowerCase().includes(q) ||
        r.statusLabel.toLowerCase().includes(q) ||
        r.invoiceDue.dueLabel.toLowerCase().includes(q)
    );
  })();

  const colSpan = showRunColumn ? 15 : 14;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="stat-card">
          <p className="text-xs font-medium text-slate-500">Guitars</p>
          <p className="text-xl font-semibold text-slate-900 mt-1 tabular-nums">{summary.guitarCount}</p>
          {summary.noFinancialsCount > 0 && (
            <p className="text-xs text-accent mt-1">{summary.noFinancialsCount} need financials</p>
          )}
        </div>
        <div className="stat-card">
          <p className="text-xs font-medium text-slate-500">Total due (priced)</p>
          <p className="text-xl font-semibold text-slate-900 mt-1 tabular-nums">
            {formatMoney(summary.totalDueKnown, summary.currency)}
          </p>
        </div>
        <div className="stat-card">
          <p className="text-xs font-medium text-slate-500">Invoiced</p>
          <p className="text-xl font-semibold text-slate-900 mt-1 tabular-nums">
            {formatMoney(summary.totalInvoiced, summary.currency)}
          </p>
        </div>
        <div className="stat-card">
          <p className="text-xs font-medium text-slate-500">Paid (approved)</p>
          <p className="text-xl font-semibold text-teal mt-1 tabular-nums">
            {formatMoney(summary.totalPaidApproved, summary.currency)}
          </p>
        </div>
        <div className="stat-card">
          <p className="text-xs font-medium text-slate-500">Pending approval</p>
          <p className="text-xl font-semibold text-amber-700 mt-1 tabular-nums">
            {formatMoney(summary.totalPending, summary.currency)}
          </p>
        </div>
        <div className="stat-card">
          <p className="text-xs font-medium text-slate-500">Balance remaining</p>
          <p className="text-xl font-semibold text-slate-900 mt-1 tabular-nums">
            {formatMoney(summary.totalBalanceRemaining, summary.currency)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="search"
          placeholder="Search run, order #, client, model, stage…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="flex-1 min-w-[200px] max-w-md h-10 px-3 rounded-2xl border border-slate-200 bg-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/40"
        />
        {rows.length > 0 && (
          <button
            type="button"
            onClick={() =>
              onExportCsv ? onExportCsv() : exportRunFinancialCsv(rows, csvFileName)
            }
            className="h-10 px-4 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Export CSV
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-10 h-10 text-accent animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-12 text-center text-slate-500">
          {emptyMessage}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left">
                  <th className="py-3 px-3 w-8" />
                  {showRunColumn && (
                    <th className="py-3 px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Run</th>
                  )}
                  <th className="py-3 px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Order #</th>
                  <th className="py-3 px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Client</th>
                  <th className="py-3 px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Build</th>
                  <th className="py-3 px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Stage</th>
                  <th className="py-3 px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center">Invoices</th>
                  <th className="py-3 px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Due dates</th>
                  <th className="py-3 px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-right">Total due</th>
                  <th className="py-3 px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-right">Invoiced</th>
                  <th className="py-3 px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-right">Paid</th>
                  <th className="py-3 px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-right">Pending</th>
                  <th className="py-3 px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-right">Balance</th>
                  <th className="py-3 px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Payments</th>
                  <th className="py-3 px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => {
                  const expanded = expandedId === row.guitar.id;
                  return (
                    <Fragment key={row.guitar.id}>
                      <tr className="border-b border-slate-100 hover:bg-slate-50/80">
                        <td className="py-3 px-3">
                          <button
                            type="button"
                            onClick={() => setExpandedId(expanded ? null : row.guitar.id)}
                            className="text-slate-400 hover:text-slate-700"
                            aria-label={expanded ? "Collapse" : "Expand details"}
                          >
                            {expanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                        {showRunColumn && (
                          <td className="py-3 px-3 text-slate-800">
                            <Link
                              href={`/runs/${row.runId}/financials`}
                              className="font-medium text-accent hover:text-accent-light"
                            >
                              {row.runName}
                            </Link>
                          </td>
                        )}
                        <td className="py-3 px-3 font-medium text-slate-900">
                          <div className="flex flex-col gap-0.5">
                            <Link
                              href={`/guitars/${row.guitar.id}#finance`}
                              className="text-accent hover:text-accent-light"
                            >
                              {row.guitar.orderNumber}
                            </Link>
                            {row.guitar.clientUid && (
                              <Link
                                href={`/guitars/${row.guitar.id}?addInvoice=1#finance`}
                                className="text-xs text-teal hover:underline w-fit"
                              >
                                + Add invoice
                              </Link>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-slate-700">
                          <div>{row.clientLabel}</div>
                          {row.clientEmail && (
                            <div className="text-xs text-slate-500">{row.clientEmail}</div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-700">
                          {row.guitar.model}
                          <span className="text-slate-400"> · </span>
                          {row.guitar.finish}
                        </td>
                        <td className="py-3 px-3 text-slate-600">{row.stageLabel}</td>
                        <td className="py-3 px-3 text-center text-slate-700">
                          {row.invoiceCount === 0 ? (
                            <span className="text-slate-400">0</span>
                          ) : (
                            row.invoiceCount
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-700 max-w-[180px]">
                          <span
                            className={
                              row.invoiceDue.hasOverdue ? "text-red-700 font-medium" : ""
                            }
                          >
                            {row.invoiceDue.dueLabel}
                          </span>
                          {row.invoiceDue.nextDueDate != null && (
                            <div className="text-xs text-slate-500 mt-0.5">
                              {formatDueDate(row.invoiceDue.nextDueDate)}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-medium tabular-nums">
                          {formatMoneyOrDash(row.totalDue, row.currency)}
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums">
                          {row.invoicedTotal > 0
                            ? formatMoney(row.invoicedTotal, row.currency)
                            : "—"}
                        </td>
                        <td className="py-3 px-3 text-right text-teal font-medium tabular-nums">
                          {row.paidApproved > 0
                            ? formatMoney(row.paidApproved, row.currency)
                            : "—"}
                        </td>
                        <td className="py-3 px-3 text-right text-amber-700 tabular-nums">
                          {row.paidPending > 0
                            ? formatMoney(row.paidPending, row.currency)
                            : "—"}
                        </td>
                        <td className="py-3 px-3 text-right font-medium tabular-nums">
                          {formatMoneyOrDash(row.balanceRemaining, row.currency)}
                        </td>
                        <td className="py-3 px-3 text-slate-700">
                          {row.paymentCount === 0 ? (
                            <span className="text-slate-400">0</span>
                          ) : (
                            <span className="font-medium">{row.paymentCount}</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-xl text-xs font-medium ${statusClass(row.status)}`}
                          >
                            {row.statusLabel}
                          </span>
                        </td>
                      </tr>
                      {expanded && (
                        <tr className="bg-slate-50/80">
                          <td colSpan={colSpan} className="px-6 py-4">
                            <FinancialDetailPanel row={row} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filteredRows.length === 0 && rows.length > 0 && (
            <p className="text-center text-slate-500 py-8">No rows match your search.</p>
          )}
        </div>
      )}
    </div>
  );
}

function paymentStatusLabel(status?: RunFinancialPaymentLine["approvalStatus"]): string {
  if (status === "pending") return "Pending approval";
  if (status === "rejected") return "Rejected";
  return "Approved";
}

function paymentStatusClass(status?: RunFinancialPaymentLine["approvalStatus"]): string {
  if (status === "pending") return "bg-amber-100 text-amber-800";
  if (status === "rejected") return "bg-red-100 text-red-800";
  return "bg-teal/10 text-teal";
}

function InvoicesOnFileTable({
  invoices,
  currency,
}: {
  invoices: InvoiceRecord[];
  currency: string;
}) {
  const now = Date.now();
  return (
    <div>
      <h4 className="text-sm font-semibold text-slate-800 mb-2">
        Invoices on file ({invoices.length})
      </h4>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-left">
              <th className="py-2 px-3 font-medium text-slate-600">Title</th>
              <th className="py-2 px-3 font-medium text-slate-600 text-right">Amount</th>
              <th className="py-2 px-3 font-medium text-slate-600">Due date</th>
              <th className="py-2 px-3 font-medium text-slate-600">Status</th>
              <th className="py-2 px-3 font-medium text-slate-600 text-right">Paid</th>
              <th className="py-2 px-3 font-medium text-slate-600 text-right">Outstanding</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => {
              const paid = (inv.payments ?? [])
                .filter(
                  (p) =>
                    p.approvalStatus !== "rejected" &&
                    (p.approvalStatus === "approved" || p.approvalStatus === undefined)
                )
                .reduce((s, p) => s + (p.amount || 0), 0);
              const outstanding = Math.max((inv.amount || 0) - paid, 0);
              const overdue =
                inv.dueDate != null && inv.dueDate < now && outstanding > 0;
              return (
                <tr key={inv.id} className="border-b border-slate-100 last:border-0">
                  <td className="py-2 px-3 text-slate-900">{inv.title}</td>
                  <td className="py-2 px-3 text-right font-medium">
                    {formatMoney(inv.amount || 0, inv.currency || currency)}
                  </td>
                  <td
                    className={`py-2 px-3 whitespace-nowrap ${overdue ? "text-red-700 font-medium" : "text-slate-700"}`}
                  >
                    {inv.dueDate
                      ? new Date(inv.dueDate).toLocaleDateString("en-AU", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : inv.triggeredByStageId
                        ? "On stage trigger"
                        : "—"}
                  </td>
                  <td className="py-2 px-3">
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800">
                      {inv.status}
                      {overdue && inv.status !== "overdue" ? " (overdue)" : ""}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right text-teal tabular-nums">
                    {paid > 0 ? formatMoney(paid, inv.currency || currency) : "—"}
                  </td>
                  <td className="py-2 px-3 text-right">
                    {outstanding > 0
                      ? formatMoney(outstanding, inv.currency || currency)
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FinancialDetailPanel({ row }: { row: RunFinancialRow }) {
  return (
    <div className="space-y-6">
      <div className="text-sm text-slate-600">
        <span className="font-medium text-slate-800">Run:</span> {row.runName}
        <span className="mx-2">·</span>
        <span className="font-medium text-slate-800">Guitar ID:</span> {row.guitar.id}
      </div>

      {row.invoices.length === 0 ? (
        <p className="text-sm text-slate-500 flex items-center gap-2">
          <DollarSign className="w-4 h-4" />
          No invoices on this guitar yet.
          {row.guitar.clientUid ? (
            <>
              {" "}
              <Link
                href={`/guitars/${row.guitar.id}?addInvoice=1#finance`}
                className="text-teal hover:underline"
              >
                Add invoice reminder
              </Link>
            </>
          ) : (
            " Assign a client before adding invoices."
          )}
        </p>
      ) : (
        <InvoicesOnFileTable invoices={row.invoices} currency={row.currency} />
      )}

      {row.paymentLines.length === 0 ? (
        row.invoiceCount > 0 && (
          <p className="text-sm text-slate-500">No payments recorded yet.</p>
        )
      ) : (
        <div>
          <h4 className="text-sm font-semibold text-slate-800 mb-3">
            Payment history ({row.paymentLines.length})
          </h4>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-left">
                  <th className="py-2 px-3 font-medium text-slate-600">Date</th>
                  <th className="py-2 px-3 font-medium text-slate-600 text-right">Amount</th>
                  <th className="py-2 px-3 font-medium text-slate-600">Method</th>
                  <th className="py-2 px-3 font-medium text-slate-600">Receipt #</th>
                  <th className="py-2 px-3 font-medium text-slate-600">Status</th>
                  <th className="py-2 px-3 font-medium text-slate-600">Invoice</th>
                  <th className="py-2 px-3 font-medium text-slate-600">Note</th>
                </tr>
              </thead>
              <tbody>
                {row.paymentLines.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 px-3 text-slate-900 whitespace-nowrap">
                      {new Date(p.paidAt).toLocaleDateString("en-AU", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-2 px-3 text-right font-medium">
                      {formatMoney(p.amount, p.currency || row.currency)}
                    </td>
                    <td className="py-2 px-3">{p.method || "—"}</td>
                    <td className="py-2 px-3 text-slate-700">{p.receiptNumber || "—"}</td>
                    <td className="py-2 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${paymentStatusClass(p.approvalStatus)}`}
                      >
                        {paymentStatusLabel(p.approvalStatus)}
                      </span>
                    </td>
                    <td className="py-2 px-3">{p.invoiceTitle}</td>
                    <td className="py-2 px-3 text-slate-500 text-xs">{p.note || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
