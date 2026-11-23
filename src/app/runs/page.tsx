"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { useRuns } from "@/hooks/useRuns";
import { useAllGuitars } from "@/hooks/useAllGuitars";
import { archiveRun, unarchiveRun } from "@/lib/firestore";
import { EditRunModal } from "@/components/runs/EditRunModal";
import { Plus, Archive, ArchiveRestore, Edit, Image as ImageIcon, DollarSign, Guitar } from "lucide-react";
import type { Run, GuitarBuild } from "@/types/guitars";
import {
  canViewRunFinancials,
  isAccountingRunsView,
} from "@/lib/runFinancialAccess";
import { computeRunGuitarTotals, formatMoneyCompactOrDash } from "@/lib/runFinancialReport";

export default function RunsPage() {
  const { currentUser, userRole, loading } = useAuth();
  const router = useRouter();
  const runs = useRuns();
  const accountingView = isAccountingRunsView(userRole);
  const canManageRuns = userRole === "staff" || userRole === "admin";
  const { guitars: allGuitars, loading: loadingGuitars } = useAllGuitars(
    Boolean(currentUser && (canManageRuns || accountingView))
  );
  const guitarsByRun = useMemo(() => {
    const map = new Map<string, GuitarBuild[]>();
    for (const guitar of allGuitars) {
      const existing = map.get(guitar.runId) ?? [];
      existing.push(guitar);
      map.set(guitar.runId, existing);
    }
    return map;
  }, [allGuitars]);
  const [showArchived, setShowArchived] = useState(false);
  const [archiving, setArchiving] = useState<string | null>(null);
  const [editingRun, setEditingRun] = useState<Run | null>(null);

  useEffect(() => {
    if (loading) return;

    if (!currentUser) {
      router.push("/login");
      return;
    }

    if (!canViewRunFinancials(userRole) && !canManageRuns) {
      router.push("/my-guitars");
      return;
    }
  }, [currentUser, userRole, loading, router, canManageRuns]);

  if (loading || loadingGuitars) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!currentUser || (!canManageRuns && !accountingView)) {
    return null;
  }

  const runHref = (runId: string) =>
    accountingView ? `/runs/${runId}/financials` : `/runs/${runId}/board`;

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            {accountingView ? "Run financial reports" : "Runs"}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {accountingView
              ? "Open a run to see every guitar, invoice totals, payments, and balances."
              : "Production batches — open a board or review run totals."}
          </p>
        </div>
        {canManageRuns && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowArchived(!showArchived)}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              {showArchived ? (
                <>
                  <ArchiveRestore className="w-4 h-4" />
                  Show active
                </>
              ) : (
                <>
                  <Archive className="w-4 h-4" />
                  Show archived
                </>
              )}
            </button>
            <Link
              href="/runs/new"
              className="inline-flex items-center gap-2 rounded-2xl bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-light transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create run
            </Link>
          </div>
        )}
      </div>

      {runs.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-12 text-center">
          <p className="text-slate-500 mb-4">
            {showArchived ? "No archived runs." : "No runs yet."}
          </p>
          {!showArchived && canManageRuns && (
            <Link
              href="/runs/new"
              className="inline-flex items-center gap-2 rounded-2xl bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-light transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create your first run
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {runs
            .filter((run) => showArchived ? run.archived : !run.archived)
            .map((run) => {
            const runGuitars = guitarsByRun.get(run.id) ?? [];
            const runTotals = computeRunGuitarTotals(runGuitars);
            const valueLabel =
              runTotals.pricedCount === 0
                ? "—"
                : formatMoneyCompactOrDash(runTotals.totalValue, runTotals.currency);

            return (
            <div
              key={run.id}
              className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow"
            >
              {run.thumbnailUrl ? (
                <Link
                  href={runHref(run.id)}
                  className="block w-full h-44 bg-slate-100 overflow-hidden"
                >
                  <img
                    src={run.thumbnailUrl}
                    alt={run.name}
                    className="w-full h-full object-cover"
                  />
                </Link>
              ) : (
                <Link
                  href={runHref(run.id)}
                  className="block w-full h-44 bg-slate-100 flex items-center justify-center"
                >
                  <ImageIcon className="w-10 h-10 text-slate-400" />
                </Link>
              )}

              <div className="p-5">
                <Link href={runHref(run.id)} className="block">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="text-lg font-semibold text-slate-900 leading-snug">{run.name}</h3>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {run.archived && (
                        <span className="rounded-xl bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                          Archived
                        </span>
                      )}
                      <span
                        className={`rounded-xl px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                          run.isActive
                            ? "bg-accent/10 text-accent"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {run.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm text-slate-500 space-y-1">
                    <p>Factory: {run.factory}</p>
                    <p>Started: {new Date(run.startsAt).toLocaleDateString()}</p>
                    <p className="flex items-center gap-1.5 text-slate-700">
                      <Guitar className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                      <span>
                        {runTotals.count} guitar{runTotals.count !== 1 ? "s" : ""}
                      </span>
                    </p>
                    <p className="flex items-center gap-1.5 text-slate-700">
                      <DollarSign className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                      <span className="tabular-nums">
                        Total value: {valueLabel}
                        {runTotals.pricedCount > 0 && runTotals.pricedCount < runTotals.count && (
                          <span className="text-slate-400">
                            {" "}
                            ({runTotals.count - runTotals.pricedCount} unpriced)
                          </span>
                        )}
                      </span>
                    </p>
                    {run.endsAt && (
                      <p>Ended: {new Date(run.endsAt).toLocaleDateString()}</p>
                    )}
                    {run.archivedAt && (
                      <p className="text-slate-400">
                        Archived: {new Date(run.archivedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    {accountingView ? (
                      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-teal">
                        <DollarSign className="w-4 h-4" />
                        Open financial report →
                      </span>
                    ) : (
                      <span className="text-sm font-medium text-accent hover:text-accent-light">
                        View board →
                      </span>
                    )}
                  </div>
                </Link>
                {canManageRuns && (
                  <div className="mt-3 pt-3 border-t border-slate-200 flex gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setEditingRun(run);
                      }}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (archiving === run.id) return;
                        setArchiving(run.id);
                        try {
                          if (run.archived) {
                            await unarchiveRun(run.id);
                          } else {
                            await archiveRun(run.id);
                          }
                        } catch (error) {
                          console.error("Error archiving run:", error);
                          alert("Failed to archive run. Please try again.");
                        } finally {
                          setArchiving(null);
                        }
                      }}
                      disabled={archiving === run.id}
                      className={`flex-1 inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                        run.archived
                          ? "border border-teal/30 bg-teal/5 text-teal hover:bg-teal/10"
                          : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {archiving === run.id ? (
                        "Processing..."
                      ) : run.archived ? (
                        <>
                          <ArchiveRestore className="w-4 h-4" />
                          Unarchive
                        </>
                      ) : (
                        <>
                          <Archive className="w-4 h-4" />
                          Archive
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* Edit Run Modal */}
      {editingRun && (
        <EditRunModal
          run={editingRun}
          isOpen={!!editingRun}
          onClose={() => setEditingRun(null)}
          onSuccess={() => {
            setEditingRun(null);
            // Runs will automatically refresh via subscription
          }}
        />
      )}
      </div>
    </AppLayout>
  );
}
