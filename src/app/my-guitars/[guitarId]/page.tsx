"use client";

import { use } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { useClientProfile } from "@/hooks/useClientProfile";
import { useClientInvoices } from "@/hooks/useClientInvoices";
import { useClientGuitars } from "@/hooks/useClientGuitars";
import {
  getGuitar,
  subscribeGuitar,
  subscribeGuitarNotes,
  getRun,
  subscribeRunStages,
  subscribeRunUpdates,
  addGuitarGalleryImages,
  recordAuditLog,
  recordGuitarNoteViewed,
  addGuitarNoteComment,
  subscribeGuitarNoteComments,
} from "@/lib/firestore";
import { isExternalShareLink, isFirebaseStorageUrl, uploadGuitarGalleryImage } from "@/lib/storage";
import { ExternalShareLink } from "@/components/shared/ExternalShareLink";
import { InvoiceList } from "@/components/client/InvoiceList";
import { RecordPaymentModal } from "@/components/client/RecordPaymentModal";
import { RunUpdatesList } from "@/components/runs/RunUpdatesList";
import { ArrowLeft, Camera, CheckCircle, Circle, TreePine, Zap, Music, Palette, Settings, ExternalLink, FileText, Download, Eye, EyeOff, Upload, X, Loader2, ThumbsUp, MessageSquare, Image as ImageIcon } from "lucide-react";
import type { GuitarBuild, GuitarNote, RunStage, InvoiceRecord, NoteComment, RunUpdate } from "@/types/guitars";
import { getNoteTypeLabel, getNoteTypeIcon, getNoteTypeColor } from "@/utils/noteTypes";

type UpdateGalleryItem = {
  url: string;
  createdAt: number;
  source: "guitar" | "run";
  label: string;
};

const formatCurrency = (amount: number, currency: string = "AUD") =>
  new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);

