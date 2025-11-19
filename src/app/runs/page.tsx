"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { useRuns } from "@/hooks/useRuns";
import { archiveRun, unarchiveRun } from "@/lib/firestore";
import { Plus, Archive, ArchiveRestore } from "lucide-react";

export default function RunsPage() {
  const { currentUser, userRole, loading } = useAuth();
  const router = useRouter();
  const runs = useRuns();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [archiving, setArchiving] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;

    if (!currentUser) {
      router.push("/login");
      return;
    }

    if (userRole !== "staff" && userRole !== "admin") {
      router.push("/my-guitars");
      return;
    }
  }, [currentUser, userRole, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!currentUser || (userRole !== "staff" && userRole !== "admin")) {
    return null;
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Runs</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
          >
            {showArchived ? (
              <>
                <ArchiveRestore className="w-5 h-5" />
                Show Active
              </>
            ) : (
              <>
                <Archive className="w-5 h-5" />
                Show Archived
              </>
            )}
          </button>
          <Link
            href="/runs/new"
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create New Run
          </Link>
        </div>
      </div>

      {runs.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-500 mb-4">
            {showArchived ? "No archived runs." : "No runs yet."}
          </p>
          {!showArchived && (
            <Link
              href="/runs/new"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Your First Run
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {runs
            .filter((run) => showArchived ? run.archived : !run.archived)
            .map((run) => (
            <div
              key={run.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow relative"
            >
              <Link
                href={`/runs/${run.id}/board`}
                className="block"
              >
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-xl font-semibold">{run.name}</h3>
                  <div className="flex items-center gap-2">
                    {run.archived && (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        Archived
                      </span>
                    )}
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        run.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {run.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
                <div className="text-sm text-gray-500 space-y-1">
                  <p>Factory: {run.factory}</p>
                  <p>
                    Started: {new Date(run.startsAt).toLocaleDateString()}
                  </p>
                  {run.endsAt && (
                    <p>Ended: {new Date(run.endsAt).toLocaleDateString()}</p>
                  )}
                  {run.archivedAt && (
                    <p className="text-gray-400">
                      Archived: {new Date(run.archivedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <span className="text-sm text-blue-600 hover:text-blue-700">
                    View Board →
                  </span>
                </div>
              </Link>
              <div className="mt-3 pt-3 border-t border-gray-200">
                <button
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (archiving === run.id) return;
                    setArchiving(run.id);
                    try {
                      if (run.archived) {
                        await unarchiveRun(run.id);
                      } else {
                        await archiveRun(run.id);
                      }
                    } catch (error) {
                      console.error("Error archiving run:", error);
                      alert("Failed to archive run. Please try again.");
                    } finally {
                      setArchiving(null);
                    }
                  }}
                  disabled={archiving === run.id}
                  className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors ${
                    run.archived
                      ? "bg-green-50 text-green-700 hover:bg-green-100"
                      : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                  } disabled:opacity-50`}
                >
                  {archiving === run.id ? (
                    "Processing..."
                  ) : run.archived ? (
                    <>
                      <ArchiveRestore className="w-4 h-4" />
                      Unarchive
                    </>
                  ) : (
                    <>
                      <Archive className="w-4 h-4" />
                      Archive
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </AppLayout>
  );
}
