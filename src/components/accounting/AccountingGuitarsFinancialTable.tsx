"use client";

import { useEffect, useMemo, useState } from "react";
import { subscribeAllGuitars, subscribeRunStages } from "@/lib/firestore";
import { fetchClientProfilesBatch, fetchInvoicesForGuitarIds } from "@/lib/firestoreRunFinancials";
import { buildRunFinancialRow } from "@/lib/runFinancialReport";
import { GuitarsFinancialTable } from "@/components/financial/GuitarsFinancialTable";
import type { GuitarBuild, Run, RunStage } from "@/types/guitars";

interface AccountingGuitarsFinancialTableProps {
  runs: Run[];
  runFilter: string;
  onRunFilterChange: (runId: string) => void;
}

export function AccountingGuitarsFinancialTable({
  runs,
  runFilter,
  onRunFilterChange,
}: AccountingGuitarsFinancialTableProps) {
  const [guitars, setGuitars] = useState<GuitarBuild[]>([]);
  const [stagesByRun, setStagesByRun] = useState<Record<string, RunStage[]>>({});
  const [rows, setRows] = useState<ReturnType<typeof buildRunFinancialRow>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const runNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const run of runs) {
      map.set(run.id, run.name);
    }
    return map;
  }, [runs]);

  useEffect(() => {
    const unsub = subscribeAllGuitars(setGuitars, false);
    return () => unsub();
  }, []);

  useEffect(() => {
    const runIds = [...new Set(guitars.map((g) => g.runId))];
    if (runIds.length === 0) {
      setStagesByRun({});
      return;
    }
    const unsubs = runIds.map((runId) =>
      subscribeRunStages(runId, (stages) => {
        setStagesByRun((prev) => ({ ...prev, [runId]: stages }));
      })
    );
    return () => unsubs.forEach((u) => u());
  }, [guitars.map((g) => g.runId).join(",")]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const filteredGuitars =
          runFilter === "all" ? guitars : guitars.filter((g) => g.runId === runFilter);

        const guitarIds = filteredGuitars.map((g) => g.id);
        const clientUids = filteredGuitars
          .map((g) => g.clientUid)
          .filter((uid): uid is string => !!uid);

        const [invoicesByGuitar, profiles] = await Promise.all([
          fetchInvoicesForGuitarIds(guitarIds),
          fetchClientProfilesBatch(clientUids),
        ]);

        const built = filteredGuitars.map((guitar) => {
          const invoices = invoicesByGuitar.get(guitar.id) ?? [];
          const stages = stagesByRun[guitar.runId] ?? [];
          const stageLabel = stages.find((s) => s.id === guitar.stageId)?.label ?? "—";
          const runName = runNameById.get(guitar.runId) ?? "Unknown run";

          let clientLabel = guitar.customerName?.trim() || "—";
          let clientEmail = guitar.customerEmail?.trim() || null;
          if (guitar.clientUid) {
            const profile = profiles.get(guitar.clientUid);
            if (profile?.displayName) clientLabel = profile.displayName;
          }
          if (!guitar.clientUid) {
            clientLabel = "—";
          } else if (clientLabel === "—") {
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

        built.sort((a, b) => {
          const runCmp = a.runName.localeCompare(b.runName);
          if (runCmp !== 0) return runCmp;
          return (a.guitar.orderNumber || "").localeCompare(b.guitar.orderNumber || "", undefined, {
            numeric: true,
          });
        });

        if (!cancelled) setRows(built);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load guitar financials");
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
  }, [guitars, stagesByRun, runFilter, runNameById]);

  const activeRuns = useMemo(
    () => runs.filter((r) => !r.archived).sort((a, b) => a.name.localeCompare(b.name)),
    [runs]
  );

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-gray-700">Filter by run</label>
        <select
          value={runFilter}
          onChange={(e) => onRunFilterChange(e.target.value)}
          className="h-10 px-3 border border-gray-300 rounded-lg text-sm bg-white min-w-[200px]"
        >
          <option value="all">All runs ({activeRuns.length})</option>
          {activeRuns.map((run) => (
            <option key={run.id} value={run.id}>
              {run.name}
            </option>
          ))}
        </select>
        <p className="text-sm text-gray-500">
          Every guitar is listed, including builds with no price or invoices yet.
        </p>
      </div>

      <GuitarsFinancialTable
        rows={rows}
        loading={loading}
        showRunColumn={runFilter === "all"}
        search={search}
        onSearchChange={setSearch}
        emptyMessage="No guitars in this run yet."
        csvFileName="accounting-all-guitars"
      />
    </div>
  );
}
