"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getRun, subscribeRunStages, getGuitarNotes, syncPublicGuitarProfile } from "@/lib/firestore";
import { formatGuitarSpecsReport } from "@/lib/guitarSpecsReport";
import { GuitarDetailModal } from "@/components/guitars/GuitarDetailModal";
import { BulkGuitarUpdateModal } from "@/components/guitars/BulkGuitarUpdateModal";
import { useUnreadGuitarNotifications } from "@/hooks/useUnreadGuitarNotifications";
import type { GuitarBuild, Run, RunStage } from "@/types/guitars";
import { GuitarPhoto } from "@/components/shared/GuitarPhoto";
import { Guitar, Search, X, Package, User, Hash, Grid, Table, Copy, Check, FileText, MessageSquare } from "lucide-react";

export default function GuitarsPage() {
  const { currentUser, userRole, loading } = useAuth();
  const router = useRouter();
  const [guitars, setGuitars] = useState<GuitarBuild[]>([]);
  const [loadingGuitars, setLoadingGuitars] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [selectedGuitar, setSelectedGuitar] = useState<GuitarBuild | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [buildingReport, setBuildingReport] = useState(false);
  const [reportCopied, setReportCopied] = useState(false);
  const [bulkUpdateOpen, setBulkUpdateOpen] = useState(false);
  const [runs, setRuns] = useState<Map<string, Run>>(new Map());
  const [stages, setStages] = useState<Map<string, RunStage[]>>(new Map());
  const { byGuitarId: unreadByGuitarId } = useUnreadGuitarNotifications();
  const canRunSpecsReport =
    userRole === "staff" || userRole === "admin" || userRole === "factory";

  const selectedGuitars = guitars.filter((g) => selectedIds.has(g.id));

  useEffect(() => {
    if (loading) return;

    if (!currentUser) {
      router.push("/login");
      return;
    }

    // Only staff, admin, factory, and accounting can access
    if (userRole !== "staff" && userRole !== "admin" && userRole !== "factory" && userRole !== "accounting") {
      router.push("/");
      return;
    }
  }, [currentUser, userRole, loading, router]);

  // Load all guitars
  useEffect(() => {
    if (!currentUser || (userRole !== "staff" && userRole !== "admin" && userRole !== "factory" && userRole !== "accounting")) return;

    const guitarsRef = collection(db, "guitars");
    const q = query(guitarsRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedGuitars = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as GuitarBuild[];
      
      // Filter out archived guitars
      const activeGuitars = loadedGuitars.filter((g) => !g.archived);
      setGuitars(activeGuitars);
      setLoadingGuitars(false);

      // Load run information for all guitars
      const uniqueRunIds = [...new Set(activeGuitars.map((g) => g.runId))];
      uniqueRunIds.forEach(async (runId) => {
        if (!runs.has(runId)) {
          const run = await getRun(runId);
          if (run) {
            setRuns((prev) => new Map(prev).set(runId, run));
          }
        }
      });
    });

    return () => unsubscribe();
  }, [currentUser, userRole, runs]);

  // Load stages for all runs
  useEffect(() => {
    if (runs.size === 0) return;

    const unsubscribes: (() => void)[] = [];
    const stagesMap = new Map<string, RunStage[]>();

    runs.forEach((run) => {
      const unsubscribe = subscribeRunStages(run.id, (loadedStages) => {
        stagesMap.set(run.id, loadedStages);
        setStages(new Map(stagesMap));
      });
      unsubscribes.push(unsubscribe);
    });

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [runs]);

  // Filter guitars by search term
  const filteredGuitars = guitars.filter((guitar) => {
    if (!searchTerm.trim()) return true;

    const search = searchTerm.toLowerCase();
    const run = runs.get(guitar.runId);
    const runStages = stages.get(guitar.runId) || [];
    const currentStage = runStages.find((s) => s.id === guitar.stageId);

    // Search in multiple fields
    return (
      guitar.model?.toLowerCase().includes(search) ||
      guitar.finish?.toLowerCase().includes(search) ||
      guitar.orderNumber?.toLowerCase().includes(search) ||
      guitar.serial?.toLowerCase().includes(search) ||
      guitar.customerName?.toLowerCase().includes(search) ||
      guitar.customerEmail?.toLowerCase().includes(search) ||
      run?.name?.toLowerCase().includes(search) ||
      currentStage?.label?.toLowerCase().includes(search) ||
      guitar.specs?.bodyWood?.toLowerCase().includes(search) ||
      guitar.specs?.topWood?.toLowerCase().includes(search) ||
      guitar.specs?.pickups?.toLowerCase().includes(search) ||
      guitar.specs?.finishColor?.toLowerCase().includes(search) ||
      guitar.specs?.customNotes?.toLowerCase().includes(search)
    );
  });

  const toggleSelected = (guitarId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(guitarId)) next.delete(guitarId);
      else next.add(guitarId);
      return next;
    });
    setReportCopied(false);
  };

  const selectAllFiltered = () => {
    setSelectedIds(new Set(filteredGuitars.map((g) => g.id)));
    setReportCopied(false);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setReportCopied(false);
  };

  const handleCopyReport = async () => {
    if (!canRunSpecsReport || selectedIds.size === 0 || buildingReport) return;

    setBuildingReport(true);
    setReportCopied(false);
    try {
      const selectedInOrder = filteredGuitars.filter((g) => selectedIds.has(g.id));
      // Also include selected guitars that fell out of the current filter
      const filteredIds = new Set(selectedInOrder.map((g) => g.id));
      const extras = guitars.filter((g) => selectedIds.has(g.id) && !filteredIds.has(g.id));
      const ordered = [...selectedInOrder, ...extras];

      const publicBaseUrl =
        typeof window !== "undefined" ? window.location.origin : undefined;

      const items = await Promise.all(
        ordered.map(async (guitar) => {
          const run = runs.get(guitar.runId);
          const runStages = stages.get(guitar.runId) || [];
          const currentStage = runStages.find((s) => s.id === guitar.stageId);
          const notes = await getGuitarNotes(guitar.id);
          // Publish cover for the stable public profile URL used in Claude reports
          if (guitar.coverPhotoUrl) {
            await syncPublicGuitarProfile(guitar.id, guitar.coverPhotoUrl).catch(() => {});
          }
          return {
            guitar,
            runName: run?.name,
            stageLabel: currentStage?.label,
            notes,
            publicBaseUrl,
          };
        })
      );

      const markdown = formatGuitarSpecsReport(items);
      await navigator.clipboard.writeText(markdown);
      setReportCopied(true);
      setTimeout(() => setReportCopied(false), 2500);
    } catch (error) {
      console.error("Failed to build specs report:", error);
      alert("Failed to copy specs report. Please try again.");
    } finally {
      setBuildingReport(false);
    }
  };

  if (loading || loadingGuitars) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-lg">Loading guitars...</div>
        </div>
      </AppLayout>
    );
  }

  if (!currentUser || (userRole !== "staff" && userRole !== "admin" && userRole !== "factory" && userRole !== "accounting")) {
    return null;
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-5">
        <div>
          <h1 className="wo-heading text-[32px] sm:text-[40px] leading-none">All guitars</h1>
          <p className="font-mono text-[11px] uppercase tracking-wider text-text-muted mt-1.5">
            Search by model, finish, order number, customer, run, or specs
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search guitars…"
              className="wo-input pl-9 pr-10"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex gap-0 border border-border bg-surface shrink-0">
            <button
              type="button"
              onClick={() => setViewMode("card")}
              className={`p-2.5 min-h-[40px] min-w-[40px] transition-colors ${
                viewMode === "card"
                  ? "bg-accent text-accent-foreground"
                  : "text-text-muted hover:bg-surface-alt"
              }`}
              title="Card view"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`p-2.5 min-h-[40px] min-w-[40px] border-l border-border transition-colors ${
                viewMode === "table"
                  ? "bg-accent text-accent-foreground"
                  : "text-text-muted hover:bg-surface-alt"
              }`}
              title="Table view"
            >
              <Table className="w-4 h-4" />
            </button>
          </div>
        </div>

        {searchTerm && (
          <p className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
            Found {filteredGuitars.length} guitar{filteredGuitars.length !== 1 ? "s" : ""}
          </p>
        )}

        {canRunSpecsReport && selectedIds.size > 0 && (
          <div className="sticky top-3 z-20 border border-border bg-surface px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
            <p className="text-sm text-text font-semibold flex-1">
              {selectedIds.size} guitar{selectedIds.size === 1 ? "" : "s"} selected
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={selectAllFiltered}
                className="wo-btn-outline"
              >
                Select all{searchTerm ? " filtered" : ""}
              </button>
              <button
                type="button"
                onClick={clearSelection}
                className="wo-btn-outline"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setBulkUpdateOpen(true)}
                className="wo-btn-outline border-sidebar text-text"
              >
                <MessageSquare className="w-4 h-4" />
                Bulk update
              </button>
              <button
                type="button"
                onClick={handleCopyReport}
                disabled={buildingReport}
                className="wo-btn-primary"
              >
                {buildingReport ? (
                  <>
                    <FileText className="w-4 h-4 animate-pulse" />
                    Building report…
                  </>
                ) : reportCopied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy specs report
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {filteredGuitars.length === 0 ? (
          <div className="text-center py-12 border border-border bg-surface">
            <Guitar className="w-10 h-10 text-text-muted mx-auto mb-3" />
            <p className="text-text-muted">
              {searchTerm ? "No guitars found matching your search" : "No guitars found"}
            </p>
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="mt-3 text-sm font-semibold text-sidebar hover:underline"
              >
                Clear search
              </button>
            )}
          </div>
        ) : viewMode === "card" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredGuitars.map((guitar) => {
              const run = runs.get(guitar.runId);
              const runStages = stages.get(guitar.runId) || [];
              const currentStage = runStages.find((s) => s.id === guitar.stageId);
              const isChecked = selectedIds.has(guitar.id);

              return (
                <div
                  key={guitar.id}
                  className={`border bg-surface text-left relative ${
                    isChecked ? "border-accent border-l-4" : "border-border"
                  }`}
                >
                  {canRunSpecsReport && (
                    <label
                      className="absolute top-2 left-2 z-10 flex items-center justify-center w-8 h-8 bg-surface border border-border cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelected(guitar.id)}
                        className="border-border text-sidebar focus:ring-accent"
                        aria-label={`Select ${guitar.model}`}
                      />
                    </label>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      // For accounting users, navigate to full-page view
                      if (userRole === "accounting") {
                        router.push(`/guitars/${guitar.id}`);
                      } else {
                        setSelectedGuitar(guitar);
                      }
                    }}
                    className="w-full text-left"
                  >
                  {(unreadByGuitarId[guitar.id] ?? 0) > 0 && (
                    <span className="absolute top-2 right-2 z-10 min-w-[20px] h-5 px-1.5 flex items-center justify-center bg-accent text-accent-foreground text-[10px] font-bold font-mono">
                      {unreadByGuitarId[guitar.id]! > 99 ? "99+" : unreadByGuitarId[guitar.id]}
                    </span>
                  )}
                  <GuitarPhoto
                    src={guitar.coverPhotoUrl}
                    alt={guitar.model}
                    size="card"
                    fit="contain"
                    className="border-0 border-b border-border mb-0"
                  />

                  <div className="p-3 space-y-2">
                    <div>
                      <h3 className="font-display text-lg font-bold uppercase tracking-wide text-text leading-tight">
                        {guitar.model}
                      </h3>
                      <p className="text-sm text-text-muted">{guitar.finish}</p>
                    </div>

                    <div className="flex flex-wrap gap-2 font-mono text-[11px] text-text-muted">
                      {guitar.orderNumber && (
                        <div className="flex items-center gap-1">
                          <Hash className="w-3.5 h-3.5" />
                          <span>{guitar.orderNumber}</span>
                        </div>
                      )}
                      {guitar.serial && (
                        <div className="flex items-center gap-1">
                          <Hash className="w-3.5 h-3.5" />
                          <span>SN: {guitar.serial}</span>
                        </div>
                      )}
                    </div>

                    {run && (
                      <div className="flex items-center gap-2 text-sm text-text-muted">
                        <Package className="w-3.5 h-3.5" />
                        <span className="truncate">{run.name}</span>
                      </div>
                    )}

                    {currentStage && (
                      <span className="wo-badge-dark">{currentStage.label}</span>
                    )}

                    {guitar.customerName && (
                      <div className="flex items-center gap-2 text-sm text-text-muted">
                        <User className="w-3.5 h-3.5" />
                        <span className="truncate">{guitar.customerName}</span>
                      </div>
                    )}

                    {guitar.specs && (
                      <div className="pt-2 border-t border-border-soft text-xs text-text-muted space-y-0.5">
                        {guitar.specs.bodyWood && (
                          <div>Body: {guitar.specs.bodyWood}</div>
                        )}
                        {guitar.specs.topWood && (
                          <div>Top: {guitar.specs.topWood}</div>
                        )}
                        {guitar.specs.pickups && (
                          <div>Pickups: {guitar.specs.pickups}</div>
                        )}
                        {guitar.specs.finishColor && (
                          <div>Color: {guitar.specs.finishColor}</div>
                        )}
                      </div>
                    )}
                  </div>
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="border border-border bg-surface overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-alt border-b border-border">
                  <tr>
                    {canRunSpecsReport && (
                      <th className="px-3 py-2.5 text-left wo-label w-10">
                        <span className="sr-only">Select</span>
                      </th>
                    )}
                    <th className="px-3 py-2.5 text-left wo-label">Image</th>
                    <th className="px-3 py-2.5 text-left wo-label">Model</th>
                    <th className="px-3 py-2.5 text-left wo-label">Finish</th>
                    <th className="px-3 py-2.5 text-left wo-label">Order #</th>
                    <th className="px-3 py-2.5 text-left wo-label">Serial</th>
                    <th className="px-3 py-2.5 text-left wo-label">Run</th>
                    <th className="px-3 py-2.5 text-left wo-label">Stage</th>
                    <th className="px-3 py-2.5 text-left wo-label">Customer</th>
                    <th className="px-3 py-2.5 text-left wo-label">Specs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-soft">
                  {filteredGuitars.map((guitar) => {
                    const run = runs.get(guitar.runId);
                    const runStages = stages.get(guitar.runId) || [];
                    const currentStage = runStages.find((s) => s.id === guitar.stageId);
                    const isChecked = selectedIds.has(guitar.id);

                    return (
                      <tr
                        key={guitar.id}
                        onClick={() => {
                          // For accounting users, navigate to full-page view
                          if (userRole === "accounting") {
                            router.push(`/guitars/${guitar.id}`);
                          } else {
                            setSelectedGuitar(guitar);
                          }
                        }}
                        className={`hover:bg-surface-alt cursor-pointer transition-colors ${
                          isChecked ? "bg-accent/15" : ""
                        }`}
                      >
                        {canRunSpecsReport && (
                          <td
                            className="px-3 py-2 whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleSelected(guitar.id)}
                              className="border-border text-sidebar focus:ring-accent"
                              aria-label={`Select ${guitar.model}`}
                            />
                          </td>
                        )}
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="relative inline-block">
                            {(unreadByGuitarId[guitar.id] ?? 0) > 0 && (
                              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 flex items-center justify-center bg-accent text-accent-foreground text-[10px] font-bold font-mono z-10">
                                {unreadByGuitarId[guitar.id]! > 99 ? "99+" : unreadByGuitarId[guitar.id]}
                              </span>
                            )}
                            <GuitarPhoto
                              src={guitar.coverPhotoUrl}
                              alt={guitar.model}
                              size="thumb"
                              fit="contain"
                            />
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="font-semibold text-text">{guitar.model}</div>
                        </td>
                        <td className="px-3 py-2 text-text-muted text-sm">{guitar.finish}</td>
                        <td className="px-3 py-2 text-text-muted text-sm font-mono tabular-nums">{guitar.orderNumber || "—"}</td>
                        <td className="px-3 py-2 text-text-muted text-sm font-mono">{guitar.serial || "—"}</td>
                        <td className="px-3 py-2">
                          {run ? (
                            <div className="flex items-center gap-1 text-text-muted text-sm">
                              <Package className="w-3.5 h-3.5" />
                              <span>{run.name}</span>
                            </div>
                          ) : (
                            <span className="text-text-muted">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {currentStage ? (
                            <span className="wo-badge-dark">{currentStage.label}</span>
                          ) : (
                            <span className="text-text-muted">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {guitar.customerName ? (
                            <div className="flex items-center gap-1 text-text-muted text-sm">
                              <User className="w-3.5 h-3.5" />
                              <span>{guitar.customerName}</span>
                            </div>
                          ) : (
                            <span className="text-text-muted">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {guitar.specs && (
                            <div className="text-xs text-text-muted space-y-0.5 max-w-[180px]">
                              {guitar.specs.bodyWood && <div>Body: {guitar.specs.bodyWood}</div>}
                              {guitar.specs.topWood && <div>Top: {guitar.specs.topWood}</div>}
                              {guitar.specs.pickups && <div>Pickups: {guitar.specs.pickups}</div>}
                              {guitar.specs.finishColor && <div>Color: {guitar.specs.finishColor}</div>}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Guitar Detail Modal */}
        {selectedGuitar && (
          <GuitarDetailModal
            guitar={selectedGuitar}
            isOpen={true}
            onClose={() => setSelectedGuitar(null)}
          />
        )}

        {canRunSpecsReport && (
          <BulkGuitarUpdateModal
            isOpen={bulkUpdateOpen}
            onClose={() => setBulkUpdateOpen(false)}
            guitars={selectedGuitars}
            onSuccess={() => {
              clearSelection();
            }}
          />
        )}
      </div>
    </AppLayout>
  );
}

