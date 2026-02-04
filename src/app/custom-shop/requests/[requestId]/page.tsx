"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getCustomShopRequest } from "@/lib/firestore";
import type { CustomShopRequest } from "@/types/guitars";
import { ArrowLeft, Clock, CheckCircle, XCircle, Guitar, DollarSign } from "lucide-react";

function StatusBadge({ status }: { status: CustomShopRequest["status"] }) {
  const map: Record<CustomShopRequest["status"], { label: string; className: string; icon: React.ReactNode }> = {
    pending: { label: "Pending review", className: "bg-amber-100 text-amber-800", icon: <Clock className="w-4 h-4" /> },
    approved: { label: "Approved", className: "bg-green-100 text-green-800", icon: <CheckCircle className="w-4 h-4" /> },
    rejected: { label: "Rejected", className: "bg-red-100 text-red-800", icon: <XCircle className="w-4 h-4" /> },
    converted: { label: "Converted to build", className: "bg-blue-100 text-blue-800", icon: <Guitar className="w-4 h-4" /> },
  };
  const s = map[status];
  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${s.className}`}>
      {s.icon}
      {s.label}
    </span>
  );
}

export default function CustomShopRequestDetailPage() {
  const { currentUser } = useAuth();
  const params = useParams();
  const router = useRouter();
  const requestId = params?.requestId as string | undefined;
  const [request, setRequest] = useState<CustomShopRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!requestId || !currentUser?.uid) return;
    let cancelled = false;
    getCustomShopRequest(requestId).then((r) => {
      if (cancelled) return;
      if (!r) {
        setError("Request not found");
        setRequest(null);
      } else if (r.submitterUid !== currentUser.uid) {
        setError("You don’t have access to this request");
        setRequest(null);
      } else {
        setRequest(r);
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [requestId, currentUser?.uid]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="space-y-4">
        <Link href="/custom-shop/requests" className="text-amber-600 hover:text-amber-700 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          Back to my requests
        </Link>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
          {error || "Request not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/custom-shop/requests"
          className="text-gray-600 hover:text-gray-900 flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to my requests
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Custom Shop request</h1>
          <p className="text-sm text-amber-700 font-medium mt-0.5">
            {request.id ? "CS-" + request.id.slice(-6).toUpperCase() : ""}
          </p>
        </div>
        <StatusBadge status={request.status} />
      </div>

      <p className="text-sm text-gray-500">
        Submitted {new Date(request.createdAt).toLocaleDateString("en-AU", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      </p>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {request.model && (
          <div className="p-5 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Model</h2>
            <p className="text-gray-900 font-medium">{request.model}</p>
          </div>
        )}
        {request.specs && Object.keys(request.specs).length > 0 && (
          <div className="p-5 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Specs</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {(Object.entries(request.specs) as [string, string][]).map(([key, value]) =>
                value != null && String(value).trim() !== "" ? (
                  <div key={key} className="flex gap-2">
                    <dt className="text-gray-500 capitalize">{key.replace(/([A-Z])/g, " $1").trim()}:</dt>
                    <dd className="text-gray-900">{value}</dd>
                  </div>
                ) : null
              )}
            </dl>
          </div>
        )}
        <div className="p-5 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Your dream guitar</h2>
          <p className="text-gray-900 whitespace-pre-wrap">{request.guitarDescription}</p>
        </div>
        {request.motivationNotes && (
          <div className="p-5 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Why this build</h2>
            <p className="text-gray-900 whitespace-pre-wrap">{request.motivationNotes}</p>
          </div>
        )}
        {request.additionalNotes && (
          <div className="p-5 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Anything else</h2>
            <p className="text-gray-900 whitespace-pre-wrap">{request.additionalNotes}</p>
          </div>
        )}
        <div className="p-5 border-b border-gray-100 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-gray-400" />
          <span className="text-gray-700">Deposit agreed: $1,000 AUD</span>
        </div>
        {request.inspirationImageUrls.length > 0 && (
          <div className="p-5">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Inspiration images</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {request.inspirationImageUrls.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block aspect-square rounded-lg overflow-hidden bg-gray-100 border border-gray-200"
                >
                  <img src={url} alt={`Inspiration ${i + 1}`} className="w-full h-full object-cover" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {request.status === "rejected" && request.rejectionReason && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <h3 className="font-medium text-red-800 mb-1">Rejection reason</h3>
          <p className="text-red-700 text-sm">{request.rejectionReason}</p>
        </div>
      )}

      {(request.status === "approved" || request.status === "converted") && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-green-800 text-sm">
            {request.status === "converted"
              ? "Your request has been converted to a build. Check your guitars for updates."
              : "Your request has been approved. Our team will be in touch."}
          </p>
        </div>
      )}
    </div>
  );
}
