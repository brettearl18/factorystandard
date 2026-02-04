"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  subscribeAllCustomShopRequests,
  updateCustomShopRequest,
  getCustomShopRequest,
  deleteCustomShopRequest,
} from "@/lib/firestore";
import type { CustomShopRequest } from "@/types/guitars";
import {
  ArrowLeft,
  FileText,
  CheckCircle,
  XCircle,
  Loader2,
  X,
  AlertCircle,
  DollarSign,
  Trash2,
} from "lucide-react";

const STAFF_REQUEST_DETAIL_URL = (requestId: string) =>
  `/settings/custom-shop-requests?requestId=${requestId}`;

function StatusBadge({ status }: { status: CustomShopRequest["status"] }) {
  const map: Record<CustomShopRequest["status"], { label: string; className: string }> = {
    pending: { label: "Pending", className: "bg-amber-100 text-amber-800" },
    approved: { label: "Approved", className: "bg-green-100 text-green-800" },
    rejected: { label: "Rejected", className: "bg-red-100 text-red-800" },
    converted: { label: "Converted", className: "bg-blue-100 text-blue-800" },
  };
  const s = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.className}`}>
      {s.label}
    </span>
  );
}

function CustomShopRequestsAdminContent() {
  const { currentUser, userRole, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [requests, setRequests] = useState<CustomShopRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailRequest, setDetailRequest] = useState<CustomShopRequest | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const requestIdFromUrl = searchParams.get("requestId");

  useEffect(() => {
    if (authLoading) return;
    if (!currentUser) {
      router.push("/login");
      return;
    }
    if (userRole !== "staff" && userRole !== "admin") {
      router.push("/settings");
      return;
    }
  }, [currentUser, userRole, authLoading, router]);

  useEffect(() => {
    if (!currentUser || (userRole !== "staff" && userRole !== "admin")) return;
    const unsub = subscribeAllCustomShopRequests((data) => {
      setRequests(data);
      setLoading(false);
    });
    return () => unsub();
  }, [currentUser, userRole]);

  // Open detail from query param
  useEffect(() => {
    if (!requestIdFromUrl) {
      if (!detailRequest) return;
      setDetailRequest(null);
      return;
    }
    const r = requests.find((x) => x.id === requestIdFromUrl);
    if (r) {
      setDetailRequest(r);
      setDetailLoading(false);
    } else {
      setDetailLoading(true);
      getCustomShopRequest(requestIdFromUrl).then((req) => {
        setDetailRequest(req || null);
        setDetailLoading(false);
      });
    }
  }, [requestIdFromUrl, requests]);

  const openDetail = (r: CustomShopRequest) => {
    setDetailRequest(r);
    setRejectReason("");
    router.replace(STAFF_REQUEST_DETAIL_URL(r.id), { scroll: false });
  };

  const closeDetail = () => {
    setDetailRequest(null);
    setRejectReason("");
    router.replace("/settings/custom-shop-requests", { scroll: false });
  };

  const handleApprove = async () => {
    if (!detailRequest || !currentUser) return;
    setError(null);
    setActionLoading(true);
    try {
      await updateCustomShopRequest(detailRequest.id, {
        status: "approved",
        reviewedBy: currentUser.uid,
        reviewedAt: Date.now(),
      });
      setDetailRequest((prev) => (prev ? { ...prev, status: "approved", reviewedBy: currentUser.uid, reviewedAt: Date.now() } : null));
      closeDetail();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to approve");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!detailRequest || !currentUser) return;
    const reason = rejectReason.trim();
    if (!reason) {
      setError("Please enter a reason for rejection.");
      return;
    }
    setError(null);
    setActionLoading(true);
    try {
      await updateCustomShopRequest(detailRequest.id, {
        status: "rejected",
        reviewedBy: currentUser.uid,
        reviewedAt: Date.now(),
        rejectionReason: reason,
      });
      setDetailRequest((prev) =>
        prev ? { ...prev, status: "rejected", reviewedBy: currentUser.uid, reviewedAt: Date.now(), rejectionReason: reason } : null
      );
      closeDetail();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reject");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!detailRequest) return;
    const requestNum = `CS-${detailRequest.id.slice(-6).toUpperCase()}`;
    if (!window.confirm(`Remove Custom Shop request ${requestNum}? This cannot be undone.`)) return;
    setError(null);
    setActionLoading(true);
    try {
      await deleteCustomShopRequest(detailRequest.id);
      closeDetail();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove request");
    } finally {
      setActionLoading(false);
    }
  };

  if (authLoading || !currentUser) return null;
  if (userRole !== "staff" && userRole !== "admin") return null;

  return (
    <>
    <AppLayout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/settings"
            className="text-gray-600 hover:text-gray-900 flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Settings
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Custom Shop requests</h1>
        <p className="text-gray-600 mb-6">Review and approve or reject Custom Shop submissions.</p>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600">No Custom Shop requests yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Request</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">From</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Date</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Summary</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase w-24">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-3 px-4">
                        <span className="font-mono text-sm font-medium text-amber-700">
                          CS-{r.id.slice(-6).toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <span className="text-gray-900">{r.submitterName || "—"}</span>
                        <br />
                        <span className="text-gray-500 text-xs">{r.submitterEmail}</span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {new Date(r.createdAt).toLocaleDateString("en-AU", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 max-w-xs truncate">
                        {r.model ? `${r.model}: ` : ""}
                        {r.guitarDescription.slice(0, 60)}
                        {r.guitarDescription.length > 60 ? "…" : ""}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => openDetail(r)}
                          className="text-amber-600 hover:text-amber-700 font-medium text-sm"
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Detail modal */}
        {(detailRequest || detailLoading) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-900">
                  {detailRequest ? `Request CS-${detailRequest.id.slice(-6).toUpperCase()}` : "Loading…"}
                </h2>
                <button
                  type="button"
                  onClick={closeDetail}
                  className="p-2 text-gray-500 hover:text-gray-700 rounded-lg"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-4">
                {detailLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
                  </div>
                ) : detailRequest ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-1">From</p>
                      <p className="text-gray-900">
                        {detailRequest.submitterName || ""} {detailRequest.submitterEmail}
                      </p>
                    </div>
                    {detailRequest.model && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Model</p>
                        <p className="text-gray-900">{detailRequest.model}</p>
                      </div>
                    )}
                    {detailRequest.specs && Object.keys(detailRequest.specs).length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Specs</p>
                        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                          {(Object.entries(detailRequest.specs) as [string, string][]).map(
                            ([key, value]) =>
                              value != null && String(value).trim() !== "" ? (
                                <div key={key} className="flex gap-2">
                                  <dt className="text-gray-500 capitalize">
                                    {key.replace(/([A-Z])/g, " $1").trim()}:
                                  </dt>
                                  <dd className="text-gray-900">{value}</dd>
                                </div>
                              ) : null
                          )}
                        </dl>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Dream guitar</p>
                      <p className="text-gray-900 whitespace-pre-wrap text-sm">{detailRequest.guitarDescription}</p>
                    </div>
                    {detailRequest.motivationNotes && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Why this build</p>
                        <p className="text-gray-700 text-sm whitespace-pre-wrap">{detailRequest.motivationNotes}</p>
                      </div>
                    )}
                    {detailRequest.additionalNotes && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Anything else</p>
                        <p className="text-gray-700 text-sm whitespace-pre-wrap">{detailRequest.additionalNotes}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <DollarSign className="w-4 h-4" />
                      Deposit agreed: $1,000 AUD
                    </div>
                    {detailRequest.inspirationImageUrls.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Inspiration images</p>
                        <div className="grid grid-cols-3 gap-2">
                          {detailRequest.inspirationImageUrls.map((url, i) => (
                            <a
                              key={i}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block aspect-square rounded-lg overflow-hidden bg-gray-100 border border-gray-200"
                            >
                              <img src={url} alt="" className="w-full h-full object-cover" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                    {error && (
                      <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        {error}
                      </div>
                    )}
                    {detailRequest.status === "pending" && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Rejection reason (required if rejecting)
                          </label>
                          <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="e.g. We can't accommodate this spec at this time."
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                        </div>
                        <div className="flex gap-3 pt-2">
                          <button
                            type="button"
                            onClick={handleApprove}
                            disabled={actionLoading}
                            className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-60"
                          >
                            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={handleReject}
                            disabled={actionLoading || !rejectReason.trim()}
                            className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                            Reject
                          </button>
                        </div>
                      </>
                    )}
                    {detailRequest.status !== "pending" && (
                      <div className="pt-2">
                        <StatusBadge status={detailRequest.status} />
                        {detailRequest.rejectionReason && (
                          <p className="text-sm text-red-600 mt-2">Reason: {detailRequest.rejectionReason}</p>
                        )}
                      </div>
                    )}
                    <div className="pt-4 mt-4 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={handleRemove}
                        disabled={actionLoading}
                        className="inline-flex items-center gap-2 py-2 px-3 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg border border-red-200 hover:border-red-300 transition-colors disabled:opacity-60"
                      >
                        <Trash2 className="w-4 h-4" />
                        Remove this request
                      </button>
                      <p className="text-xs text-gray-500 mt-1">Permanently delete this Custom Shop request. Cannot be undone.</p>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
    </>
  );
}

export default function CustomShopRequestsAdminPage() {
  return (
    <Suspense fallback={
      <AppLayout>
        <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[40vh]">
          <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
        </div>
      </AppLayout>
    }>
      <CustomShopRequestsAdminContent />
    </Suspense>
  );
}
