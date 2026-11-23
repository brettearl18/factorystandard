"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeGuitarsForRun, subscribeRunStages, getRun } from "@/lib/firestore";
import { isAccountingRunsView } from "@/lib/runFinancialAccess";
import { fetchClientProfilesBatch, fetchInvoicesForGuitarIds } from "@/lib/firestoreRunFinancials";
import { buildRunFinancialRow } from "@/lib/runFinancialReport";
import { GuitarsFinancialTable } from "@/components/financial/GuitarsFinancialTable";
import type { GuitarBuild, Run, RunStage } from "@/types/guitars";
import { ArrowLeft, AlertCircle, LayoutGrid } from "lucide-react";
import type { RunFinancialRow } from "@/lib/runFinancialReport";

interface RunFinancialReportProps {
  runId: string;
}

export function RunFinancialReport({ runId }: RunFinancialReportProps) {
  const { userRole } = useAuth();
  const accountingView = isAccountingRunsView(userRole);
  const backHref = accountingView ? "/runs" : `/runs/${runId}/board`;
  const backLabel = accountingView ? "All run reports" : "Run board";

  const [run, setRun] = useState<Run | null>(null);
  const [guitars, setGuitars] = useState<GuitarBuild[]>([]);
  const [stages, setStages] = useState<RunStage[]>([]);
  const [rows, setRows] = useState<RunFinancialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    getRun(runId).then(setRun);
  }, [runId]);

  useEffect(() => {
    const unsubGuitars = subscribeGuitarsForRun(runId, setGuitars);
    const unsubStages = subscribeRunStages(runId, setStages);
    return () => {
      unsubGuitars();
      unsubStages();
    };
  }, [runId]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const guitarIds = guitars.map((g) => g.id);
        const clientUids = guitars.map((g) => g.clientUid).filter((uid): uid is string => !!uid);

        const [invoicesByGuitar, profiles] = await Promise.all([
          fetchInvoicesForGuitarIds(guitarIds),
          fetchClientProfilesBatch(clientUids),
        ]);

        const stageById = new Map(stages.map((s) => [s.id, s.label]));
        const runName = run?.name ?? "Run";

        const built = guitars.map((guitar) => {
          const invoices = invoicesByGuitar.get(guitar.id) ?? [];
          const stageLabel = stageById.get(guitar.stageId) ?? "—";
          let clientLabel = guitar.customerName?.trim() || "—";
          let clientEmail = guitar.customerEmail?.trim() || null;
          if (guitar.clientUid) {
            const profile = profiles.get(guitar.clientUid);
            if (profile?.displayName) clientLabel = profile.displayName;
          }
          if (!guitar.clientUid) {
            clientLabel = "—";
          } else if (clientLabel === "—" && guitar.clientUid) {
            clientLabel = guitar.clientUid.slice(0, 8) + "…";
          }
          return buildRunFinancialRow(
            guitar,
            invoices,
            stageLabel,
            clientLabel,
            clientEmail,
            runName
          );
        });

        built.sort((a, b) =>
          (a.guitar.orderNumber || "").localeCompare(b.guitar.orderNumber || "", undefined, {
            numeric: true,
          })
        );

        if (!cancelled) setRows(built);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load financial data");
          setRows([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [guitars, stages, run?.name]);

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <Link
            href={backHref}
            className="mt-0.5 p-2 rounded-2xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            title={backLabel}
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-slate-900">Run financial report</h1>
            <p className="text-sm text-slate-500 mt-0.5 truncate">{run?.name ?? "Loading run…"}</p>
          </div>
        </div>
        {!accountingView && (
          <Link
            href={`/runs/${runId}/board`}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <LayoutGrid className="w-4 h-4" />
            Run board
          </Link>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 text-red-800 px-4 py-3 flex gap-2 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      <p className="text-sm text-slate-600">
        Every guitar in this run is listed below, including builds with no price or invoices yet.
        Expand a row for invoice due dates and payment history.
      </p>

      <GuitarsFinancialTable
        rows={rows}
        loading={loading}
        showRunColumn={false}
        search={search}
        onSearchChange={setSearch}
        emptyMessage="No guitars in this run yet."
        csvFileName={run?.name ?? runId}
      />
    </div>
  );
}
