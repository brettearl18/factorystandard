"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { subscribeRuns, subscribeRunStages } from "@/lib/firestore";
import { collection, query, onSnapshot, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Guitar,
  Package,
  TrendingUp,
  Clock,
  ArrowRight,
  Activity,
  CheckCircle,
  Circle,
} from "lucide-react";
import type { Run, RunStage, GuitarBuild } from "@/types/guitars";

export default function DashboardPage() {
  const { currentUser, userRole, loading } = useAuth();
  const router = useRouter();
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

  // Load all guitars
  useEffect(() => {
    if (!currentUser || (userRole !== "staff" && userRole !== "admin")) return;

    const guitarsRef = collection(db, "guitars");
    const q = query(guitarsRef, orderBy("createdAt", "desc"));

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
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Overview of all factory runs and guitars</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Total Guitars</p>
                <p className="text-3xl font-bold text-gray-900">{totalGuitars}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Guitar className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Active Runs</p>
                <p className="text-3xl font-bold text-gray-900">{activeRuns}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Activity className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">In Progress</p>
                <p className="text-3xl font-bold text-gray-900">{guitarsInProgress}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Completed</p>
                <p className="text-3xl font-bold text-gray-900">{guitarsCompleted}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Runs */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Active Runs</h2>
              <Link
                href="/runs"
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                View All <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            {runs.filter((r) => r.isActive).length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p>No active runs</p>
                <Link
                  href="/runs/new"
                  className="text-blue-600 hover:text-blue-700 mt-2 inline-block"
                >
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
                        className="block p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-gray-900">{run.name}</h3>
                            <p className="text-sm text-gray-500 mt-1">
                              {guitarsInRun.length} guitar{guitarsInRun.length !== 1 ? "s" : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                              Active
                            </span>
                            <ArrowRight className="w-4 h-4 text-gray-400" />
                          </div>
                        </div>
                      </Link>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Stage Distribution */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Stage Distribution</h2>
            {stageDistribution.size === 0 ? (
              <p className="text-sm text-gray-400">No data available</p>
            ) : (
              <div className="space-y-3">
                {Array.from(stageDistribution.entries())
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 8)
                  .map(([stage, count]) => (
                    <div key={stage} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700 truncate flex-1">{stage}</span>
                      <div className="flex items-center gap-2 ml-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{
                              width: `${(count / totalGuitars) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-gray-900 w-8 text-right">
                          {count}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Guitars */}
        <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Recent Guitars</h2>
          </div>
          {recentGuitars.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p>No guitars yet</p>
              <Link
                href="/runs"
                className="text-blue-600 hover:text-blue-700 mt-2 inline-block"
              >
                View runs to add guitars
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                      Model
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                      Finish
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                      Order
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                      Customer
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                      Stage
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                      Created
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentGuitars.map((guitar) => {
                    const runStages = runStagesMap.get(guitar.runId) || [];
                    const stage = runStages.find((s) => s.id === guitar.stageId);
                    return (
                      <tr
                        key={guitar.id}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="py-3 px-4">
                          <span className="font-medium text-gray-900">{guitar.model}</span>
                        </td>
                        <td className="py-3 px-4 text-gray-600">{guitar.finish}</td>
                        <td className="py-3 px-4 text-gray-600">{guitar.orderNumber}</td>
                        <td className="py-3 px-4">
                          {guitar.clientUid && guitar.customerName ? (
                            <Link
                              href={`/settings/clients/${guitar.clientUid}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-blue-600 hover:text-blue-700 hover:underline font-medium"
                            >
                              {guitar.customerName}
                            </Link>
                          ) : (
                            <span className="text-gray-600">
                              {guitar.customerName || "No customer assigned"}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-gray-600">
                            {stage?.label || "Unknown"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-500">
                          {new Date(guitar.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <Link
                            href={`/runs/${guitar.runId}/board`}
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
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

        {/* Quick Actions */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/runs/new"
            className="bg-blue-600 text-white rounded-lg p-6 hover:bg-blue-700 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold">Create New Run</h3>
                <p className="text-sm text-blue-100">Start a new factory run</p>
              </div>
            </div>
          </Link>

          <Link
            href="/runs"
            className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-blue-300 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Activity className="w-6 h-6 text-gray-700" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">View All Runs</h3>
                <p className="text-sm text-gray-500">Manage all factory runs</p>
              </div>
            </div>
          </Link>

          <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-gray-700" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Analytics</h3>
                <p className="text-sm text-gray-500">Coming soon</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

