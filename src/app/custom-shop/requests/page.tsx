"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import Link from "next/link";
import { subscribeCustomShopRequestsByUser } from "@/lib/firestore";
import type { CustomShopRequest } from "@/types/guitars";
import { Guitar, ArrowLeft, FileText, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";

function StatusBadge({ status }: { status: CustomShopRequest["status"] }) {
  const map: Record<CustomShopRequest["status"], { label: string; className: string; icon: React.ReactNode }> = {
    pending: { label: "Pending", className: "bg-amber-100 text-amber-800", icon: <Clock className="w-3.5 h-3.5" /> },
    approved: { label: "Approved", className: "bg-teal/10 text-teal", icon: <CheckCircle className="w-3.5 h-3.5" /> },
    rejected: { label: "Rejected", className: "bg-red-100 text-red-800", icon: <XCircle className="w-3.5 h-3.5" /> },
    converted: { label: "Converted to build", className: "bg-accent/10 text-accent", icon: <Guitar className="w-3.5 h-3.5" /> },
  };
  const s = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium ${s.className}`}>
      {s.icon}
      {s.label}
    </span>
  );
}

export default function CustomShopRequestsPage() {
  const { currentUser } = useAuth();
  const [requests, setRequests] = useState<CustomShopRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.uid) return;
    const unsub = subscribeCustomShopRequestsByUser(currentUser.uid, (data) => {
      setRequests(data);
      setLoading(false);
    });
    return () => unsub();
  }, [currentUser?.uid]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/custom-shop"
          className="text-slate-500 hover:text-slate-900 flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
      </div>
      <h1 className="text-2xl font-semibold text-slate-900">My Custom Shop requests</h1>

      {requests.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 mb-4">You haven&apos;t submitted any requests yet.</p>
          <Link
            href="/custom-shop/submit"
            className="inline-flex items-center gap-2 text-accent font-medium hover:text-accent-light transition-colors"
          >
            Submit your first request
            <ArrowLeft className="w-4 h-4 rotate-180" />
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {requests.map((r) => {
            const requestNumber = "CS-" + r.id.slice(-6).toUpperCase();
            const thumbUrl = r.inspirationImageUrls?.[0];
            return (
              <li key={r.id}>
                <Link
                  href={`/custom-shop/requests/${r.id}`}
                  className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5 hover:border-accent/30 hover:shadow-sm transition-all"
                >
                  <div className="w-20 h-20 rounded-2xl bg-slate-100 flex-shrink-0 overflow-hidden border border-slate-200">
                    {thumbUrl ? (
                      <img
                        src={thumbUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <Guitar className="w-8 h-8" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-accent bg-accent/10 px-2 py-0.5 rounded-lg">
                        {requestNumber}
                      </span>
                      <span className="text-sm text-slate-500">
                        {new Date(r.createdAt).toLocaleDateString("en-AU", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      <StatusBadge status={r.status} />
                    </div>
                    <p className="text-slate-900 font-medium line-clamp-2">{r.guitarDescription}</p>
                    {r.rejectionReason && (
                      <p className="text-sm text-red-600 mt-1">Reason: {r.rejectionReason}</p>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
