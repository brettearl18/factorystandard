"use client";

import { useEffect, useState } from "react";
import { subscribeRunUpdates } from "@/lib/firestore";
import { MessageSquare, Calendar, Image as ImageIcon } from "lucide-react";
import type { RunUpdate } from "@/types/guitars";

interface RunUpdatesListProps {
  runId: string;
  clientOnly?: boolean; // If true, only show updates visible to clients
  maxUpdates?: number; // Limit number of updates to display
}

export function RunUpdatesList({ 
  runId, 
  clientOnly = true,
  maxUpdates = 10 
}: RunUpdatesListProps) {
  const [updates, setUpdates] = useState<RunUpdate[]>([]);
  const [loading, setLoading] = useState(true);

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

