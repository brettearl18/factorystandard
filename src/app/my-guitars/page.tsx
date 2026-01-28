"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { useClientGuitars } from "@/hooks/useClientGuitars";
import { useClientInvoices } from "@/hooks/useClientInvoices";
import { subscribeRunStages, subscribeGuitarNotes, recordAuditLog } from "@/lib/firestore";
import { InvoiceList } from "@/components/client/InvoiceList";
import { Calendar, Clock, Guitar, TrendingUp, CheckCircle, Package, Activity, ArrowRight, Eye, EyeOff } from "lucide-react";
import type { GuitarBuild, RunStage, GuitarNote } from "@/types/guitars";

export default function MyGuitarsPage() {
  const { currentUser, userRole, loading } = useAuth();
  const router = useRouter();
  const [clientViewMode, setClientViewMode] = useState(false);
  const [viewingClientId, setViewingClientId] = useState<string | null>(null);
  const isAdminViewing = (userRole === "staff" || userRole === "admin") && !clientViewMode;
  const clientId = clientViewMode && viewingClientId ? viewingClientId : (userRole === "client" ? currentUser?.uid || null : null);
  const guitars = useClientGuitars(clientId);
  const invoices = useClientInvoices(clientId);
  const [guitarStages, setGuitarStages] = useState<Map<string, RunStage>>(new Map());
  const [runStagesMap, setRunStagesMap] = useState<Map<string, RunStage[]>>(new Map());
  const [recentNotes, setRecentNotes] = useState<Map<string, GuitarNote>>(new Map());

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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
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
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
            <Eye className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-blue-900 mb-2">View Client Dashboard</h2>
            <p className="text-blue-700 mb-4">To view a client's dashboard, navigate to their guitar detail page and use the "View as Client" button.</p>
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
      return "bg-purple-100 text-purple-800";
    }
    if (statusLower.includes("build") || statusLower.includes("progress")) {
      return "bg-blue-100 text-blue-800";
    }
    if (statusLower.includes("finish") || statusLower.includes("paint")) {
      return "bg-yellow-100 text-yellow-800";
    }
    if (statusLower.includes("ready") || statusLower.includes("complete")) {
      return "bg-green-100 text-green-800";
    }
    return "bg-gray-100 text-gray-800";
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
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Guitar Dashboard</h1>
          <p className="text-gray-600">Track the progress of your custom builds</p>
        </div>

        {guitars.length === 0 && userRole === "client" ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Guitar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No guitars yet</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Get started by submitting your guitar specifications. Fill out the form to begin your custom build journey.
            </p>
            <Link
              href="/onboard"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Guitar className="w-5 h-5" />
              Submit Guitar Specifications
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        ) : guitars.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="max-w-md mx-auto">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No guitars yet</h3>
              <p className="text-gray-500">Your custom builds will appear here once they're added to the system.</p>
            </div>
          </div>
        ) : (
          <>
            {/* Dashboard Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Total Guitars */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Total Guitars</p>
                    <p className="text-3xl font-bold text-gray-900">{totalGuitars}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Guitar className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </div>

              {/* In Progress */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">In Progress</p>
                    <p className="text-3xl font-bold text-blue-600">{inProgressGuitars}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              {/* Completed */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Completed</p>
                    <p className="text-3xl font-bold text-green-600">{completedGuitars}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>

              {/* Average Progress */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Avg. Progress</p>
                    <p className="text-3xl font-bold text-orange-600">{averageProgress}%</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Package className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Invoices Section */}
            {invoices.length > 0 && (
              <div className="mb-8">
                <InvoiceList
                  invoices={invoices}
                  canManage={false}
                />
              </div>
            )}

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Recent Activity */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <Activity className="w-5 h-5 text-blue-600" />
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
                            className="block p-3 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-colors group"
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 mb-1 group-hover:text-blue-600">
                                  {guitar.model}
                                </p>
                                <p className="text-xs text-gray-600 mb-1 line-clamp-2">{note.message}</p>
                                <p className="text-xs text-gray-400">
                                  {new Date(note.createdAt).toLocaleDateString()} at{" "}
                                  {new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 flex-shrink-0 mt-1" />
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Activity className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">No recent activity</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Guitar Cards - Takes 2 columns */}
              <div className="lg:col-span-2">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-900">My Guitars</h2>
                  <span className="text-sm text-gray-600">{totalGuitars} {totalGuitars === 1 ? 'guitar' : 'guitars'}</span>
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
                  className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-200 group"
                >
                  {/* Cover Image */}
                  <div className="relative h-48 bg-gray-100 overflow-hidden">
                    {guitar.coverPhotoUrl ? (
                      <img
                        src={guitar.coverPhotoUrl}
                        alt={guitar.model}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                        <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    )}
                    {/* Status Badge */}
                    <div className="absolute top-3 right-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(status)}`}>
                        {status}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{guitar.model}</h3>
                    <p className="text-gray-600 mb-3">{guitar.finish}</p>
                    
                    <div className="space-y-3 mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Order Number</span>
                        <span className="font-semibold text-gray-900">{guitar.orderNumber}</span>
                      </div>
                      
                      {/* Progress Bar */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-gray-600">Progress</span>
                          <span className="text-xs font-semibold text-blue-600">{progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-2.5 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      {/* Recent Update */}
                      {recentNote && (
                        <div className="pt-3 border-t border-gray-100">
                          <div className="flex items-start gap-2">
                            <Clock className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-gray-500 mb-1">
                                {new Date(recentNote.createdAt).toLocaleDateString()}
                              </p>
                              <p className="text-sm text-gray-700 line-clamp-2">{recentNote.message}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* View Details Link */}
                    <div className="pt-4 border-t border-gray-100">
                      <span className="text-sm font-medium text-blue-600 group-hover:text-blue-700">
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

