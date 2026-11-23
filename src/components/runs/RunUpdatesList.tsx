"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { deleteRunUpdate, subscribeRunUpdates, recordAuditLog, recordRunUpdateViewed } from "@/lib/firestore";
import { deleteRunUpdateImages } from "@/lib/storage";
import { MessageSquare, Calendar, Image as ImageIcon, ThumbsUp, Info, Trash2 } from "lucide-react";
import type { RunUpdate } from "@/types/guitars";

interface RunUpdatesListProps {
  runId: string;
  clientOnly?: boolean; // If true, only show updates visible to clients
  maxUpdates?: number; // Limit number of updates to display
  guitarId?: string; // Optional, for audit log when client views updates
}

export function RunUpdatesList({
  runId,
  clientOnly = true,
  maxUpdates = 10,
  guitarId,
}: RunUpdatesListProps) {
  const { currentUser, userRole } = useAuth();
  const [updates, setUpdates] = useState<RunUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingUpdateId, setDeletingUpdateId] = useState<string | null>(null);
  const loggedViewRunUpdates = useRef(false);
  const canDelete = userRole === "staff" || userRole === "admin";

  const handleDelete = async (update: RunUpdate) => {
    if (
      !confirm(
        `Delete the run update "${update.title}"?\n\nIt will disappear from every client's portal. Emails already sent cannot be recalled.`
      )
    ) {
      return;
    }

    setDeletingUpdateId(update.id);
    try {
      await deleteRunUpdateImages(update.imageUrls || []);
      await deleteRunUpdate(runId, update.id);
    } catch (error) {
      console.error("Failed to delete run update:", error);
      alert("Failed to delete the run update. Please try again.");
    } finally {
      setDeletingUpdateId(null);
    }
  };

  // Audit: log when client views run updates (once per mount)
  useEffect(() => {
    if (!runId || !clientOnly || userRole !== "client" || loggedViewRunUpdates.current) return;
    loggedViewRunUpdates.current = true;
    const details: Record<string, unknown> = { runId };
    if (guitarId) details.guitarId = guitarId;
    recordAuditLog("view_run_updates", details).catch(() => {});
  }, [runId, clientOnly, userRole, guitarId]);

  useEffect(() => {
    if (!runId) {
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeRunUpdates(runId, (loadedUpdates) => {
      const limitedUpdates = maxUpdates
        ? loadedUpdates.slice(0, maxUpdates)
        : loadedUpdates;
      setUpdates(limitedUpdates);
      setLoading(false);
    }, clientOnly);

    return () => unsubscribe();
  }, [runId, clientOnly, maxUpdates]);

  if (loading) {
    return (
      <div className="text-sm text-gray-500">Loading updates...</div>
    );
  }

  if (updates.length === 0) {
    return (
      <div className="text-sm text-gray-500 text-center py-4">
        No updates yet for this run
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {updates.map((update) => (
        <div
          key={update.id}
          className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-600" />
              <h4 className="font-semibold text-gray-900">{update.title}</h4>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Calendar className="w-3 h-3" />
                {new Date(update.createdAt).toLocaleDateString("en-AU", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </div>
              {canDelete && (
                <button
                  type="button"
                  onClick={() => handleDelete(update)}
                  disabled={deletingUpdateId === update.id}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                  title="Delete run update"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {deletingUpdateId === update.id ? "Deleting…" : "Delete"}
                </button>
              )}
            </div>
          </div>
          
          <p className="text-sm text-gray-700 mb-3 whitespace-pre-wrap">
            {update.message}
          </p>

          {update.imageUrls && update.imageUrls.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-3">
              {update.imageUrls.map((imageUrl, index) => (
                <a
                  key={index}
                  href={imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative group"
                >
                  <img
                    src={imageUrl}
                    alt={`Update image ${index + 1}`}
                    className="w-full h-24 object-cover rounded-lg border border-gray-200 hover:border-blue-400 transition-colors"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 rounded-lg flex items-center justify-center transition-opacity">
                    <ImageIcon className="w-4 h-4 text-white opacity-0 group-hover:opacity-100" />
                  </div>
                </a>
              ))}
            </div>
          )}

          {/* Thumbs up (mark as viewed) - client only */}
          {userRole === "client" && currentUser && (
            <div className="mt-3 flex items-center gap-2">
              {update.viewedBy?.[currentUser.uid] ? (
                <span className="inline-flex items-center gap-1.5 text-sm text-green-600">
                  <ThumbsUp className="w-4 h-4 fill-current" />
                  Viewed by you
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => recordRunUpdateViewed(runId, update.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <ThumbsUp className="w-4 h-4" />
                  Mark as viewed
                </button>
              )}
            </div>
          )}

          {clientOnly && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 flex gap-2">
                <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" aria-hidden />
                <span>
                  Run updates are factory announcements only. The Ormsby team does not monitor
                  comments here. To reply to a build update, use{" "}
                  <strong>Updates &amp; Progress</strong> on this page. For any{" "}
                  <strong>spec changes</strong>, email{" "}
                  <a
                    href="mailto:guitars@ormsbyguitars.com"
                    className="font-semibold underline underline-offset-2 text-amber-900"
                  >
                    guitars@ormsbyguitars.com
                  </a>
                  .
                </span>
              </p>
            </div>
          )}

          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Posted by {update.authorName}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}








