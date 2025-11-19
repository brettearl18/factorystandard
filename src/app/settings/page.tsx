"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { getFunctions, httpsCallable } from "firebase/functions";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Users,
  UserPlus,
  Mail,
  Search,
  Guitar,
  CheckCircle,
  X,
  Edit,
  Link as LinkIcon,
} from "lucide-react";
import type { GuitarBuild } from "@/types/guitars";

interface ClientUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: string | null;
  emailVerified: boolean;
  createdAt: string;
  lastSignIn: string | null;
}

export default function SettingsPage() {
  const { currentUser, userRole, loading } = useAuth();
  const router = useRouter();
  const [clients, setClients] = useState<ClientUser[]>([]);
  const [allGuitars, setAllGuitars] = useState<GuitarBuild[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<ClientUser | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);

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
          setClients(data.users);
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

  // Filter clients by search term
  const filteredClients = clients.filter((client) => {
    const search = searchTerm.toLowerCase();
    return (
      client.email?.toLowerCase().includes(search) ||
      client.displayName?.toLowerCase().includes(search) ||
      client.uid.toLowerCase().includes(search)
    );
  });

  // Get guitars for a client
  const getClientGuitars = (clientUid: string) => {
    return allGuitars.filter((g) => g.clientUid === clientUid);
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
          <p className="text-gray-600">Manage clients and invitations</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Total Clients</p>
                <p className="text-3xl font-bold text-gray-900">{clients.length}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Active Clients</p>
                <p className="text-3xl font-bold text-gray-900">
                  {clients.filter((c) => c.lastSignIn).length}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Total Guitars</p>
                <p className="text-3xl font-bold text-gray-900">{allGuitars.length}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Guitar className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Clients Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Client Management</h2>
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <UserPlus className="w-5 h-5" />
              Invite Client
            </button>
          </div>

          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search clients by email, name, or UID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Clients List */}
          {filteredClients.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No clients found</p>
              {searchTerm && (
                <p className="text-sm mt-2">Try a different search term</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredClients.map((client) => {
                const clientGuitars = getClientGuitars(client.uid);
                // If client has guitars, navigate to the first guitar's detail page
                // Otherwise, navigate to their dashboard
                const href = clientGuitars.length > 0 
                  ? `/my-guitars/${clientGuitars[0].id}`
                  : `/settings/clients/${client.uid}`;
                return (
                  <Link
                    key={client.uid}
                    href={href}
                    className="block border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900">
                            {client.displayName || "No Name"}
                          </h3>
                          {client.emailVerified ? (
                            <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded-full flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Verified
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full flex items-center gap-1">
                              <X className="w-3 h-3" />
                              Unverified
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-1">{client.email}</p>
                        <p className="text-xs text-gray-500 font-mono mb-3">
                          UID: {client.uid}
                        </p>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1 text-gray-600">
                            <Guitar className="w-4 h-4" />
                            <span>{clientGuitars.length} guitar{clientGuitars.length !== 1 ? "s" : ""}</span>
                          </div>
                          {client.lastSignIn && (
                            <div className="text-gray-500">
                              Last active: {new Date(client.lastSignIn).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedClient(client);
                            setShowAssignModal(true);
                          }}
                          className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors flex items-center gap-1"
                        >
                          <LinkIcon className="w-4 h-4" />
                          Assign Guitar
                        </button>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Invite Client Modal */}
      {showInviteModal && (
        <InviteClientModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          onSuccess={() => {
            setShowInviteModal(false);
            // Reload clients
            window.location.reload();
          }}
        />
      )}

      {/* Assign Guitar Modal */}
      {showAssignModal && selectedClient && (
        <AssignGuitarModal
          client={selectedClient}
          isOpen={showAssignModal}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedClient(null);
          }}
          onSuccess={() => {
            setShowAssignModal(false);
            setSelectedClient(null);
          }}
        />
      )}
    </AppLayout>
  );
}

// Invite Client Modal Component
interface InviteClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

function InviteClientModal({ isOpen, onClose, onSuccess }: InviteClientModalProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const functions = getFunctions();
      const createUser = httpsCallable(functions, "createUser");
      const result = await createUser({
        email: email.trim(),
        displayName: name.trim() || undefined,
        role: "client",
      });

      const data = result.data as any;
      if (data.success) {
        // Generate password reset link (user will receive email)
        alert(`Client created successfully! UID: ${data.uid}\n\nThey will receive a password reset email to set their password.`);
        setEmail("");
        setName("");
        onSuccess?.();
      } else {
        setError(data.message || "Failed to create client");
      }
    } catch (error: any) {
      console.error("Error creating client:", error);
      setError(error.message || "Failed to create client");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Invite New Client</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border rounded-md"
              required
              placeholder="client@example.com"
            />
            <p className="text-xs text-gray-500 mt-1">
              They will receive a password reset email to set their password
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Display Name (Optional)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2 border rounded-md"
              placeholder="John Doe"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-md hover:bg-gray-50"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Invite Client"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Assign Guitar Modal Component
interface AssignGuitarModalProps {
  client: ClientUser;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

function AssignGuitarModal({
  client,
  isOpen,
  onClose,
  onSuccess,
}: AssignGuitarModalProps) {
  const [selectedGuitarId, setSelectedGuitarId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allGuitars, setAllGuitars] = useState<GuitarBuild[]>([]);

  useEffect(() => {
    if (!isOpen) return;

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
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter out guitars already assigned to this client (or any client)
  const availableGuitars = allGuitars.filter((g) => !g.clientUid || g.clientUid !== client.uid);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGuitarId) return;

    setIsSubmitting(true);

    try {
      const { updateGuitar } = await import("@/lib/firestore");
      await updateGuitar(selectedGuitarId, {
        clientUid: client.uid,
      });

      alert("Guitar assigned successfully!");
      setSelectedGuitarId("");
      onSuccess?.();
    } catch (error) {
      console.error("Error assigning guitar:", error);
      alert("Failed to assign guitar. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Assign Guitar</h2>
            <p className="text-sm text-gray-500 mt-1">
              Assign a guitar to {client.displayName || client.email}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Guitar *
            </label>
            <select
              value={selectedGuitarId}
              onChange={(e) => setSelectedGuitarId(e.target.value)}
              className="w-full p-2 border rounded-md"
              required
            >
              <option value="">Choose a guitar...</option>
              {availableGuitars.map((guitar) => (
                <option key={guitar.id} value={guitar.id}>
                  {guitar.model} - {guitar.finish} ({guitar.orderNumber})
                  {guitar.clientUid && guitar.clientUid !== client.uid && (
                    <span className="text-gray-400">
                      {" "}
                      - Currently assigned to another client
                    </span>
                  )}
                </option>
              ))}
            </select>
            {availableGuitars.length === 0 && (
              <p className="text-xs text-gray-500 mt-1">
                No available guitars. All guitars are already assigned.
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-md hover:bg-gray-50"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              disabled={isSubmitting || !selectedGuitarId}
            >
              {isSubmitting ? "Assigning..." : "Assign Guitar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

