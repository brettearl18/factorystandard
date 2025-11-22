"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { getFunctions, httpsCallable } from "firebase/functions";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Users,
  UserPlus,
  Search,
  Guitar,
  CheckCircle,
  X,
  ArrowRight,
  Mail,
  Phone,
  MapPin,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from "lucide-react";
import type { GuitarBuild } from "@/types/guitars";
import { AddClientModal } from "@/components/client/AddClientModal";
import { subscribeClientProfile, subscribeRunStages, getRun } from "@/lib/firestore";
import type { ClientProfile, RunStage } from "@/types/guitars";

interface ClientUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: string | null;
  emailVerified: boolean;
  createdAt: string;
  lastSignIn: string | null;
}

interface ClientWithProfile extends ClientUser {
  profile?: ClientProfile | null;
  guitars: GuitarBuild[];
}

interface GuitarWithStage extends GuitarBuild {
  client?: ClientWithProfile;
  currentStage?: RunStage | null;
  runName?: string;
}

export default function ClientsPage() {
  const { currentUser, userRole, loading } = useAuth();
  const router = useRouter();
  const [clients, setClients] = useState<ClientWithProfile[]>([]);
  const [allGuitars, setAllGuitars] = useState<GuitarBuild[]>([]);
  const [guitarsWithDetails, setGuitarsWithDetails] = useState<GuitarWithStage[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewMode, setViewMode] = useState<"cards" | "table">("table");
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

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

  // Load all clients
  useEffect(() => {
    if (!currentUser || (userRole !== "staff" && userRole !== "admin")) return;

    const loadClients = async () => {
      setLoadingClients(true);
      try {
        const functions = getFunctions();
        const listUsers = httpsCallable(functions, "listUsers");
        const result = await listUsers({ roleFilter: "client" });
        const data = result.data as any;

        if (data.success) {
          const clientUsers = data.users as ClientUser[];
          
          // Load profiles for each client
          const clientsWithProfiles = await Promise.all(
            clientUsers.map(async (client) => {
              let profile: ClientProfile | null = null;
              try {
                await new Promise<void>((resolve) => {
                  const unsubscribe = subscribeClientProfile(client.uid, (p) => {
                    profile = p;
                    resolve();
                  });
                  // Give it a moment to load, then resolve
                  setTimeout(() => {
                    unsubscribe();
                    resolve();
                  }, 500);
                });
              } catch (error) {
                // Profile might not exist, that's okay
              }
              return { ...client, profile };
            })
          );
          
          setClients(clientsWithProfiles);
        }
      } catch (error) {
        console.error("Error loading clients:", error);
      } finally {
        setLoadingClients(false);
      }
    };

    loadClients();
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
    });

    return () => unsubscribe();
  }, [currentUser, userRole]);

  // Merge guitars with clients
  useEffect(() => {
    if (allGuitars.length === 0) return;

    setClients((prevClients) =>
      prevClients.map((client) => ({
        ...client,
        guitars: allGuitars.filter((g) => g.clientUid === client.uid),
      }))
    );
  }, [allGuitars]);

  // Load guitar details (stages, runs) for table view
  useEffect(() => {
    if (allGuitars.length === 0 || clients.length === 0) return;

    const loadGuitarDetails = async () => {
      const guitarsWithDetails: GuitarWithStage[] = [];
      const runIds = [...new Set(allGuitars.map((g) => g.runId))];
      const runStagesMap = new Map<string, RunStage[]>();
      const runsMap = new Map<string, any>();

      // Load all run stages
      const stagePromises = runIds.map(async (runId) => {
        return new Promise<void>((resolve) => {
          const unsubscribe = subscribeRunStages(runId, (stages) => {
            runStagesMap.set(runId, stages);
            resolve();
          });
          setTimeout(() => {
            unsubscribe();
            resolve();
          }, 1000);
        });
      });

      // Load all runs
      const runPromises = runIds.map(async (runId) => {
        const run = await getRun(runId);
        if (run) {
          runsMap.set(runId, run);
        }
      });

      await Promise.all([...stagePromises, ...runPromises]);

      // Build guitar details
      for (const guitar of allGuitars) {
        if (!guitar.clientUid) continue;
        
        const client = clients.find((c) => c.uid === guitar.clientUid);
        const stages = runStagesMap.get(guitar.runId) || [];
        const currentStage = stages.find((s) => s.id === guitar.stageId);
        const run = runsMap.get(guitar.runId);

        guitarsWithDetails.push({
          ...guitar,
          client,
          currentStage,
          runName: run?.name,
        });
      }

      setGuitarsWithDetails(guitarsWithDetails);
    };

    loadGuitarDetails();
  }, [allGuitars, clients]);

  if (loading || loadingClients) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-lg">Loading...</div>
        </div>
      </AppLayout>
    );
  }

  if (!currentUser || (userRole !== "staff" && userRole !== "admin")) {
    return null;
  }

  // Filter and sort guitars for table view
  const filteredAndSortedGuitars = guitarsWithDetails
    .filter((guitar) => {
      if (!guitar.client) return false;
      const search = searchTerm.toLowerCase();
      const name = guitar.client.displayName?.toLowerCase() || "";
      const email = guitar.client.email?.toLowerCase() || "";
      const phone = guitar.client.profile?.phone?.toLowerCase() || "";
      const model = guitar.model?.toLowerCase() || "";
      const finish = guitar.finish?.toLowerCase() || "";
      const orderNumber = guitar.orderNumber?.toLowerCase() || "";
      
      return (
        name.includes(search) ||
        email.includes(search) ||
        phone.includes(search) ||
        model.includes(search) ||
        finish.includes(search) ||
        orderNumber.includes(search)
      );
    })
    .filter((g) => !g.archived)
    .sort((a, b) => {
      if (!sortColumn) return 0;

      let aValue: any;
      let bValue: any;

      switch (sortColumn) {
        case "client":
          aValue = a.client?.displayName || "";
          bValue = b.client?.displayName || "";
          break;
        case "email":
          aValue = a.client?.email || "";
          bValue = b.client?.email || "";
          break;
        case "phone":
          aValue = a.client?.profile?.phone || "";
          bValue = b.client?.profile?.phone || "";
          break;
        case "model":
          aValue = a.model || "";
          bValue = b.model || "";
          break;
        case "finish":
          aValue = a.finish || "";
          bValue = b.finish || "";
          break;
        case "orderNumber":
          aValue = a.orderNumber || "";
          bValue = b.orderNumber || "";
          break;
        case "run":
          aValue = a.runName || "";
          bValue = b.runName || "";
          break;
        case "stage":
          aValue = a.currentStage?.label || "";
          bValue = b.currentStage?.label || "";
          break;
        case "status":
          aValue = a.archived ? 1 : 0;
          bValue = b.archived ? 1 : 0;
          break;
        default:
          return 0;
      }

      // Handle string comparison
      if (typeof aValue === "string" && typeof bValue === "string") {
        const comparison = aValue.localeCompare(bValue);
        return sortDirection === "asc" ? comparison : -comparison;
      }

      // Handle number comparison
      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });

  // Filter clients by search term (for cards view)
  const filteredClients = clients.filter((client) => {
    const search = searchTerm.toLowerCase();
    const name = client.displayName?.toLowerCase() || "";
    const email = client.email?.toLowerCase() || "";
    const phone = client.profile?.phone?.toLowerCase() || "";
    const address = client.profile?.shippingAddress
      ? `${client.profile.shippingAddress.line1 || ""} ${client.profile.shippingAddress.city || ""} ${client.profile.shippingAddress.state || ""}`.toLowerCase()
      : "";
    
    return (
      name.includes(search) ||
      email.includes(search) ||
      phone.includes(search) ||
      address.includes(search) ||
      client.uid.toLowerCase().includes(search)
    );
  });

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (column: string) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="w-4 h-4 text-blue-600" />
    ) : (
      <ArrowDown className="w-4 h-4 text-blue-600" />
    );
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2 tracking-tight">Clients</h1>
              <p className="text-gray-500 text-lg">
                Find clients and view their build progress
              </p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl font-medium"
            >
              <UserPlus className="w-5 h-5" />
              Add Client
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-2xl shadow-sm border border-blue-200/50 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700/80 mb-2 uppercase tracking-wide">Total Clients</p>
                <p className="text-4xl font-bold text-blue-900">{clients.length}</p>
              </div>
              <div className="p-4 bg-white/60 rounded-xl backdrop-blur-sm">
                <Users className="w-7 h-7 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-100/50 rounded-2xl shadow-sm border border-green-200/50 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700/80 mb-2 uppercase tracking-wide">Active Builds</p>
                <p className="text-4xl font-bold text-green-900">
                  {allGuitars.filter((g) => !g.archived).length}
                </p>
              </div>
              <div className="p-4 bg-white/60 rounded-xl backdrop-blur-sm">
                <Guitar className="w-7 h-7 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-2xl shadow-sm border border-purple-200/50 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700/80 mb-2 uppercase tracking-wide">Total Guitars</p>
                <p className="text-4xl font-bold text-purple-900">{allGuitars.length}</p>
              </div>
              <div className="p-4 bg-white/60 rounded-xl backdrop-blur-sm">
                <Guitar className="w-7 h-7 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Search and View Toggle */}
        <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, phone, or address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm hover:shadow-md text-gray-900 placeholder-gray-400"
            />
          </div>
          <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-1.5 border border-gray-200">
            <button
              onClick={() => setViewMode("table")}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                viewMode === "table"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Table
            </button>
            <button
              onClick={() => setViewMode("cards")}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                viewMode === "cards"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Cards
            </button>
          </div>
        </div>

        {/* Clients List */}
        {viewMode === "table" ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-b-2 border-gray-200">
                  <tr>
                    <th
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100/80 select-none transition-colors"
                      onClick={() => handleSort("client")}
                    >
                      <div className="flex items-center gap-2">
                        Client
                        {getSortIcon("client")}
                      </div>
                    </th>
                    <th
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100/80 select-none transition-colors"
                      onClick={() => handleSort("email")}
                    >
                      <div className="flex items-center gap-2">
                        Email
                        {getSortIcon("email")}
                      </div>
                    </th>
                    <th
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100/80 select-none transition-colors"
                      onClick={() => handleSort("phone")}
                    >
                      <div className="flex items-center gap-2">
                        Phone
                        {getSortIcon("phone")}
                      </div>
                    </th>
                    <th
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100/80 select-none transition-colors"
                      onClick={() => handleSort("model")}
                    >
                      <div className="flex items-center gap-2">
                        Model
                        {getSortIcon("model")}
                      </div>
                    </th>
                    <th
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100/80 select-none transition-colors"
                      onClick={() => handleSort("finish")}
                    >
                      <div className="flex items-center gap-2">
                        Finish
                        {getSortIcon("finish")}
                      </div>
                    </th>
                    <th
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100/80 select-none transition-colors"
                      onClick={() => handleSort("orderNumber")}
                    >
                      <div className="flex items-center gap-2">
                        Order #
                        {getSortIcon("orderNumber")}
                      </div>
                    </th>
                    <th
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100/80 select-none transition-colors"
                      onClick={() => handleSort("run")}
                    >
                      <div className="flex items-center gap-2">
                        Run
                        {getSortIcon("run")}
                      </div>
                    </th>
                    <th
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100/80 select-none transition-colors"
                      onClick={() => handleSort("stage")}
                    >
                      <div className="flex items-center gap-2">
                        Current Stage
                        {getSortIcon("stage")}
                      </div>
                    </th>
                    <th
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100/80 select-none transition-colors"
                      onClick={() => handleSort("status")}
                    >
                      <div className="flex items-center gap-2">
                        Status
                        {getSortIcon("status")}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredAndSortedGuitars.map((guitar, index) => (
                    <tr
                      key={guitar.id}
                      className="hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-transparent cursor-pointer transition-all group"
                      onClick={() => router.push(`/settings/clients/${guitar.clientUid}`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                            {guitar.client?.displayName || "No Name"}
                          </span>
                          {guitar.client?.emailVerified ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <X className="w-4 h-4 text-amber-500" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {guitar.client?.email || <span className="text-gray-400">-</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {guitar.client?.profile?.phone || <span className="text-gray-400">-</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-gray-900">
                          {guitar.model || <span className="text-gray-400">-</span>}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {guitar.finish || <span className="text-gray-400">-</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-700 font-mono bg-gray-50 px-2 py-1 rounded">
                          {guitar.orderNumber || <span className="text-gray-400">-</span>}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {guitar.runName || <span className="text-gray-400">-</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {guitar.currentStage ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-100 to-blue-50 text-blue-700 border border-blue-200/50">
                            {guitar.currentStage.label}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {guitar.archived ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                            Archived
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-green-100 to-emerald-50 text-green-700 border border-green-200/50">
                            Active
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredAndSortedGuitars.length === 0 && (
                <div className="text-center py-16 text-gray-400">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                    <Users className="w-8 h-8 opacity-50" />
                  </div>
                  <p className="text-lg font-medium mb-1">No guitars found</p>
                  {searchTerm && (
                    <p className="text-sm text-gray-500">Try a different search term</p>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="text-center py-12 text-gray-400 bg-white rounded-lg border border-gray-200">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No clients found</p>
            {searchTerm && (
              <p className="text-sm mt-2">Try a different search term</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClients.map((client) => {
              const clientGuitars = client.guitars || [];
              const activeGuitars = clientGuitars.filter((g) => !g.archived);
              
              return (
                <Link
                  key={client.uid}
                  href={`/settings/clients/${client.uid}`}
                  className="block bg-white rounded-lg shadow-sm border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900 text-lg">
                          {client.displayName || "No Name"}
                        </h3>
                        {client.emailVerified ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <X className="w-4 h-4 text-yellow-600" />
                        )}
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                        {client.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            <span className="truncate">{client.email}</span>
                          </div>
                        )}
                        {client.profile?.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            <span>{client.profile.phone}</span>
                          </div>
                        )}
                        {client.profile?.shippingAddress?.city && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            <span className="truncate">
                              {client.profile.shippingAddress.city}
                              {client.profile.shippingAddress.state && `, ${client.profile.shippingAddress.state}`}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Guitar className="w-4 h-4" />
                        <span>
                          {activeGuitars.length} active build{activeGuitars.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                    </div>
                    {activeGuitars.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {activeGuitars.slice(0, 2).map((guitar) => (
                          <div key={guitar.id} className="text-xs text-gray-500">
                            • {guitar.model} {guitar.finish && `- ${guitar.finish}`}
                          </div>
                        ))}
                        {activeGuitars.length > 2 && (
                          <div className="text-xs text-gray-400">
                            +{activeGuitars.length - 2} more
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Client Modal */}
      {showAddModal && (
        <AddClientModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            // Reload clients
            window.location.reload();
          }}
        />
      )}
    </AppLayout>
  );
}

