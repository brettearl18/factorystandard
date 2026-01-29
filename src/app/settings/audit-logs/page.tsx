"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { subscribeAuditLogs } from "@/lib/firestore";
import type { AuditLogEntry, AuditAction } from "@/types/guitars";
import { FileText, Search, LogIn, Eye, Guitar, MessageSquare } from "lucide-react";

const ACTION_LABELS: Record<AuditAction, string> = {
  login: "Login",
  view_my_guitars: "Viewed My Guitars",
  view_guitar: "Viewed guitar",
  view_run_updates: "Viewed run updates",
};

const ACTION_ICONS: Record<AuditAction, typeof LogIn> = {
  login: LogIn,
  view_my_guitars: Guitar,
  view_guitar: Eye,
  view_run_updates: MessageSquare,
};

export default function AuditLogsPage() {
  const { currentUser, userRole, loading } = useAuth();
  const router = useRouter();
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [filterEmail, setFilterEmail] = useState("");
  const [filterAction, setFilterAction] = useState<AuditAction | "">("");

  useEffect(() => {
    if (loading) return;

    if (!currentUser) {
      router.push("/login");
      return;
    }

    if (userRole !== "admin" && userRole !== "staff") {
      router.push("/settings");
      return;
    }
  }, [currentUser, userRole, loading, router]);

  useEffect(() => {
    if (!currentUser || (userRole !== "admin" && userRole !== "staff")) return;

    const unsubscribe = subscribeAuditLogs((logs) => {
      setEntries(logs);
    });

    return () => unsubscribe();
  }, [currentUser, userRole]);

  const filtered = entries.filter((e) => {
    if (filterEmail.trim()) {
      const email = (e.userEmail ?? "").toLowerCase();
      if (!email.includes(filterEmail.trim().toLowerCase())) return false;
    }
    if (filterAction && e.action !== filterAction) return false;
    return true;
  });

  if (loading || !currentUser || (userRole !== "admin" && userRole !== "staff")) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-lg">Loading...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <FileText className="w-8 h-8 text-blue-600" />
            Audit Logs
          </h1>
          <p className="text-gray-600">
            Client logins and when they view My Guitars, a guitar, or run updates.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6 flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by email</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="e.g. client@example.com"
                value={filterEmail}
                onChange={(e) => setFilterEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="min-w-[180px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by action</label>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction((e.target.value || "") as AuditAction | "")}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All actions</option>
              {(Object.keys(ACTION_LABELS) as AuditAction[]).map((action) => (
                <option key={action} value={action}>
                  {ACTION_LABELS[action]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      No audit log entries match your filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map((e) => {
                    const Icon = ACTION_ICONS[e.action];
                    return (
                      <tr key={e.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                          {new Date(e.createdAt).toLocaleString("en-AU", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {e.userEmail ?? e.userId}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 capitalize">
                          {e.userRole ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 flex items-center gap-2">
                          {Icon && <Icon className="w-4 h-4 text-blue-600" />}
                          {ACTION_LABELS[e.action]}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {Object.keys(e.details).length === 0
                            ? "—"
                            : Object.entries(e.details)
                                .map(([k, v]) => `${k}: ${String(v)}`)
                                .join(", ")}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        <p className="mt-4 text-sm text-gray-500">
          Showing {filtered.length} of {entries.length} entries (last 200).
        </p>
      </div>
    </AppLayout>
  );
}
