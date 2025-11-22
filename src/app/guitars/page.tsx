"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getRun, subscribeRunStages } from "@/lib/firestore";
import { GuitarDetailModal } from "@/components/guitars/GuitarDetailModal";
import type { GuitarBuild, Run, RunStage } from "@/types/guitars";
import { Guitar, Search, X, Package, User, Hash, Calendar, Grid, Table } from "lucide-react";

export default function GuitarsPage() {
  const { currentUser, userRole, loading } = useAuth();
  const router = useRouter();
  const [guitars, setGuitars] = useState<GuitarBuild[]>([]);
  const [loadingGuitars, setLoadingGuitars] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [selectedGuitar, setSelectedGuitar] = useState<GuitarBuild | null>(null);
  const [runs, setRuns] = useState<Map<string, Run>>(new Map());
  const [stages, setStages] = useState<Map<string, RunStage[]>>(new Map());

  useEffect(() => {
    if (loading) return;

    if (!currentUser) {
      router.push("/login");
      return;
    }

    // Only staff, admin, and factory can access
    if (userRole !== "staff" && userRole !== "admin" && userRole !== "factory") {
      router.push("/");
      return;
    }
  }, [currentUser, userRole, loading, router]);

  // Load all guitars
  useEffect(() => {
    if (!currentUser || (userRole !== "staff" && userRole !== "admin" && userRole !== "factory")) return;

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

  if (loading || loadingGuitars) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-lg">Loading guitars...</div>
        </div>
      </AppLayout>
    );
  }

  if (!currentUser || (userRole !== "staff" && userRole !== "admin" && userRole !== "factory")) {
    return null;
  }

  return (
    <AppLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">All Guitars</h1>
          <p className="text-gray-600">
            Search and find guitars by model, finish, order number, or any description
          </p>
        </div>

        {/* Search Bar and View Toggle */}
        <div className="mb-6 flex gap-4 items-end">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by model, finish, order number, serial, customer, run, stage, or specs..."
              className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          <div className="flex gap-2 border border-gray-300 rounded-lg p-1 bg-white">
            <button
              onClick={() => setViewMode("card")}
              className={`p-2 rounded transition-colors ${
                viewMode === "card"
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
              title="Card View"
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-2 rounded transition-colors ${
                viewMode === "table"
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
              title="Table View"
            >
              <Table className="w-5 h-5" />
            </button>
          </div>
        </div>
        {searchTerm && (
          <p className="mb-4 text-sm text-gray-500">
            Found {filteredGuitars.length} guitar{filteredGuitars.length !== 1 ? "s" : ""}
          </p>
        )}

        {/* Guitars View */}
        {filteredGuitars.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <Guitar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">
              {searchTerm ? "No guitars found matching your search" : "No guitars found"}
            </p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="mt-4 text-blue-600 hover:text-blue-700"
              >
                Clear search
              </button>
            )}
          </div>
        ) : viewMode === "card" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGuitars.map((guitar) => {
              const run = runs.get(guitar.runId);
              const runStages = stages.get(guitar.runId) || [];
              const currentStage = runStages.find((s) => s.id === guitar.stageId);

              return (
                <button
                  key={guitar.id}
                  onClick={() => setSelectedGuitar(guitar)}
                  className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-lg transition-shadow text-left"
                >
                  {/* Guitar Image */}
                  {guitar.coverPhotoUrl ? (
                    <div className="w-full h-48 rounded-lg overflow-hidden mb-3 bg-gray-100">
                      <img
                        src={guitar.coverPhotoUrl}
                        alt={guitar.model}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-48 rounded-lg bg-gray-100 flex items-center justify-center mb-3">
                      <Guitar className="w-12 h-12 text-gray-400" />
                    </div>
                  )}

                  {/* Guitar Info */}
                  <div className="space-y-2">
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg">{guitar.model}</h3>
                      <p className="text-gray-600">{guitar.finish}</p>
                    </div>

                    <div className="flex flex-wrap gap-2 text-sm text-gray-500">
                      {guitar.orderNumber && (
                        <div className="flex items-center gap-1">
                          <Hash className="w-4 h-4" />
                          <span>{guitar.orderNumber}</span>
                        </div>
                      )}
                      {guitar.serial && (
                        <div className="flex items-center gap-1">
                          <Hash className="w-4 h-4" />
                          <span>SN: {guitar.serial}</span>
                        </div>
                      )}
                    </div>

                    {run && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Package className="w-4 h-4" />
                        <span>{run.name}</span>
                      </div>
                    )}

                    {currentStage && (
                      <div className="inline-block px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded">
                        {currentStage.label}
                      </div>
                    )}

                    {guitar.customerName && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <User className="w-4 h-4" />
                        <span>{guitar.customerName}</span>
                      </div>
                    )}

                    {/* Specs Preview */}
                    {guitar.specs && (
                      <div className="pt-2 border-t border-gray-200 text-xs text-gray-500 space-y-1">
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
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Image</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Finish</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order #</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Serial</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Run</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stage</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Specs</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredGuitars.map((guitar) => {
                    const run = runs.get(guitar.runId);
                    const runStages = stages.get(guitar.runId) || [];
                    const currentStage = runStages.find((s) => s.id === guitar.stageId);

                    return (
                      <tr
                        key={guitar.id}
                        onClick={() => setSelectedGuitar(guitar)}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          {guitar.coverPhotoUrl ? (
                            <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                              <img
                                src={guitar.coverPhotoUrl}
                                alt={guitar.model}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center">
                              <Guitar className="w-6 h-6 text-gray-400" />
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{guitar.model}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{guitar.finish}</td>
                        <td className="px-4 py-3 text-gray-600">{guitar.orderNumber || "-"}</td>
                        <td className="px-4 py-3 text-gray-600">{guitar.serial || "-"}</td>
                        <td className="px-4 py-3">
                          {run ? (
                            <div className="flex items-center gap-1 text-gray-600">
                              <Package className="w-4 h-4" />
                              <span>{run.name}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {currentStage ? (
                            <span className="inline-block px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded">
                              {currentStage.label}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {guitar.customerName ? (
                            <div className="flex items-center gap-1 text-gray-600">
                              <User className="w-4 h-4" />
                              <span>{guitar.customerName}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {guitar.specs && (
                            <div className="text-xs text-gray-500 space-y-0.5">
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
      </div>
    </AppLayout>
  );
}

