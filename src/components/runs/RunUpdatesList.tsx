"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeRunUpdates, recordAuditLog, recordRunUpdateViewed, addRunUpdateComment, subscribeRunUpdateComments } from "@/lib/firestore";
import { MessageSquare, Calendar, Image as ImageIcon, ThumbsUp, Loader2 } from "lucide-react";
import type { RunUpdate, RunUpdateComment } from "@/types/guitars";

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
  const [commentMap, setCommentMap] = useState<Record<string, RunUpdateComment[]>>({});
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({});
  const [submittingCommentUpdateId, setSubmittingCommentUpdateId] = useState<string | null>(null);
  const loggedViewRunUpdates = useRef(false);

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

  // Subscribe to comments for each update (when client view and we have updates)
  useEffect(() => {
    if (!runId || updates.length === 0) return;
    const unsubs: (() => void)[] = [];
    updates.forEach((update) => {
      unsubs.push(
        subscribeRunUpdateComments(runId, update.id, (comments) => {
          setCommentMap((prev) => ({ ...prev, [update.id]: comments }));
        })
      );
    });
    return () => unsubs.forEach((u) => u());
  }, [runId, updates.map((u) => u.id).join(",")]);

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
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Calendar className="w-3 h-3" />
              {new Date(update.createdAt).toLocaleDateString("en-AU", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
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

          {/* Comments */}
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-500 mb-2">
              Comments ({(commentMap[update.id] ?? []).length})
            </p>
            {(commentMap[update.id] ?? []).length > 0 && (
              <ul className="space-y-2 mb-3">
                {(commentMap[update.id] ?? []).map((c) => (
                  <li key={c.id} className="text-sm bg-gray-50 rounded-lg px-3 py-2">
                    <span className="font-medium text-gray-900">{c.authorName}</span>
                    <span className="text-gray-500 text-xs ml-2">
                      {new Date(c.createdAt).toLocaleDateString()}{" "}
                      {new Date(c.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <p className="text-gray-700 mt-0.5">{c.message}</p>
                  </li>
                ))}
              </ul>
            )}
            {currentUser && (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add a comment..."
                  value={commentDraft[update.id] ?? ""}
                  onChange={(e) => setCommentDraft((prev) => ({ ...prev, [update.id]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const msg = (commentDraft[update.id] ?? "").trim();
                      if (msg && submittingCommentUpdateId !== update.id) {
                        setSubmittingCommentUpdateId(update.id);
                        addRunUpdateComment(runId, update.id, msg)
                          .then(() => setCommentDraft((prev) => ({ ...prev, [update.id]: "" })))
                          .catch((err) => console.error(err))
                          .finally(() => setSubmittingCommentUpdateId(null));
                      }
                    }
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  disabled={!(commentDraft[update.id]?.trim()) || submittingCommentUpdateId === update.id}
                  onClick={() => {
                    const msg = (commentDraft[update.id] ?? "").trim();
                    if (!msg || submittingCommentUpdateId === update.id) return;
                    setSubmittingCommentUpdateId(update.id);
                    addRunUpdateComment(runId, update.id, msg)
                      .then(() => setCommentDraft((prev) => ({ ...prev, [update.id]: "" })))
                      .catch((err) => console.error(err))
                      .finally(() => setSubmittingCommentUpdateId(null));
                  }}
                  className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingCommentUpdateId === update.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Post"}
                </button>
              </div>
            )}
          </div>

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








