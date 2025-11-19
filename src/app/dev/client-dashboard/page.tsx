"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { subscribeClientGuitars, subscribeRunStages, subscribeGuitarNotes } from "@/lib/firestore";
import { Calendar, Clock, Guitar, TrendingUp, CheckCircle, Package, Activity, ArrowRight } from "lucide-react";
import type { GuitarBuild, RunStage, GuitarNote } from "@/types/guitars";

export default function DevClientDashboardPage() {
  // For dev: use a test client UID or get from URL param
  const [testClientUid, setTestClientUid] = useState<string | null>(null);
  const [guitars, setGuitars] = useState<GuitarBuild[]>([]);
  const [guitarStages, setGuitarStages] = useState<Map<string, RunStage>>(new Map());
  const [runStagesMap, setRunStagesMap] = useState<Map<string, RunStage[]>>(new Map());
  const [recentNotes, setRecentNotes] = useState<Map<string, GuitarNote>>(new Map());

  // Try to get client UID from URL or use first available
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const uid = urlParams.get("uid");
    
    if (uid) {
      setTestClientUid(uid);
    } else {
      // Try to find any client with guitars
      const guitarsRef = collection(db, "guitars");
      const unsubscribe = onSnapshot(guitarsRef, (snapshot) => {
        const allGuitars = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as GuitarBuild[];
        
        // Find first guitar with a client UID
        const guitarWithClient = allGuitars.find((g) => g.clientUid);
        if (guitarWithClient && guitarWithClient.clientUid) {
          setTestClientUid(guitarWithClient.clientUid);
          unsubscribe(); // Stop listening once we found one
        }
      });
      
      return () => unsubscribe();
    }
  }, []);

  // Load guitars for test client
  useEffect(() => {
    if (!testClientUid) return;

    const unsubscribe = subscribeClientGuitars(testClientUid, (loadedGuitars) => {
      setGuitars(loadedGuitars);
    });

    return () => unsubscribe();
  }, [testClientUid]);

  // Load stages for each guitar's run
  useEffect(() => {
    if (guitars.length === 0) return;

    const runIds = [...new Set(guitars.map((g) => g.runId))];
    const stagesMap = new Map<string, RunStage>();
    const runStages = new Map<string, RunStage[]>();
    const unsubscribes: (() => void)[] = [];

    runIds.forEach((runId) => {
      const unsubscribe = subscribeRunStages(runId, (stages) => {
        runStages.set(runId, stages);
        setRunStagesMap(new Map(runStages));
        
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
      // Dev route - use clientOnly=true to filter in query
      const unsubscribe = subscribeGuitarNotes(guitar.id, (allNotes) => {
        const sortedNotes = allNotes.sort((a, b) => b.createdAt - a.createdAt);
        
        if (sortedNotes.length > 0) {
          notesMap.set(guitar.id, sortedNotes[0]);
          setRecentNotes(new Map(notesMap));
        }
      }, true); // clientOnly=true for dev client view
      unsubscribes.push(unsubscribe);
    });

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [guitars]);

  const getClientStatus = (guitar: GuitarBuild): string => {
    const stage = guitarStages.get(guitar.stageId);
    return stage?.clientStatusLabel || "In Progress";
  };

  const getProgressPercentage = (guitar: GuitarBuild): number => {
    const stage = guitarStages.get(guitar.stageId);
    if (!stage) return 0;
    
    const allStages = runStagesMap.get(guitar.runId) || [];
    if (allStages.length === 0) return 0;
    
    const sortedStages = [...allStages].sort((a, b) => a.order - b.order);
    const currentStageIndex = sortedStages.findIndex((s) => s.id === stage.id);
    if (currentStageIndex === -1) return 0;
    
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
  
  const averageProgress = guitars.length > 0
    ? Math.round(guitars.reduce((sum, g) => sum + getProgressPercentage(g), 0) / guitars.length)
    : 0;

  // Get all recent notes sorted by date
  const allRecentNotes = Array.from(recentNotes.values())
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Dev Banner */}
      <div className="bg-yellow-500 text-yellow-900 px-4 py-2 text-center text-sm font-semibold">
        🚧 DEV MODE - No Authentication Required 🚧
        {testClientUid && (
          <span className="ml-4 text-xs">Viewing as: {testClientUid}</span>
        )}
      </div>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Guitar Dashboard</h1>
          <p className="text-gray-600">Track the progress of your custom builds</p>
          {!testClientUid && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>No client UID found.</strong> Add <code className="bg-yellow-100 px-2 py-1 rounded">?uid=CLIENT_UID</code> to the URL, or ensure there are guitars with assigned clients in the database.
              </p>
            </div>
          )}
        </div>

        {!testClientUid ? (
          <div className="text-center py-16 bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="max-w-md mx-auto">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Guitar className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Client Selected</h3>
              <p className="text-gray-500 mb-4">Add a client UID to the URL: <code className="bg-gray-100 px-2 py-1 rounded">?uid=CLIENT_UID</code></p>
              <p className="text-sm text-gray-400">Or ensure there are guitars with assigned clients in the database.</p>
            </div>
          </div>
        ) : guitars.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="max-w-md mx-auto">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Guitar className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No guitars yet</h3>
              <p className="text-gray-500">This client doesn't have any guitars assigned yet.</p>
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
                          <a
                            key={note.id}
                            href={`/dev/client-dashboard/guitar/${guitar.id}`}
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
                          </a>
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
                      <a
                        key={guitar.id}
                        href={`/dev/client-dashboard/guitar/${guitar.id}`}
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
                              <Guitar className="w-16 h-16 text-gray-400" />
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
                      </a>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

