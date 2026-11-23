"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { useClientGuitars } from "@/hooks/useClientGuitars";
import { useClientInvoices } from "@/hooks/useClientInvoices";
import { useClientProfile } from "@/hooks/useClientProfile";
import { subscribeRunStages, subscribeGuitarNotes, recordAuditLog, subscribeCustomShopRequestsByUser } from "@/lib/firestore";
import { InvoiceList } from "@/components/client/InvoiceList";
import { GuitarPhoto } from "@/components/shared/GuitarPhoto";
import { Calendar, Clock, Guitar, TrendingUp, CheckCircle, Package, Activity, ArrowRight, Eye, EyeOff, FileText } from "lucide-react";
import type { GuitarBuild, RunStage, GuitarNote } from "@/types/guitars";
import type { CustomShopRequest } from "@/types/guitars";

export default function MyGuitarsPage() {
  const { currentUser, userRole, loading } = useAuth();
  const router = useRouter();
  const [clientViewMode, setClientViewMode] = useState(false);
  const [viewingClientId, setViewingClientId] = useState<string | null>(null);
  const isAdminViewing = (userRole === "staff" || userRole === "admin") && !clientViewMode;
  const clientId = clientViewMode && viewingClientId ? viewingClientId : (userRole === "client" ? currentUser?.uid || null : null);
  const guitars = useClientGuitars(clientId);
  const invoices = useClientInvoices(clientId);
  const profile = useClientProfile(clientId);
  const [guitarStages, setGuitarStages] = useState<Map<string, RunStage>>(new Map());
  const [runStagesMap, setRunStagesMap] = useState<Map<string, RunStage[]>>(new Map());
  const [recentNotes, setRecentNotes] = useState<Map<string, GuitarNote>>(new Map());
  const [customShopRequests, setCustomShopRequests] = useState<CustomShopRequest[]>([]);

  useEffect(() => {
    if (loading) return;

    if (!currentUser) {
      router.push("/login");
      return;
    }

    // Allow staff/admin to view client dashboards
    if (userRole !== "client" && userRole !== "staff" && userRole !== "admin") {
      router.push("/");
      return;
    }
  }, [currentUser, userRole, loading, router]);

  // Audit: log when client views My Guitars list (once per page visit)
  const loggedViewMyGuitars = useRef(false);
  useEffect(() => {
    if (!currentUser || userRole !== "client" || loggedViewMyGuitars.current) return;
    loggedViewMyGuitars.current = true;
    recordAuditLog("view_my_guitars", {}).catch(() => {});
  }, [currentUser, userRole]);

  // Load stages for each guitar's run
  useEffect(() => {
    if (guitars.length === 0) return;

    const runIds = [...new Set(guitars.map((g) => g.runId))];
    const stagesMap = new Map<string, RunStage>();
    const runStages = new Map<string, RunStage[]>();
    const unsubscribes: (() => void)[] = [];

    runIds.forEach((runId) => {
      const unsubscribe = subscribeRunStages(runId, (stages) => {
        // Store stages by run
        runStages.set(runId, stages);
        setRunStagesMap(new Map(runStages));
        
        // Also store by ID for quick lookup
        stages.forEach((stage) => {
          stagesMap.set(stage.id, stage);
        });
        setGuitarStages(new Map(stagesMap));
      });
      unsubscribes.push(unsubscribe);
    });

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [guitars]);

  // Load Custom Shop requests for this client (so we can show "pending" when no guitars yet)
  useEffect(() => {
    if (clientId != null && clientId === currentUser?.uid) {
      const unsub = subscribeCustomShopRequestsByUser(clientId, setCustomShopRequests);
      return () => unsub();
    }
    setCustomShopRequests([]);
  }, [clientId, currentUser?.uid]);

  // Load recent notes for each guitar
  useEffect(() => {
    if (guitars.length === 0) return;

    const notesMap = new Map<string, GuitarNote>();
    const unsubscribes: (() => void)[] = [];

    guitars.forEach((guitar) => {
      // For clients, use clientOnly=true to filter in the query (required by security rules)
      // Limit to 1 note since we only need the most recent one (cost optimization)
      const unsubscribe = subscribeGuitarNotes(guitar.id, (allNotes) => {
        // Notes are already filtered by visibleToClient in the query and limited to 1
        if (allNotes.length > 0) {
          notesMap.set(guitar.id, allNotes[0]); // Most recent note
          setRecentNotes(new Map(notesMap));
        }
      }, true, 1); // clientOnly=true, limit to 1 note for cost optimization
      unsubscribes.push(unsubscribe);
    });

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [guitars]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg">
        <div className="text-lg text-slate-600">Loading...</div>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  // If admin/staff and not in client view mode, show a message to select a client
  if (isAdminViewing) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="rounded-2xl border border-accent/20 bg-accent/5 p-8 text-center">
            <Eye className="w-12 h-12 text-accent mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 mb-2">View Client Dashboard</h2>
            <p className="text-slate-600 mb-4">To view a client&apos;s dashboard, navigate to their guitar detail page and use the &quot;View as Client&quot; button.</p>
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-accent text-accent-foreground hover:bg-accent-light transition-colors"
            >
              Go to Settings
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  const getClientStatus = (guitar: GuitarBuild): string => {
    const stage = guitarStages.get(guitar.stageId);
    return stage?.clientStatusLabel || "In Progress";
  };

  const getProgressPercentage = (guitar: GuitarBuild): number => {
    const stage = guitarStages.get(guitar.stageId);
    if (!stage) return 0;
    
    // Get all stages for this guitar's run
    const allStages = runStagesMap.get(guitar.runId) || [];
    if (allStages.length === 0) return 0;
    
    // Sort by order
    const sortedStages = [...allStages].sort((a, b) => a.order - b.order);
    
    // Find current stage position
    const currentStageIndex = sortedStages.findIndex((s) => s.id === stage.id);
    if (currentStageIndex === -1) return 0;
    
    // Calculate percentage (add 1 because index is 0-based)
    return Math.round(((currentStageIndex + 1) / sortedStages.length) * 100);
  };

  const getStatusColor = (status: string): string => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes("planning") || statusLower.includes("design")) {
      return "bg-sidebar text-text-onDark border-sidebar";
    }
    if (statusLower.includes("build") || statusLower.includes("progress")) {
      return "bg-accent text-accent-foreground border-accent";
    }
    if (statusLower.includes("finish") || statusLower.includes("paint")) {
      return "bg-status-warning text-accent-foreground border-status-warning";
    }
    if (statusLower.includes("ready") || statusLower.includes("complete")) {
      return "bg-status-success text-white border-status-success";
    }
    return "bg-surface-alt text-text-muted border-border";
  };

  // Calculate statistics
  const totalGuitars = guitars.length;
  const inProgressGuitars = guitars.filter((g) => {
    const status = getClientStatus(g);
    return !status.toLowerCase().includes("complete") && !status.toLowerCase().includes("ready");
  }).length;
  const completedGuitars = guitars.filter((g) => {
    const status = getClientStatus(g);
    return status.toLowerCase().includes("complete") || status.toLowerCase().includes("ready");
  }).length;
  
  // Calculate average progress
  const averageProgress = guitars.length > 0
    ? Math.round(guitars.reduce((sum, g) => sum + getProgressPercentage(g), 0) / guitars.length)
    : 0;

  // Get all recent notes sorted by date
  const allRecentNotes = Array.from(recentNotes.values())
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 5);

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">My Guitar Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Track the progress of your custom builds</p>
        </div>

        {guitars.length === 0 && userRole === "client" ? (
          <div className="space-y-6">
            {/* Pending Custom Shop requests */}
            {customShopRequests.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                  <h2 className="text-lg font-bold text-slate-900">Pending</h2>
                  <p className="text-sm text-slate-600">Your Custom Shop request(s) — we’ll review and get in touch.</p>
                </div>
                <div className="divide-y divide-slate-100">
                  {customShopRequests.map((req) => (
                    <Link
                      key={req.id}
                      href={`/custom-shop/requests/${req.id}`}
                      className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors group"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-6 h-6 text-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 group-hover:text-accent truncate">
                          {req.model
                            ? req.model
                            : req.guitarDescription.length > 50
                              ? req.guitarDescription.slice(0, 50) + "…"
                              : req.guitarDescription}
                        </p>
                        <p className="text-sm text-slate-500">
                          Submitted {new Date(req.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                          {" · "}
                          <span className={
                            req.status === "pending" ? "text-amber-700 font-medium" :
                            req.status === "approved" ? "text-teal" :
                            req.status === "rejected" ? "text-red-600" :
                            "text-accent"
                          }>
                            {req.status === "pending" ? "Under review" : req.status}
                          </span>
                        </p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-accent flex-shrink-0" />
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {/* Empty state / CTAs */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-12 text-center">
              <Guitar className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                {customShopRequests.length > 0 ? "No builds in progress yet" : "No guitars yet"}
              </h3>
              <p className="text-slate-600 mb-6 max-w-md mx-auto">
                {customShopRequests.length > 0
                  ? "Your Custom Shop request is pending. Once approved, your build will appear here. You can also submit another request."
                  : "Your builds will appear here once our team adds them to a run. You can submit a Custom Shop request anytime."}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/custom-shop/submit"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-accent text-accent-foreground hover:bg-accent-light transition-colors font-medium"
                >
                  <FileText className="w-5 h-5" />
                  Custom Shop request
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </div>
          </div>
        ) : guitars.length === 0 ? (
          <div className="text-center py-16 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="max-w-md mx-auto">
              <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">No guitars yet</h3>
              <p className="text-slate-500">Your custom builds will appear here once they're added to the system.</p>
            </div>
          </div>
        ) : (
          <>
            {/* Dashboard Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
              <div className="stat-card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500">Total Guitars</p>
                    <p className="text-2xl font-semibold text-slate-900 mt-1 tabular-nums">{totalGuitars}</p>
                  </div>
                  <div className="w-10 h-10 bg-purple-100 rounded-2xl flex items-center justify-center">
                    <Guitar className="w-5 h-5 text-purple-600" />
                  </div>
                </div>
              </div>

              <div className="stat-card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500">In Progress</p>
                    <p className="text-2xl font-semibold text-accent mt-1 tabular-nums">{inProgressGuitars}</p>
                  </div>
                  <div className="w-10 h-10 bg-accent/10 rounded-2xl flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-accent" />
                  </div>
                </div>
              </div>

              <div className="stat-card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500">Completed</p>
                    <p className="text-2xl font-semibold text-teal mt-1 tabular-nums">{completedGuitars}</p>
                  </div>
                  <div className="w-10 h-10 bg-teal/10 rounded-2xl flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-teal" />
                  </div>
                </div>
              </div>

              <div className="stat-card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500">Avg. Progress</p>
                    <p className="text-2xl font-semibold text-slate-900 mt-1 tabular-nums">{averageProgress}%</p>
                  </div>
                  <div className="w-10 h-10 bg-accent/10 rounded-2xl flex items-center justify-center">
                    <Package className="w-5 h-5 text-accent" />
                  </div>
                </div>
              </div>
            </div>

            {/* TEMP: invoices hidden from client dashboard for now
            {invoices.length > 0 && (
              <div className="mb-8">
                <InvoiceList
                  invoices={invoices}
                  canManage={false}
                  totalOrderAmount={profile?.totalOrderAmount}
                  totalOrderCurrency={profile?.totalOrderCurrency || "AUD"}
                />
              </div>
            )}
            */}

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Recent Activity */}
              <div className="lg:col-span-1">
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                      <Activity className="w-5 h-5 text-accent" />
                      Recent Activity
                    </h2>
                  </div>
                  {allRecentNotes.length > 0 ? (
                    <div className="space-y-4">
                      {allRecentNotes.map((note) => {
                        const guitar = guitars.find((g) => g.id === note.guitarId);
                        if (!guitar) return null;
                        return (
                          <Link
                            key={note.id}
                            href={`/my-guitars/${guitar.id}`}
                            className="block p-3 rounded-2xl border border-slate-100 hover:border-accent/30 hover:bg-accent/5 transition-colors group"
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-2 h-2 bg-accent rounded-full mt-2 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-900 mb-1 group-hover:text-accent">
                                  {guitar.model}
                                </p>
                                <p className="text-xs text-slate-600 mb-1 line-clamp-2">{note.message}</p>
                                <p className="text-xs text-slate-400">
                                  {new Date(note.createdAt).toLocaleDateString()} at{" "}
                                  {new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-accent flex-shrink-0 mt-1" />
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      <Activity className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                      <p className="text-sm">No recent activity</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Guitar Cards - Takes 2 columns */}
              <div className="lg:col-span-2">
                {customShopRequests.length > 0 && (
                  <div className="mb-4 p-4 rounded-2xl border border-accent/20 bg-accent/5">
                    <h3 className="text-sm font-semibold text-slate-900 mb-2">Pending Custom Shop</h3>
                    <div className="space-y-2">
                      {customShopRequests.map((req) => (
                        <Link
                          key={req.id}
                          href={`/custom-shop/requests/${req.id}`}
                          className="flex items-center justify-between text-sm text-accent hover:text-accent-light"
                        >
                          <span className="truncate">
                            {req.model || req.guitarDescription.slice(0, 40) + (req.guitarDescription.length > 40 ? "…" : "")}
                          </span>
                          <ArrowRight className="w-4 h-4 flex-shrink-0 ml-2" />
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-900">My Guitars</h2>
                  <span className="text-sm text-slate-600">{totalGuitars} {totalGuitars === 1 ? 'guitar' : 'guitars'}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {guitars.map((guitar) => {
              const status = getClientStatus(guitar);
              const progress = getProgressPercentage(guitar);
              const recentNote = recentNotes.get(guitar.id);
              
              return (
                <Link
                  key={guitar.id}
                  href={`/my-guitars/${guitar.id}`}
                  className="border border-border bg-surface overflow-hidden hover:border-sidebar transition-colors group"
                >
                  {/* Cover Image — authorised client guitar photo only */}
                  <div className="relative">
                    <GuitarPhoto
                      src={guitar.coverPhotoUrl}
                      alt={guitar.model}
                      size="card"
                      fit="contain"
                      className="border-0 border-b border-border h-48"
                    />
                    {/* Status Badge */}
                    <div className="absolute top-2 right-2">
                      <span className={`wo-badge ${getStatusColor(status)}`}>
                        {status}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="font-display text-xl font-bold uppercase tracking-wide text-text mb-1">
                      {guitar.model}
                    </h3>
                    <p className="text-text-muted mb-3">{guitar.finish}</p>
                    
                    <div className="space-y-3 mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="wo-label">Order Number</span>
                        <span className="font-mono font-semibold text-text">{guitar.orderNumber}</span>
                      </div>
                      
                      {/* Progress Bar */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="wo-label">Progress</span>
                          <span className="font-mono text-xs font-semibold text-sidebar">{progress}%</span>
                        </div>
                        <div className="w-full bg-surface-alt border border-border h-2.5 overflow-hidden">
                          <div
                            className="bg-accent h-2.5 transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      {/* Recent Update */}
                      {recentNote && (
                        <div className="pt-3 border-t border-slate-100">
                          <div className="flex items-start gap-2">
                            <Clock className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-slate-500 mb-1">
                                {new Date(recentNote.createdAt).toLocaleDateString()}
                              </p>
                              <p className="text-sm text-slate-700 line-clamp-2">{recentNote.message}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* View Details Link */}
                    <div className="pt-4 border-t border-slate-100">
                      <span className="text-sm font-medium text-accent group-hover:text-accent-light">
                        View Details →
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}

