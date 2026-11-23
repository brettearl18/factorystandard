"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { subscribeRuns, subscribeRunStages } from "@/lib/firestore";
import { useBranding } from "@/hooks/useBranding";
import { useAllGuitars } from "@/hooks/useAllGuitars";
import {
  Guitar,
  Package,
  TrendingUp,
  Clock,
  ArrowRight,
  Activity,
  CheckCircle,
  Circle,
  Image as ImageIcon,
  Sparkles,
  DollarSign,
} from "lucide-react";
import type { Run, RunStage, GuitarBuild } from "@/types/guitars";
import { computeRunGuitarTotals, formatMoneyCompactOrDash } from "@/lib/runFinancialReport";

export default function DashboardPage() {
  const { currentUser, userRole, loading } = useAuth();
  const router = useRouter();
  const branding = useBranding();
  const [runs, setRuns] = useState<Run[]>([]);
  const canLoadDashboard = Boolean(
    currentUser && (userRole === "staff" || userRole === "admin")
  );
  const { guitars: allGuitars, loading: loadingGuitars } = useAllGuitars(canLoadDashboard);
  const [runStagesMap, setRunStagesMap] = useState<Map<string, RunStage[]>>(new Map());
  const loadingData = loadingGuitars;

  useEffect(() => {
    if (loading) return;

    if (!currentUser) {
      router.push("/login");
      return;
    }

    if (userRole !== "staff" && userRole !== "admin") {
      router.push("/");
      return;
    }
  }, [currentUser, userRole, loading, router]);

  // Load all runs
  useEffect(() => {
    if (!currentUser || (userRole !== "staff" && userRole !== "admin")) return;

    const unsubscribeRuns = subscribeRuns((loadedRuns) => {
      setRuns(loadedRuns);
    });

    return () => unsubscribeRuns();
  }, [currentUser, userRole]);

  // Load stages for all runs
  useEffect(() => {
    if (runs.length === 0) return;

    const stagesMap = new Map<string, RunStage[]>();
    const unsubscribes: (() => void)[] = [];

    runs.forEach((run) => {
      const unsubscribe = subscribeRunStages(run.id, (stages) => {
        stagesMap.set(run.id, stages);
        setRunStagesMap(new Map(stagesMap));
      });
      unsubscribes.push(unsubscribe);
    });

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [runs]);

  if (loading || loadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    );
  }

  if (!currentUser || (userRole !== "staff" && userRole !== "admin")) {
    return null;
  }

  // Calculate statistics
  const activeRuns = runs.filter((r) => r.isActive).length;
  const totalGuitars = allGuitars.length;
  const guitarsInProgress = allGuitars.filter((g) => {
    const runStages = runStagesMap.get(g.runId) || [];
    const stage = runStages.find((s) => s.id === g.stageId);
    const lastStage = runStages.sort((a, b) => b.order - a.order)[0];
    return stage?.id !== lastStage?.id;
  }).length;
  const guitarsCompleted = totalGuitars - guitarsInProgress;
  const allRunTotals = computeRunGuitarTotals(allGuitars);
  const totalValueLabel =
    allRunTotals.pricedCount === 0
      ? "—"
      : formatMoneyCompactOrDash(allRunTotals.totalValue, allRunTotals.currency);

  // Get recent guitars (last 10)
  const recentGuitars = allGuitars.slice(0, 10);

  const statCards: {
    label: string;
    value: string | number;
    icon: typeof Guitar;
    iconBg: string;
  }[] = [
    {
      label: "Total Guitars",
      value: totalGuitars,
      icon: Guitar,
      iconBg: "bg-shell text-primary",
    },
    {
      label: "Total Value",
      value: totalValueLabel,
      icon: DollarSign,
      iconBg: "bg-shell text-accentGreen",
    },
    {
      label: "Active Runs",
      value: activeRuns,
      icon: Activity,
      iconBg: "bg-shell text-accentBlue",
    },
    {
      label: "In Progress",
      value: guitarsInProgress,
      icon: Clock,
      iconBg: "bg-shell text-primary",
    },
    {
      label: "Completed",
      value: guitarsCompleted,
      icon: CheckCircle,
      iconBg: "bg-shell text-accentGreen",
    },
  ];

  // Calculate stage distribution
  const stageDistribution = new Map<string, number>();
  allGuitars.forEach((guitar) => {
    const runStages = runStagesMap.get(guitar.runId) || [];
    const stage = runStages.find((s) => s.id === guitar.stageId);
    if (stage) {
      const key = stage.label;
      stageDistribution.set(key, (stageDistribution.get(key) || 0) + 1);
    }
  });

  // Get guitars by run
  const guitarsByRun = new Map<string, GuitarBuild[]>();
  allGuitars.forEach((guitar) => {
    const existing = guitarsByRun.get(guitar.runId) || [];
    guitarsByRun.set(guitar.runId, [...existing, guitar]);
  });

  const statIconWells = [
    { bg: "bg-teal/15", text: "text-teal" },
    { bg: "bg-accent/25", text: "text-accent-foreground" },
    { bg: "bg-surface-alt", text: "text-sidebar" },
    { bg: "bg-accent/15", text: "text-sidebar" },
    { bg: "bg-teal/15", text: "text-teal" },
  ];

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Welcome hero */}
        <div className="border border-border bg-surface overflow-hidden">
          <div className="p-5 lg:p-6 border-l-4 border-accent">
            <p className="wo-label">Control Room</p>
            <h1 className="mt-2 wo-heading text-[32px] lg:text-[40px] leading-none">
              {branding.companyName || "Australian Production"}
            </h1>
            <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-text-muted">
              Production dashboard — real-time tracking and management
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {statCards.map((card, index) => {
            const Icon = card.icon;
            const well = statIconWells[index % statIconWells.length];
            const isMoneyCard = card.label === "Total Value";

            return (
              <div key={card.label} className="stat-card min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="wo-label">{card.label}</div>
                    <div
                      className={`mt-1 font-display font-bold uppercase tabular-nums text-text leading-tight break-words ${
                        isMoneyCard ? "text-2xl" : "text-3xl"
                      }`}
                    >
                      {card.value}
                    </div>
                    {isMoneyCard && allRunTotals.pricedCount > 0 && allRunTotals.pricedCount < allRunTotals.count && (
                      <p className="font-mono text-[10px] uppercase tracking-wider text-text-muted mt-1">
                        {allRunTotals.count - allRunTotals.pricedCount} unpriced
                      </p>
                    )}
                  </div>
                  <div className={`h-10 w-10 shrink-0 border border-border flex items-center justify-center ${well.bg}`}>
                    <Icon className={`h-5 w-5 ${well.text}`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="panel lg:col-span-2 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Runs</p>
                <h2 className="text-xl font-semibold text-slate-900 mt-1">Active Production</h2>
              </div>
              <Link
                href="/runs"
                className="flex items-center gap-2 text-sm font-medium text-accent hover:text-accent-light transition-colors"
              >
                View All <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            {runs.filter((r) => r.isActive).length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <p>No active runs</p>
                <Link href="/runs/new" className="text-accent hover:text-accent-light mt-2 inline-block font-medium">
                  Create your first run
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {runs
                  .filter((r) => r.isActive)
                  .map((run) => {
                    const guitarsInRun = guitarsByRun.get(run.id) || [];
                    const runTotals = computeRunGuitarTotals(guitarsInRun);
                    const runValueLabel =
                      runTotals.pricedCount === 0
                        ? null
                        : formatMoneyCompactOrDash(runTotals.totalValue, runTotals.currency);

                    return (
                      <Link
                        key={run.id}
                        href={`/runs/${run.id}/board`}
                        className="block p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                            {run.thumbnailUrl ? (
                              <img
                                src={run.thumbnailUrl}
                                alt={run.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageIcon className="w-8 h-8 text-slate-400" />
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-slate-900 truncate">{run.name}</h3>
                            <p className="text-sm text-slate-500 mt-1">
                              {guitarsInRun.length} guitar{guitarsInRun.length !== 1 ? "s" : ""}
                              {runValueLabel && (
                                <>
                                  {" · "}
                                  <span className="text-slate-700 tabular-nums">{runValueLabel}</span>
                                </>
                              )}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="px-2 py-1 bg-accent/10 text-accent text-xs font-semibold rounded-xl">
                              Active
                            </span>
                            <ArrowRight className="w-4 h-4 text-slate-400" />
                          </div>
                        </div>
                      </Link>
                    );
                  })}
              </div>
            )}
          </div>

          <div className="panel p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-display">Stage Distribution</h2>
              <span className="text-xs uppercase tracking-[0.3em] text-textMuted">Live</span>
            </div>
            {stageDistribution.size === 0 ? (
              <p className="text-sm text-textMuted">No data available</p>
            ) : (
              <div className="space-y-3">
                {Array.from(stageDistribution.entries())
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 8)
                  .map(([stage, count]) => (
                    <div key={stage} className="flex items-center justify-between">
                      <span className="text-sm truncate flex-1">{stage}</span>
                      <div className="flex items-center gap-2 ml-2">
                        <div className="w-28 bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-primary to-accentBlue h-2"
                            style={{ width: `${(count / totalGuitars) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold w-8 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        <div className="panel mt-10 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-display">Recent Guitars</h2>
          </div>
          {recentGuitars.length === 0 ? (
            <div className="text-center py-8 text-textMuted">
              <p>No guitars yet</p>
              <Link href="/runs" className="text-primary hover:text-textPrimary mt-2 inline-block">
                View runs to add guitars
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="text-xs uppercase tracking-[0.2em] text-textMuted">
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4">Model</th>
                    <th className="text-left py-3 px-4">Finish</th>
                    <th className="text-left py-3 px-4">Order</th>
                    <th className="text-left py-3 px-4">Customer</th>
                    <th className="text-left py-3 px-4">Stage</th>
                    <th className="text-left py-3 px-4">Created</th>
                    <th className="text-left py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentGuitars.map((guitar) => {
                    const runStages = runStagesMap.get(guitar.runId) || [];
                    const stage = runStages.find((s) => s.id === guitar.stageId);
                    return (
                      <tr key={guitar.id} className="border-b border-slate-200 hover:bg-shell">
                        <td className="py-3 px-4">
                          <span className="font-medium text-textPrimary">{guitar.model}</span>
                        </td>
                        <td className="py-3 px-4 text-textMuted">{guitar.finish}</td>
                        <td className="py-3 px-4 text-textMuted">{guitar.orderNumber}</td>
                        <td className="py-3 px-4">
                          {guitar.clientUid && guitar.customerName ? (
                            <Link
                              href={`/settings/clients/${guitar.clientUid}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-primary hover:text-textPrimary hover:underline font-medium"
                            >
                              {guitar.customerName}
                            </Link>
                          ) : (
                            <span className="text-textMuted">
                              {guitar.customerName || "No customer assigned"}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-textMuted">{stage?.label || "Unknown"}</span>
                        </td>
                        <td className="py-3 px-4 text-sm text-textMuted">
                          {new Date(guitar.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <Link
                            href={`/runs/${guitar.runId}/board`}
                            className="text-primary hover:text-textPrimary text-sm font-medium"
                            onClick={(e) => e.stopPropagation()}
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/runs/new"
            className="rounded-2xl p-6 bg-primary text-white shadow-panel hover:shadow-lg transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-display text-lg">Create New Run</h3>
                <p className="text-sm text-white/80">Start a new production batch</p>
              </div>
            </div>
          </Link>

          <Link href="/runs" className="panel p-6 hover:shadow-panel transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-shell rounded-xl">
                <Activity className="w-6 h-6 text-accentBlue" />
              </div>
              <div>
                <h3 className="font-display text-lg">View All Runs</h3>
                <p className="text-sm text-textMuted">Manage every active board</p>
              </div>
            </div>
          </Link>

          <div className="panel p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-shell rounded-xl">
                <TrendingUp className="w-6 h-6 text-accentBlue" />
              </div>
              <div>
                <h3 className="font-display text-lg">Analytics</h3>
                <p className="text-sm text-textMuted">Coming soon</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

