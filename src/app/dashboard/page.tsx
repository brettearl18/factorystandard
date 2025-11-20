"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { subscribeRuns, subscribeRunStages } from "@/lib/firestore";
import { collection, query, onSnapshot, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useBranding } from "@/hooks/useBranding";
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
} from "lucide-react";
import type { Run, RunStage, GuitarBuild } from "@/types/guitars";

export default function DashboardPage() {
  const { currentUser, userRole, loading } = useAuth();
  const router = useRouter();
  const branding = useBranding();
  const [runs, setRuns] = useState<Run[]>([]);
  const [allGuitars, setAllGuitars] = useState<GuitarBuild[]>([]);
  const [runStagesMap, setRunStagesMap] = useState<Map<string, RunStage[]>>(new Map());
  const [loadingData, setLoadingData] = useState(true);

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

  // Load recent guitars (limit to 100 for cost optimization)
  useEffect(() => {
    if (!currentUser || (userRole !== "staff" && userRole !== "admin")) return;

    const guitarsRef = collection(db, "guitars");
    const q = query(guitarsRef, orderBy("createdAt", "desc"), limit(100));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const guitars = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as GuitarBuild[];
      setAllGuitars(guitars);
      setLoadingData(false);
    });

    return () => unsubscribe();
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

  // Get recent guitars (last 10)
  const recentGuitars = allGuitars.slice(0, 10);

  const statCards = [
    {
      label: "Total Guitars",
      value: totalGuitars,
      icon: Guitar,
      iconBg: "bg-shell text-primary",
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

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto">
        {/* Branded Hero Section */}
        <div className="relative mb-10 overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 border border-primary/20 p-8 lg:p-12">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-secondary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  {branding.companyLogo ? (
                    <img
                      src={branding.companyLogo}
                      alt={branding.companyName}
                      className="h-16 w-auto object-contain"
                    />
                  ) : (
                    <div 
                      className="h-16 w-16 rounded-xl flex items-center justify-center text-white shadow-lg"
                      style={{ backgroundColor: branding.primaryColor || "#F97316" }}
                    >
                      <Guitar className="w-8 h-8" />
                    </div>
                  )}
                  <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-textMuted font-medium">
                      Control Room
                    </p>
                    <h1 className="text-4xl lg:text-5xl font-display mt-2 text-textPrimary">
                      {branding.companyName || "Factory Standards"}
                    </h1>
                  </div>
                </div>
                <p className="text-lg text-textMuted mb-4">
                  Production Dashboard
                </p>
                <div className="flex items-center gap-2 text-sm text-textMuted">
                  <Sparkles className="w-4 h-4" />
                  <span>Real-time production tracking and management</span>
                </div>
              </div>
            </div>
            <div 
              className="w-full h-1 rounded-full mt-6"
              style={{
                background: `linear-gradient(to right, ${branding.primaryColor || "#F97316"}, ${branding.secondaryColor || "#3B82F6"}, ${branding.accentColor || "#10B981"})`
              }}
            />
          </div>
        </div>

        {/* Stats Cards with Branding */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          {statCards.map((card, index) => {
            const Icon = card.icon;
            const colors = [
              branding.primaryColor || "#F97316",
              branding.secondaryColor || "#3B82F6",
              branding.primaryColor || "#F97316",
              branding.accentColor || "#10B981",
            ];
            const cardColor = colors[index % colors.length];
            
            return (
              <div 
                key={card.label} 
                className="stat-card group hover:shadow-lg transition-all duration-300 border-2 border-transparent hover:border-primary/20"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs uppercase tracking-[0.3em] text-textMuted font-medium">
                      {card.label}
                    </p>
                    <p 
                      className="text-3xl font-display mt-3 font-bold"
                      style={{ color: cardColor }}
                    >
                      {card.value}
                    </p>
                  </div>
                  <div 
                    className="p-3 rounded-xl shadow-sm group-hover:scale-110 transition-transform duration-300"
                    style={{ 
                      backgroundColor: `${cardColor}15`,
                      color: cardColor
                    }}
                  >
                    <Icon className="w-6 h-6" />
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
                <p className="text-xs uppercase tracking-[0.3em] text-textMuted">Runs</p>
                <h2 className="text-2xl font-display mt-2">Active Production</h2>
              </div>
              <Link
                href="/runs"
                className="flex items-center gap-2 text-sm text-primary hover:text-textPrimary transition-colors"
              >
                View All <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            {runs.filter((r) => r.isActive).length === 0 ? (
              <div className="text-center py-8 text-textMuted">
                <p>No active runs</p>
                <Link href="/runs/new" className="text-primary hover:text-textPrimary mt-2 inline-block">
                  Create your first run
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {runs
                  .filter((r) => r.isActive)
                  .map((run) => {
                    const guitarsInRun = guitarsByRun.get(run.id) || [];
                    return (
                      <Link
                        key={run.id}
                        href={`/runs/${run.id}/board`}
                        className="block p-4 border border-white/5 rounded-2xl bg-white/5 hover:bg-white/10 transition-all"
                      >
                        <div className="flex items-center gap-4">
                          {/* Thumbnail */}
                          <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-white/5 border border-white/5">
                            {run.thumbnailUrl ? (
                              <img
                                src={run.thumbnailUrl}
                                alt={run.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageIcon className="w-8 h-8 text-textMuted" />
                              </div>
                            )}
                          </div>
                          
                          {/* Run Info */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-display text-lg truncate">{run.name}</h3>
                            <p className="text-sm text-textMuted mt-1">
                              {guitarsInRun.length} guitar{guitarsInRun.length !== 1 ? "s" : ""}
                            </p>
                          </div>
                          
                          {/* Status Badge */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="px-2 py-1 bg-primary/15 text-primary text-xs font-semibold rounded-full">
                              Active
                            </span>
                            <ArrowRight className="w-4 h-4 text-textMuted" />
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
                        <div className="w-28 bg-slate rounded-full h-2 overflow-hidden">
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
                  <tr className="border-b border-slate">
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
                      <tr key={guitar.id} className="border-b border-slate hover:bg-shell">
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