export default function GuitarDetailPage({
  params,
}: {
  params: Promise<{ guitarId: string }>;
}) {
  const { guitarId } = use(params);
  const searchParams = useSearchParams();
  const { currentUser, userRole, loading: authLoading } = useAuth();
  const router = useRouter();
  const [guitar, setGuitar] = useState<GuitarBuild | null>(null);
  const [notes, setNotes] = useState<GuitarNote[]>([]);
  const [runUpdates, setRunUpdates] = useState<RunUpdate[]>([]);
  const [stage, setStage] = useState<RunStage | null>(null);
  const [allStages, setAllStages] = useState<RunStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [clientViewMode, setClientViewMode] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<InvoiceRecord | null>(null);
  const clientProfile = useClientProfile(guitar?.clientUid ?? null);
  const clientGuitars = useClientGuitars(guitar?.clientUid ?? null);
  const canLoadInvoices =
    guitar &&
    ((userRole === "client" && guitar.clientUid === currentUser?.uid) ||
      (userRole === "staff" || userRole === "admin"));
  const invoices = useClientInvoices(canLoadInvoices ? guitar?.clientUid ?? null : null);
  const isAdminViewing = (userRole === "staff" || userRole === "admin") && !clientViewMode;
  
  // Gallery upload state (client only)
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [showGalleryUpload, setShowGalleryUpload] = useState(false);

  // Comments per note (noteId -> comments)
  const [commentMap, setCommentMap] = useState<Record<string, NoteComment[]>>({});
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({});
  const [submittingCommentNoteId, setSubmittingCommentNoteId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!currentUser) {
      router.push("/login");
      return;
    }

    // Allow staff/admin to view client guitar pages (for client management)
    if (userRole !== "client" && userRole !== "staff" && userRole !== "admin") {
      router.push("/");
      return;
    }
  }, [currentUser, userRole, authLoading, router]);

  // When opened with ?viewAsClient=1 (e.g. from modal "View as Client"), show client view with thumbs up & comments
  useEffect(() => {
    if (searchParams.get("viewAsClient") === "1" && (userRole === "staff" || userRole === "admin")) {
      setClientViewMode(true);
    }
  }, [searchParams, userRole]);

  // Audit: log when client views a guitar (once per guitar per visit)
  const loggedViewGuitar = useRef<string | null>(null);
  useEffect(() => {
    if (!currentUser || userRole !== "client" || !guitar || loggedViewGuitar.current === guitar.id) return;
    loggedViewGuitar.current = guitar.id;
    recordAuditLog("view_guitar", { guitarId: guitar.id, runId: guitar.runId }).catch(() => {});
  }, [currentUser, userRole, guitar]);

  useEffect(() => {
    // Allow staff/admin to view, but only load data if authenticated
    if (!currentUser) return;

    let unsubscribeGuitar: (() => void) | null = null;
    let unsubscribeStages: (() => void) | null = null;
    let unsubscribeNotes: (() => void) | null = null;

    let currentRunId: string | null = null;

    // Load initial guitar first to verify ownership before subscribing
    const loadInitialData = async () => {
      try {
        // First get the guitar to know which run it belongs to and verify ownership
        const initialGuitar = await getGuitar(guitarId);
        if (!initialGuitar) {
          setLoading(false);
          return;
        }

        // For clients, verify they own this guitar BEFORE subscribing
        if (userRole === "client") {
          if (!initialGuitar.clientUid || initialGuitar.clientUid !== currentUser.uid) {
            router.push("/my-guitars");
            setLoading(false);
            return;
          }
        }

        // Now that ownership is verified, set guitar and subscribe
        setGuitar(initialGuitar);
        setLoading(false);
        currentRunId = initialGuitar.runId;

        // Subscribe to guitar updates in real-time (only after ownership verified)
        unsubscribeGuitar = subscribeGuitar(guitarId, (guitarData) => {
          if (!guitarData) {
            return;
          }

          // For clients, verify they still own this guitar
          if (userRole === "client" && guitarData.clientUid !== currentUser.uid) {
            router.push("/my-guitars");
            return;
          }

          setGuitar(guitarData);

          // If runId changed, resubscribe to stages
          if (guitarData.runId !== currentRunId) {
            currentRunId = guitarData.runId;
            
            // Unsubscribe from old stages if any
            if (unsubscribeStages) {
              unsubscribeStages();
            }

            // Subscribe to stages for the guitar's current run
            unsubscribeStages = subscribeRunStages(guitarData.runId, (stages) => {
              const sortedStages = [...stages].sort((a, b) => a.order - b.order);
              setAllStages(sortedStages);
            });
          }
        });

        // Subscribe to stages for this run
        unsubscribeStages = subscribeRunStages(initialGuitar.runId, (stages) => {
          const sortedStages = [...stages].sort((a, b) => a.order - b.order);
          setAllStages(sortedStages);
        });

        // Subscribe to notes
        // For clients or admin in client view mode, use clientOnly=true to filter in the query (required by security rules)
        const shouldFilterClientOnly = userRole === "client" || (clientViewMode && (userRole === "staff" || userRole === "admin"));
        unsubscribeNotes = subscribeGuitarNotes(guitarId, (allNotes) => {
          // If client or in client view mode, notes are already filtered by visibleToClient in the query
          // If staff/admin in normal mode, get all notes
          setNotes(allNotes);
        }, shouldFilterClientOnly);
      } catch (error: any) {
        console.error("Error loading initial data:", error);
        // If it's a permission error for clients, redirect them
        if (userRole === "client" && error?.code === "permission-denied") {
          router.push("/my-guitars");
        }
        setLoading(false);
      }
    };

    loadInitialData();

    return () => {
      if (unsubscribeGuitar) unsubscribeGuitar();
      if (unsubscribeStages) unsubscribeStages();
      if (unsubscribeNotes) unsubscribeNotes();
    };
  }, [guitarId, currentUser, userRole, router, clientViewMode]);

  // Subscribe to comments for each visible note (client or staff viewing)
  useEffect(() => {
    if (!guitarId || notes.length === 0) return;
    const unsubs: (() => void)[] = [];
    notes.forEach((note) => {
      unsubs.push(
        subscribeGuitarNoteComments(guitarId, note.id, (comments) => {
          setCommentMap((prev) => ({ ...prev, [note.id]: comments }));
        })
      );
    });
    return () => unsubs.forEach((u) => u());
  }, [guitarId, notes.map((n) => n.id).join(",")]);

  // Run updates (for hero photo gallery) — respect client visibility
  useEffect(() => {
    if (!guitar?.runId) {
      setRunUpdates([]);
      return;
    }
    const clientOnly =
      userRole === "client" ||
      (clientViewMode && (userRole === "staff" || userRole === "admin"));
    const unsubscribe = subscribeRunUpdates(
      guitar.runId,
      (updates) => setRunUpdates(updates),
      clientOnly
    );
    return () => unsubscribe();
  }, [guitar?.runId, userRole, clientViewMode]);

  // Update stage state when guitar or stages change
  // This must be before any early returns to follow Rules of Hooks
  useEffect(() => {
    if (guitar && allStages.length > 0) {
      const currentStageFromGuitar = allStages.find((s) => s.id === guitar.stageId);
      if (currentStageFromGuitar) {
        setStage(currentStageFromGuitar);
      } else {
        // Debug: log if stage not found
        console.log("Current guitar stageId:", guitar.stageId);
        console.log("Available stage IDs:", allStages.map(s => ({ id: s.id, label: s.label })));
      }
    }
  }, [guitar?.stageId, allStages]);

  // Latest photos from guitar notes + run updates (newest first)
  const updateGallery = useMemo(() => {
    const items: UpdateGalleryItem[] = [];
    const seen = new Set<string>();

    const pushUrl = (
      url: string | undefined,
      createdAt: number,
      source: "guitar" | "run",
      label: string
    ) => {
      if (!url?.trim() || seen.has(url)) return;
      if (isExternalShareLink(url)) return;
      // Prefer real uploaded images; allow http(s) non-share links as fallback
      if (!isFirebaseStorageUrl(url) && !/^https?:\/\//i.test(url)) return;
      seen.add(url);
      items.push({ url, createdAt, source, label });
    };

    for (const note of notes) {
      for (const url of note.photoUrls || []) {
        pushUrl(url, note.createdAt, "guitar", note.message?.slice(0, 80) || "Guitar update");
      }
    }
    for (const update of runUpdates) {
      for (const url of update.imageUrls || []) {
        pushUrl(
          url,
          update.createdAt,
          "run",
          update.title || update.message?.slice(0, 80) || "Run update"
        );
      }
    }

    return items.sort((a, b) => b.createdAt - a.createdAt).slice(0, 12);
  }, [notes, runUpdates]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!guitar) {
    return null;
  }

  const clientStatus = stage?.clientStatusLabel || "In Progress";
  
  // TEMP: hide invoices from clients / client-view; staff can still manage outside client view
  const canViewInvoices =
    (userRole === "staff" || userRole === "admin") &&
    !clientViewMode &&
    Boolean(guitar?.clientUid);
  
  // Filter invoices to only show those related to this guitar (if guitarId is set)
  const filteredInvoices = guitar?.id 
    ? invoices.filter(inv => !inv.guitarId || inv.guitarId === guitar.id)
    : invoices;
  
  // Handle gallery image selection
  const handleGalleryImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setGalleryFiles((prev) => [...prev, ...files].slice(0, 10)); // Max 10 images
      
      // Create previews
      files.forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setGalleryPreviews((prev) => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleRemoveGalleryImage = (index: number) => {
    setGalleryFiles((prev) => prev.filter((_, i) => i !== index));
    setGalleryPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUploadGallery = async () => {
    if (galleryFiles.length === 0 || !guitar || !currentUser) return;
    
    setUploadingGallery(true);
    try {
      // Upload all images
      const uploadedUrls: string[] = [];
      for (const file of galleryFiles) {
        const url = await uploadGuitarGalleryImage(guitar.id, file);
        uploadedUrls.push(url);
      }
      
      // Add to guitar's referenceImages
      await addGuitarGalleryImages(guitar.id, uploadedUrls);
      
      // Clear upload state
      setGalleryFiles([]);
      setGalleryPreviews([]);
      setShowGalleryUpload(false);
    } catch (error: any) {
      console.error("Error uploading gallery images:", error);
      alert(error.message || "Failed to upload images. Please try again.");
    } finally {
      setUploadingGallery(false);
    }
  };
  
  // Collect all photos
  const allPhotos: string[] = [];
  if (guitar.referenceImages) {
    allPhotos.push(...guitar.referenceImages);
  }
  notes.forEach((note) => {
    if (note.photoUrls) {
      allPhotos.push(...note.photoUrls);
    }
  });
  if (guitar.coverPhotoUrl && !allPhotos.includes(guitar.coverPhotoUrl)) {
    allPhotos.unshift(guitar.coverPhotoUrl);
  }

  // Calculate progress and current stage
  // Update current stage based on guitar's stageId (which updates in real-time)
  const currentStageIndex = allStages.findIndex((s) => s.id === guitar.stageId);

  const progress = allStages.length > 0 
    ? Math.round(((currentStageIndex + 1) / allStages.length) * 100)
    : 0;

  const getStatusColor = (status: string): string => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes("planning") || statusLower.includes("design")) {
      return "bg-sidebar text-text-onDark border-sidebar";
    }
    if (statusLower.includes("build") || statusLower.includes("progress")) {
      return "bg-accent text-accent-foreground border-accent";
    }
    if (statusLower.includes("finish") || statusLower.includes("paint")) {
      return "bg-status-warning text-accent-foreground border-status-warning";
    }
    if (statusLower.includes("ready") || statusLower.includes("complete")) {
      return "bg-status-success text-white border-status-success";
    }
    return "bg-surface-alt text-text-muted border-border";
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {isAdminViewing && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-slate-500" />
              <div>
                <p className="text-sm font-semibold text-slate-900">Admin view</p>
                <p className="text-xs text-slate-500">Toggle to see the client view.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setClientViewMode(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-light transition-colors"
            >
              <Eye className="w-4 h-4" />
              View as client
            </button>
          </div>
        )}

        {clientViewMode && (userRole === "staff" || userRole === "admin") && (
          <div className="rounded-2xl border border-teal/30 bg-teal/5 p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-teal" />
              <div>
                <p className="text-sm font-semibold text-slate-900">Client view mode</p>
                <p className="text-xs text-slate-600">You&apos;re seeing exactly what the client sees.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setClientViewMode(false)}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <EyeOff className="w-4 h-4" />
              Exit client view
            </button>
          </div>
        )}

        <Link
          href={userRole === "client" ? "/my-guitars" : "/settings"}
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{userRole === "client" ? "Back to My Guitars" : "Back to Settings"}</span>
        </Link>

        <div className="border border-border bg-surface">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
            {/* Cover Photo */}
            <div className="border-b lg:border-b-0 lg:border-r border-border bg-surface-alt">
              {guitar.coverPhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={guitar.coverPhotoUrl}
                  alt={guitar.model}
                  className="w-full h-64 lg:h-full min-h-[260px] object-contain cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setSelectedImage(guitar.coverPhotoUrl || null)}
                />
              ) : (
                <div className="w-full h-64 min-h-[260px] flex flex-col items-center justify-center gap-2">
                  <Camera className="w-12 h-12 text-text-muted" />
                  <span className="font-mono text-[10px] uppercase tracking-wider text-text-muted">
                    No guitar photo yet
                  </span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="p-5 sm:p-6 flex flex-col h-full min-h-[260px]">
              <div className="flex items-start justify-between gap-3 mb-5">
                <div className="min-w-0">
                  <h1 className="wo-heading text-[40px] sm:text-[52px] mb-1 truncate">
                    {guitar.model}
                  </h1>
                  <p className="text-lg text-text-muted mb-0">{guitar.finish}</p>
                </div>
                <div
                  className={`wo-badge shrink-0 ${getStatusColor(clientStatus)}`}
                >
                  {clientStatus}
                </div>
              </div>

              <div className="space-y-2.5 text-sm mb-5 border-t border-border-soft pt-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="wo-label">Order Number</span>
                  <span className="font-mono font-semibold text-text tabular-nums">
                    {guitar.orderNumber}
                  </span>
                </div>
                {guitar.serial && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="wo-label">Serial Number</span>
                    <span className="font-mono text-text">{guitar.serial}</span>
                  </div>
                )}
                <div className="flex items-center justify-between gap-3">
                  <span className="wo-label">Created</span>
                  <span className="font-mono text-text">
                    {new Date(guitar.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="wo-label">Build progress</span>
                  <span className="font-display text-xl font-semibold text-text tabular-nums tracking-wide">
                    {progress}%
                  </span>
                </div>
                <div className="w-full bg-surface-alt border border-border h-3 overflow-hidden">
                  <div
                    className="h-full bg-accent transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Latest update photos — fills remaining hero space */}
              <div className="mt-auto pt-5 border-t border-border-soft">
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <p className="wo-label flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5" />
                    Latest update photos
                  </p>
                  <a
                    href="#guitar-updates"
                    className="font-mono text-[10px] uppercase tracking-wider text-sidebar hover:underline"
                  >
                    View all
                  </a>
                </div>
                {updateGallery.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                    {updateGallery.slice(0, 8).map((item) => (
                      <button
                        key={item.url}
                        type="button"
                        onClick={() => setSelectedImage(item.url)}
                        className="relative aspect-square border border-border bg-surface-alt overflow-hidden hover:border-sidebar focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                        title={`${item.source === "run" ? "Run" : "Guitar"} · ${item.label}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.url}
                          alt={item.label}
                          loading="lazy"
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                        <span className="absolute bottom-0 left-0 right-0 bg-sidebar/80 px-1 py-0.5 font-mono text-[8px] uppercase tracking-wider text-text-onDark truncate">
                          {item.source === "run" ? "Run" : "Guitar"}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="border border-dashed border-border bg-surface-alt px-3 py-6 text-center">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-text-muted">
                      No update photos yet
                    </p>
                    <p className="text-xs text-text-muted mt-1">
                      Photos from guitar notes and run updates will show here.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Progress Timeline */}
            {allStages.length > 0 && (
              <div className="border border-border bg-surface p-5 sm:p-6">
                <div className="flex items-center justify-between mb-5 gap-3">
                  <h2 className="wo-section">Build Timeline</h2>
                  <div className="font-mono text-[11px] uppercase tracking-wider text-text-muted shrink-0">
                    {currentStageIndex + 1} of {allStages.length}
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="w-full bg-surface-alt border border-border h-2 overflow-hidden">
                    <div
                      className="bg-accent h-2 transition-all duration-500"
                      style={{ width: `${((currentStageIndex + 1) / allStages.length) * 100}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-2 font-mono text-[10px] uppercase tracking-wider text-text-muted">
                    <span>{Math.round(((currentStageIndex + 1) / allStages.length) * 100)}% Complete</span>
                    <span>{allStages.length - currentStageIndex - 1} stages remaining</span>
                  </div>
                </div>

                <div className="space-y-0">
                  {allStages.map((s, index) => {
                    const isCurrent = s.id === guitar.stageId;
                    const isPast = currentStageIndex > index;
                    const isFuture = currentStageIndex < index;
                    const clientLabel = s.clientStatusLabel || s.label;
                    
                    return (
                      <div key={s.id} className="relative">
                        <div className="flex gap-4 pb-6 last:pb-0">
                          {/* Timeline Indicator */}
                          <div className="flex flex-col items-center flex-shrink-0">
                            {isPast ? (
                              <div className="w-10 h-10 rounded-full bg-teal flex items-center justify-center shadow-sm">
                                <CheckCircle className="w-6 h-6 text-white" />
                              </div>
                            ) : isCurrent ? (
                              <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center shadow-md ring-4 ring-accent/20">
                                <div className="w-3 h-3 rounded-full bg-white" />
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-slate-100 border-2 border-slate-300 flex items-center justify-center">
                                <Circle className="w-5 h-5 text-slate-400" />
                              </div>
                            )}
                            {index < allStages.length - 1 && (
                              <div
                                className={`w-0.5 flex-1 mt-2 ${
                                  isPast ? "bg-teal" : "bg-slate-200"
                                }`}
                                style={{ minHeight: '24px' }}
                              />
                            )}
                          </div>
                          
                          {/* Stage Content */}
                          <div className="flex-1 pt-1">
                            <div
                              className={`font-semibold text-base ${
                                isCurrent
                                  ? "text-accent"
                                  : isPast
                                  ? "text-green-700"
                                  : "text-slate-400"
                              }`}
                            >
                              {clientLabel}
                            </div>
                            {/* Show actual stage label as subtitle if it's different from clientStatusLabel */}
                            {s.clientStatusLabel && s.clientStatusLabel !== s.label && (
                              <div className={`text-sm mt-0.5 ${
                                isCurrent
                                  ? "text-accent"
                                  : isPast
                                  ? "text-green-600"
                                  : "text-slate-500"
                              }`}>
                                {s.label}
                              </div>
                            )}
                            {isCurrent && (
                              <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 bg-accent/10 text-accent rounded-xl text-xs font-medium">
                                <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                                Current Stage
                              </div>
                            )}
                            {isPast && (
                              <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 bg-teal/10 text-teal rounded-xl text-xs font-medium">
                                <CheckCircle className="w-3 h-3" />
                                Completed
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Updates Timeline */}
            <div
              id="guitar-updates"
              className="bg-surface border border-border p-5 sm:p-6 scroll-mt-24"
            >
              <h2 className="wo-section mb-2">Updates & Progress</h2>
              {(userRole === "client" || clientViewMode) && (
                <p className="text-sm text-slate-600 mb-4">
                  You can reply to an update below (for example choosing an option we asked about).
                  For any <strong>spec changes</strong>, please email{" "}
                  <a
                    href="mailto:guitars@ormsbyguitars.com"
                    className="text-accent font-medium underline underline-offset-2 hover:text-accent-light"
                  >
                    guitars@ormsbyguitars.com
                  </a>{" "}
                  — do not post spec changes in comments.
                </p>
              )}
              {notes.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <p>No updates yet. Check back soon for progress updates!</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {notes
                    .sort((a, b) => b.createdAt - a.createdAt)
                    .map((note) => {
                      const NoteIcon = getNoteTypeIcon(note.type);
                      const noteTypeColor = getNoteTypeColor(note.type);
                      return (
                      <div key={note.id} className="border-l-4 border-accent pl-4 pb-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">{note.authorName}</span>
                            {note.type && (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${noteTypeColor}`}>
                                <NoteIcon className="w-3 h-3" />
                                {getNoteTypeLabel(note.type)}
                              </span>
                            )}
                          </div>
                          <span className="text-sm text-slate-500">
                            {new Date(note.createdAt).toLocaleDateString()}{" "}
                            {new Date(note.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="text-slate-700 mb-3">{note.message}</p>
                        {note.photoUrls && note.photoUrls.length > 0 && (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3">
                            {note.photoUrls.map((url, idx) => {
                              if (isExternalShareLink(url)) {
                                return <ExternalShareLink key={idx} url={url} />;
                              }
                              return (
                                <div key={idx} className="relative group">
                                  <img
                                    src={url}
                                    alt={`Update ${idx + 1}`}
                                    className="w-full h-32 object-cover rounded-2xl border border-slate-200 cursor-pointer hover:opacity-90 transition-opacity"
                                    onClick={() => setSelectedImage(url)}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {/* Thumbs up (mark as viewed) - client, or staff in client view mode */}
                        {(userRole === "client" || clientViewMode) && currentUser && (
                          <div className="mt-3 flex items-center gap-2">
                            {note.viewedBy?.[currentUser.uid] ? (
                              <span className="inline-flex items-center gap-1.5 text-sm text-green-600">
                                <ThumbsUp className="w-4 h-4 fill-current" />
                                Viewed by you
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => recordGuitarNoteViewed(guitarId, note.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-colors"
                              >
                                <ThumbsUp className="w-4 h-4" />
                                Mark as viewed
                              </button>
                            )}
                          </div>
                        )}
                        {/* Comments */}
                        <div className="mt-3 pt-3 border-t border-slate-100">
                          <p className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1">
                            <MessageSquare className="w-3.5 h-3.5" />
                            Comments ({commentMap[note.id]?.length ?? 0})
                          </p>
                          {(commentMap[note.id]?.length ?? 0) > 0 && (
                            <ul className="space-y-2 mb-3">
                              {(commentMap[note.id] ?? []).map((c) => {
                                const isStaffReply =
                                  Boolean(guitar?.clientUid) && c.authorUid !== guitar.clientUid;
                                return (
                                <li
                                  key={c.id}
                                  className={`text-sm rounded-2xl px-3 py-2 ${
                                    isStaffReply
                                      ? "bg-accent/5 border border-accent/20"
                                      : "bg-slate-50"
                                  }`}
                                >
                                  <span className="font-medium text-slate-900">{c.authorName}</span>
                                  {isStaffReply && (
                                    <span className="ml-1.5 text-[10px] font-medium uppercase tracking-wide text-accent bg-accent/10 px-1.5 py-0.5 rounded">
                                      Ormsby
                                    </span>
                                  )}
                                  <span className="text-slate-500 text-xs ml-2">
                                    {new Date(c.createdAt).toLocaleDateString()}{" "}
                                    {new Date(c.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                  </span>
                                  <p className="text-slate-700 mt-0.5 whitespace-pre-wrap">{c.message}</p>
                                </li>
                                );
                              })}
                            </ul>
                          )}
                          {(userRole === "client" || clientViewMode) && currentUser && (
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="Reply to this update…"
                                value={commentDraft[note.id] ?? ""}
                                onChange={(e) => setCommentDraft((prev) => ({ ...prev, [note.id]: e.target.value }))}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    const msg = (commentDraft[note.id] ?? "").trim();
                                    if (msg && submittingCommentNoteId !== note.id) {
                                      setSubmittingCommentNoteId(note.id);
                                      addGuitarNoteComment(guitarId, note.id, msg)
                                        .then(() => setCommentDraft((prev) => ({ ...prev, [note.id]: "" })))
                                        .catch((err) => console.error(err))
                                        .finally(() => setSubmittingCommentNoteId(null));
                                    }
                                  }
                                }}
                                className="flex-1 px-3 py-2 border border-slate-300 rounded-2xl text-sm focus:ring-accent/30 focus:border-accent/40"
                              />
                              <button
                                type="button"
                                disabled={!(commentDraft[note.id]?.trim()) || submittingCommentNoteId === note.id}
                                onClick={() => {
                                  const msg = (commentDraft[note.id] ?? "").trim();
                                  if (!msg || submittingCommentNoteId === note.id) return;
                                  setSubmittingCommentNoteId(note.id);
                                  addGuitarNoteComment(guitarId, note.id, msg)
                                    .then(() => setCommentDraft((prev) => ({ ...prev, [note.id]: "" })))
                                    .catch((err) => console.error(err))
                                    .finally(() => setSubmittingCommentNoteId(null));
                                }}
                                className="px-3 py-2 bg-accent text-accent-foreground text-sm font-medium rounded-2xl hover:bg-accent-light disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {submittingCommentNoteId === note.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Post"}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                    })}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6 min-w-0">
            {/* Reference Images */}
            {guitar.referenceImages && guitar.referenceImages.length > 0 && (
              <div className="border border-border bg-surface p-5">
                <h3 className="wo-section text-xl mb-4">Reference Images</h3>
                <div className="grid grid-cols-2 gap-3">
                  {guitar.referenceImages.map((url, idx) => {
                    if (isExternalShareLink(url)) {
                      return <ExternalShareLink key={idx} url={url} />;
                    }
                    return (
                      <div key={idx} className="relative group">
                        <img
                          src={url}
                          alt={`Reference ${idx + 1}`}
                          className="w-full h-24 object-cover rounded-2xl border border-slate-200 cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setSelectedImage(url)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Run Updates Panel */}
            {guitar && (
              <div className="border border-border bg-surface p-5">
                <div className="mb-4">
                  <h2 className="wo-section text-xl">Run Updates</h2>
                  <p className="font-mono text-[11px] uppercase tracking-wider text-text-muted mt-1.5">
                    Factory-wide announcements for your run — not for questions or comments.
                  </p>
                </div>
                <RunUpdatesList
                  runId={guitar.runId}
                  clientOnly={true}
                  maxUpdates={5}
                  guitarId={guitar.id}
                />
              </div>
            )}

            {/* Invoices Panel */}
            {canViewInvoices && (
              <>
                <InvoiceList
                  invoices={filteredInvoices}
                  canManage={isAdminViewing}
                  canEditDelete={isAdminViewing}
                  clientUid={guitar?.clientUid}
                  clientGuitars={clientGuitars}
                  guitarPrice={guitar.price}
                  guitarCurrency={guitar.currency || "AUD"}
                  totalOrderAmount={clientProfile?.totalOrderAmount}
                  totalOrderCurrency={clientProfile?.totalOrderCurrency || "AUD"}
                  onRecordPayment={isAdminViewing ? (invoice) => setPaymentInvoice(invoice) : undefined}
                />
                {isAdminViewing && currentUser && guitar?.clientUid && (
                  <RecordPaymentModal
                    clientUid={guitar.clientUid}
                    invoice={paymentInvoice}
                    isOpen={Boolean(paymentInvoice)}
                    onClose={() => setPaymentInvoice(null)}
                  />
                )}
              </>
            )}

            {/* Build Specifications */}
            {guitar.specs && (
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
                <h3 className="text-lg font-bold mb-2">Build Specifications</h3>
                {(userRole === "client" || clientViewMode) && (
                  <p className="text-sm text-amber-900 bg-amber-50 border border-amber-100 rounded-2xl px-3 py-2.5 mb-4">
                    Specs shown here are for your reference. To request a change, email{" "}
                    <a
                      href="mailto:guitars@ormsbyguitars.com"
                      className="font-semibold underline underline-offset-2"
                    >
                      guitars@ormsbyguitars.com
                    </a>
                    . Please do not use update comments for spec changes.
                  </p>
                )}
                <div className="space-y-4 text-sm">
                  {/* Timber & Wood */}
                  {(guitar.specs.bodyWood || guitar.specs.neckWood || guitar.specs.fretboardWood || guitar.specs.topWood) && (
                    <div>
                      <div className="flex items-center gap-2 text-slate-700 font-medium mb-2">
                        <TreePine className="w-4 h-4" />
                        Timber & Wood
                      </div>
                      <div className="space-y-1 pl-6">
                        {guitar.specs.bodyWood && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Body:</span>
                            <span className="text-slate-900">{guitar.specs.bodyWood}</span>
                          </div>
                        )}
                        {guitar.specs.topWood && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Top:</span>
                            <span className="text-slate-900">{guitar.specs.topWood}</span>
                          </div>
                        )}
                        {guitar.specs.neckWood && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Neck:</span>
                            <span className="text-slate-900">{guitar.specs.neckWood}</span>
                          </div>
                        )}
                        {guitar.specs.fretboardWood && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Fretboard:</span>
                            <span className="text-slate-900">{guitar.specs.fretboardWood}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Electronics */}
                  {(guitar.specs.pickupNeck || guitar.specs.pickupBridge || guitar.specs.pickups || guitar.specs.pickupConfiguration || guitar.specs.controls) && (
                    <div>
                      <div className="flex items-center gap-2 text-slate-700 font-medium mb-2">
                        <Zap className="w-4 h-4" />
                        Electronics
                      </div>
                      <div className="space-y-1 pl-6">
                        {guitar.specs.pickupNeck && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Neck Pickup:</span>
                            <span className="text-slate-900">{guitar.specs.pickupNeck}</span>
                          </div>
                        )}
                        {guitar.specs.pickupBridge && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Bridge Pickup:</span>
                            <span className="text-slate-900">{guitar.specs.pickupBridge}</span>
                          </div>
                        )}
                        {/* Legacy support - show old pickups field if new fields aren't set */}
                        {!guitar.specs.pickupNeck && !guitar.specs.pickupBridge && guitar.specs.pickups && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Pickups:</span>
                            <span className="text-slate-900">{guitar.specs.pickups}</span>
                          </div>
                        )}
                        {guitar.specs.pickupConfiguration && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Config:</span>
                            <span className="text-slate-900">{guitar.specs.pickupConfiguration}</span>
                          </div>
                        )}
                        {guitar.specs.controls && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Controls:</span>
                            <span className="text-slate-900">{guitar.specs.controls}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Hardware */}
                  {(guitar.specs.bridge || guitar.specs.tuners || guitar.specs.nut) && (
                    <div>
                      <div className="flex items-center gap-2 text-slate-700 font-medium mb-2">
                        <Settings className="w-4 h-4" />
                        Hardware
                      </div>
                      <div className="space-y-1 pl-6">
                        {guitar.specs.bridge && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Bridge:</span>
                            <span className="text-slate-900">{guitar.specs.bridge}</span>
                          </div>
                        )}
                        {guitar.specs.tuners && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Tuners:</span>
                            <span className="text-slate-900">{guitar.specs.tuners}</span>
                          </div>
                        )}
                        {guitar.specs.nut && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Nut:</span>
                            <span className="text-slate-900">{guitar.specs.nut}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Finish */}
                  {(guitar.specs.finishColor || guitar.specs.finishType) && (
                    <div>
                      <div className="flex items-center gap-2 text-slate-700 font-medium mb-2">
                        <Palette className="w-4 h-4" />
                        Finish
                      </div>
                      <div className="space-y-1 pl-6">
                        {guitar.specs.finishColor && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Color:</span>
                            <span className="text-slate-900">{guitar.specs.finishColor}</span>
                          </div>
                        )}
                        {guitar.specs.finishType && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Type:</span>
                            <span className="text-slate-900">{guitar.specs.finishType}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Custom Notes */}
                  {guitar.specs.customNotes && (
                    <div>
                      <div className="text-slate-700 font-medium mb-2">Additional Notes</div>
                      <p className="text-sm text-slate-600 pl-6">{guitar.specs.customNotes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Photo Gallery */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Photo Gallery ({allPhotos.length})</h3>
                {userRole === "client" && !isAdminViewing && (
                  <button
                    onClick={() => setShowGalleryUpload(!showGalleryUpload)}
                    className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-2xl hover:bg-accent-light transition-colors text-sm font-medium"
                  >
                    <Upload className="w-4 h-4" />
                    {showGalleryUpload ? "Cancel" : "Add Photos"}
                  </button>
                )}
              </div>

              {/* Gallery Upload Form (Client Only) */}
              {showGalleryUpload && userRole === "client" && !isAdminViewing && (
                <div className="mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Upload Images (Max 10)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleGalleryImageSelect}
                    className="block w-full text-sm text-slate-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-md file:border-0
                      file:text-sm file:font-semibold
                      file:bg-accent/10 file:text-accent
                      hover:file:bg-accent/15"
                    disabled={uploadingGallery || galleryFiles.length >= 10}
                  />
                  {galleryPreviews.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {galleryPreviews.map((preview, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={preview}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-24 object-cover rounded-md border border-slate-200"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveGalleryImage(index)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            disabled={uploadingGallery}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={handleUploadGallery}
                      disabled={uploadingGallery || galleryFiles.length === 0}
                      className="flex-1 px-4 py-2 bg-accent text-accent-foreground rounded-2xl hover:bg-accent-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
                    >
                      {uploadingGallery ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          Upload {galleryFiles.length} Image{galleryFiles.length !== 1 ? "s" : ""}
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setShowGalleryUpload(false);
                        setGalleryFiles([]);
                        setGalleryPreviews([]);
                      }}
                      disabled={uploadingGallery}
                      className="px-4 py-2 bg-slate-200 text-slate-700 rounded-2xl hover:bg-slate-300 disabled:opacity-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {allPhotos.length > 0 ? (
                <>
                <div className="grid grid-cols-2 gap-3">
                  {allPhotos.slice(0, 6).map((url, idx) => {
                    if (isExternalShareLink(url)) {
                      return <ExternalShareLink key={idx} url={url} />;
                    }
                    return (
                      <div key={idx} className="relative group">
                        <img
                          src={url}
                          alt={`Photo ${idx + 1}`}
                          className="w-full h-24 object-cover rounded-2xl border border-slate-200 cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setSelectedImage(url)}
                        />
                      </div>
                    );
                  })}
                </div>
                {allPhotos.length > 6 && (
                  <p className="text-xs text-slate-500 mt-3 text-center">
                    +{allPhotos.length - 6} more photos
                  </p>
                )}
                </>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <Camera className="w-12 h-12 mx-auto mb-2 text-slate-400" />
                  <p className="text-sm">No photos yet</p>
                  {userRole === "client" && !isAdminViewing && (
                    <p className="text-xs mt-1">Click "Add Photos" above to upload images</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Image Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 text-white hover:text-slate-300 text-2xl font-bold"
          >
            ×
          </button>
          <img
            src={selectedImage}
            alt="Full size"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </AppLayout>
  );
}

