"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Camera, User, Mail, Package, Hash, Calendar, Settings, TreePine, Zap, Music, Palette, Plus, Edit, Image as ImageIcon, ExternalLink, Archive, ArchiveRestore, Eye, EyeOff, Trash2, DollarSign, Copy, Check, FileText, LogIn, Guitar, MessageSquare } from "lucide-react";
import { subscribeGuitarNotes, getRun, subscribeRunStages, archiveGuitar, unarchiveGuitar, updateGuitar, updateGuitarNote, subscribeAuditLogsByGuitar, subscribeAuditLogsByUser, subscribeGuitarNoteComments } from "@/lib/firestore";
import { GuitarNoteDrawer } from "./GuitarNoteDrawer";
import { EditGuitarModal } from "./EditGuitarModal";
import { GuitarInvoiceManager } from "./GuitarInvoiceManager";
import { useAuth } from "@/contexts/AuthContext";
import { useClientProfile } from "@/hooks/useClientProfile";
import { isGoogleDriveLink, deleteGuitarReferenceImage, deleteGuitarNotePhoto } from "@/lib/storage";
import { getNoteTypeLabel, getNoteTypeIcon, getNoteTypeColor } from "@/utils/noteTypes";
import type { GuitarBuild, GuitarNote, RunStage, AuditLogEntry, AuditAction, NoteComment } from "@/types/guitars";

interface GuitarDetailModalProps {
  guitar: GuitarBuild;
  isOpen: boolean;
  onClose: () => void;
}

export function GuitarDetailModal({
  guitar,
  isOpen,
  onClose,
}: GuitarDetailModalProps) {
  const [notes, setNotes] = useState<GuitarNote[]>([]);
  const [stage, setStage] = useState<RunStage | null>(null);
  const [run, setRun] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isNoteDrawerOpen, setIsNoteDrawerOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [clientViewMode, setClientViewMode] = useState(false);
  const [deletingImage, setDeletingImage] = useState<string | null>(null);
  const [emailCopied, setEmailCopied] = useState(false);
  const [guitarActivity, setGuitarActivity] = useState<AuditLogEntry[]>([]);
  const [clientActivity, setClientActivity] = useState<AuditLogEntry[]>([]);
  const [noteCommentMap, setNoteCommentMap] = useState<Record<string, NoteComment[]>>({});
  const { userRole } = useAuth();

  const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
    login: "Login",
    view_my_guitars: "Viewed My Guitars",
    view_guitar: "Viewed guitar",
    view_run_updates: "Viewed run updates",
  };
  const AUDIT_ACTION_ICONS: Record<AuditAction, typeof FileText> = {
    login: LogIn,
    view_my_guitars: Guitar,
    view_guitar: Eye,
    view_run_updates: MessageSquare,
  };
  const router = useRouter();
  const clientProfile = useClientProfile(isOpen && guitar.clientUid ? guitar.clientUid : null);
  const isAdminViewing = (userRole === "staff" || userRole === "admin") && !clientViewMode;

  const getFullLoginEmailTemplate = (): string => {
    const name = guitar.customerName || "there";
    const email = guitar.customerEmail || "";
    const password = clientProfile?.initialPassword || "[Set via Reset Password on client profile]";
    const siteUrl = typeof window !== "undefined" ? window.location.origin : "https://factorystandards.com";
    const loginUrl = `${siteUrl}/login`;
    return `Subject: Your Factory Standards Account

Hi ${name},

Your account has been created for Factory Standards. You can now log in to track your guitar build progress.

Login Details:
Email: ${email}
Password: ${password}

Login Link: ${loginUrl}

Please change your password after your first login for security.

If you have any questions, please don't hesitate to reach out.

Best regards,
Factory Standards Team`;
  };

  const handleDeleteReferenceImage = async (imageUrl: string, index: number) => {
    if (!confirm("Are you sure you want to delete this reference image?")) return;
    
    setDeletingImage(imageUrl);
    try {
      // Delete from storage if it's a Firebase Storage URL
      if (!isGoogleDriveLink(imageUrl)) {
        await deleteGuitarReferenceImage(guitar.id, imageUrl);
      }
      
      // Remove from guitar's referenceImages array
      const updatedImages = guitar.referenceImages?.filter((_, i) => i !== index) || [];
      await updateGuitar(guitar.id, {
        referenceImages: updatedImages.length > 0 ? updatedImages : undefined,
        coverPhotoUrl: updatedImages[0] || undefined,
      });
    } catch (error) {
      console.error("Error deleting reference image:", error);
      alert("Failed to delete image. Please try again.");
    } finally {
      setDeletingImage(null);
    }
  };

  const handleDeleteNotePhoto = async (noteId: string, imageUrl: string, photoIndex: number) => {
    if (!confirm("Are you sure you want to delete this photo from the note?")) return;
    
    setDeletingImage(imageUrl);
    try {
      // Find the note to get current photoUrls
      const note = notes.find((n) => n.id === noteId);
      if (!note || !note.photoUrls) return;
      
      // Delete from storage if it's a Firebase Storage URL
      if (!isGoogleDriveLink(imageUrl)) {
        await deleteGuitarNotePhoto(guitar.id, note.stageId, imageUrl);
      }
      
      // Remove from note's photoUrls array
      const updatedPhotoUrls = note.photoUrls.filter((_, i) => i !== photoIndex);
      await updateGuitarNote(guitar.id, noteId, {
        photoUrls: updatedPhotoUrls.length > 0 ? updatedPhotoUrls : undefined,
      });
    } catch (error) {
      console.error("Error deleting note photo:", error);
      alert("Failed to delete photo. Please try again.");
    } finally {
      setDeletingImage(null);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    const unsubscribes: (() => void)[] = [];

    // Load notes - filter based on client view mode
    const shouldFilterClientOnly = clientViewMode && (userRole === "staff" || userRole === "admin");
    const unsubscribeNotes = subscribeGuitarNotes(guitar.id, (allNotes) => {
      setNotes(allNotes);
    }, shouldFilterClientOnly);
    unsubscribes.push(unsubscribeNotes);

    // Load run and stage
    getRun(guitar.runId).then((runData) => {
      setRun(runData);
      if (runData) {
        const unsubscribeStages = subscribeRunStages(guitar.runId, (stages) => {
          const currentStage = stages.find((s) => s.id === guitar.stageId);
          setStage(currentStage || null);
          setLoading(false);
        });
        unsubscribes.push(unsubscribeStages);
      } else {
        setLoading(false);
      }
    });

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [isOpen, guitar.id, guitar.runId, guitar.stageId, clientViewMode, userRole]);

  // Guitar + purchaser activity logs (staff/admin only)
  useEffect(() => {
    if (!isOpen || !guitar.id || (userRole !== "staff" && userRole !== "admin")) return;
    const unsubGuitar = subscribeAuditLogsByGuitar(guitar.id, setGuitarActivity);
    return () => unsubGuitar();
  }, [isOpen, guitar.id, userRole]);

  useEffect(() => {
    if (!isOpen || !guitar.clientUid || (userRole !== "staff" && userRole !== "admin")) {
      setClientActivity([]);
      return;
    }
    const unsubUser = subscribeAuditLogsByUser(guitar.clientUid, setClientActivity);
    return () => unsubUser();
  }, [isOpen, guitar.clientUid, userRole]);

  // Staff: subscribe to comments for each note (to show client feedback)
  useEffect(() => {
    if (!isOpen || !guitar.id || notes.length === 0 || (userRole !== "staff" && userRole !== "admin")) return;
    const unsubs: (() => void)[] = [];
    notes.forEach((note) => {
      unsubs.push(
        subscribeGuitarNoteComments(guitar.id, note.id, (comments) => {
          setNoteCommentMap((prev) => ({ ...prev, [note.id]: comments }));
        })
      );
    });
    return () => unsubs.forEach((u) => u());
  }, [isOpen, guitar.id, userRole, notes.map((n) => n.id).join(",")]);

  if (!isOpen) return null;

  // Collect all photos from notes and reference images
  const allPhotos: string[] = [];
  
  // Add reference images first
  if (guitar.referenceImages && guitar.referenceImages.length > 0) {
    allPhotos.push(...guitar.referenceImages);
  }
  
  // Add photos from notes
  notes.forEach((note) => {
    if (note.photoUrls) {
      allPhotos.push(...note.photoUrls);
    }
  });
  
  // Add cover photo if not already included
  if (guitar.coverPhotoUrl && !allPhotos.includes(guitar.coverPhotoUrl)) {
    allPhotos.unshift(guitar.coverPhotoUrl);
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{guitar.model}</h2>
            <p className="text-gray-600 mt-1">{guitar.finish}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* View as Client: open the real client guitar page (with thumbs up, comments) */}
            {isAdminViewing && (
              <button
                onClick={() => {
                  onClose();
                  router.push(`/my-guitars/${guitar.id}?viewAsClient=1`);
                }}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                title="View as Client (opens client page)"
              >
                <Eye className="w-4 h-4" />
                View as Client
              </button>
            )}
            {(userRole === "staff" || userRole === "admin") && (
              <>
                <button
                  onClick={async () => {
                    if (isArchiving) return;
                    setIsArchiving(true);
                    try {
                      if (guitar.archived) {
                        await unarchiveGuitar(guitar.id);
                      } else {
                        if (confirm(`Are you sure you want to archive "${guitar.model}"? It will be hidden from active views.`)) {
                          await archiveGuitar(guitar.id);
                        }
                      }
                    } catch (error) {
                      console.error("Error archiving guitar:", error);
                      alert("Failed to archive guitar. Please try again.");
                    } finally {
                      setIsArchiving(false);
                    }
                  }}
                  disabled={isArchiving}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    guitar.archived
                      ? "bg-green-600 text-white hover:bg-green-700"
                      : "bg-gray-600 text-white hover:bg-gray-700"
                  } disabled:opacity-50`}
                >
                  {isArchiving ? (
                    "Processing..."
                  ) : guitar.archived ? (
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
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="text-gray-500">Loading details...</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Main Info */}
              <div className="space-y-6">
                {/* Cover Photo */}
                {guitar.coverPhotoUrl && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cover Photo
                    </label>
                    <img
                      src={guitar.coverPhotoUrl}
                      alt={guitar.model}
                      className="w-full h-64 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setSelectedImage(guitar.coverPhotoUrl || null)}
                    />
                  </div>
                )}

                {/* Guitar Details */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Guitar Details
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 flex items-center gap-2">
                        <Hash className="w-4 h-4" />
                        Order Number
                      </span>
                      <span className="font-semibold text-gray-900">
                        {guitar.orderNumber}
                      </span>
                    </div>
                    {guitar.serial && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 flex items-center gap-2">
                          <Hash className="w-4 h-4" />
                          Serial Number
                        </span>
                        <span className="font-mono text-gray-900">
                          {guitar.serial}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Created
                      </span>
                      <span className="text-gray-900">
                        {new Date(guitar.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Last Updated
                      </span>
                      <span className="text-gray-900">
                        {new Date(guitar.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                    {guitar.price !== undefined && guitar.price > 0 && (
                      <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                        <span className="text-gray-500 flex items-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          Price
                        </span>
                        <span className="font-semibold text-gray-900">
                          {guitar.currency || "AUD"} ${guitar.price.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {stage && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Current Stage</span>
                        <span className="font-semibold text-blue-600">
                          {stage.label}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Client Information */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Client Information
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Name
                      </span>
                      <span className="font-semibold text-gray-900">
                        {guitar.customerName || "No customer assigned"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Email
                      </span>
                      <a
                        href={guitar.customerEmail ? `mailto:${guitar.customerEmail}` : undefined}
                        className={guitar.customerEmail ? "text-blue-600 hover:text-blue-700 hover:underline" : "text-gray-400"}
                      >
                        {guitar.customerEmail || "No email assigned"}
                      </a>
                    </div>
                    {isAdminViewing && (guitar.clientUid || guitar.customerEmail) && (
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-200 mt-3">
                        <button
                          type="button"
                          onClick={() => {
                            const profileId = guitar.clientUid
                              ? guitar.clientUid
                              : `email:${encodeURIComponent((guitar.customerEmail || "").trim())}`;
                            router.push(`/settings/clients/${profileId}`);
                            onClose();
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-xs font-medium"
                        >
                          <User className="w-3.5 h-3.5" />
                          View profile
                        </button>
                        {guitar.customerEmail && (
                          <button
                            type="button"
                            onClick={async () => {
                              const emailText = getFullLoginEmailTemplate();
                              try {
                                await navigator.clipboard.writeText(emailText);
                                setEmailCopied(true);
                                setTimeout(() => setEmailCopied(false), 2000);
                              } catch {
                                const ta = document.createElement("textarea");
                                ta.value = emailText;
                                document.body.appendChild(ta);
                                ta.select();
                                document.execCommand("copy");
                                document.body.removeChild(ta);
                                setEmailCopied(true);
                                setTimeout(() => setEmailCopied(false), 2000);
                              }
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-600 text-white hover:bg-gray-700 text-xs font-medium"
                          >
                            {emailCopied ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                Copy login email
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Build Specifications */}
                {guitar.specs && (
                  <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      Build Specifications
                    </h3>
                    
                    {/* Timber/Wood Section */}
                    {(guitar.specs.bodyWood || guitar.specs.neckWood || guitar.specs.fretboardWood || guitar.specs.topWood) && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                          <TreePine className="w-4 h-4" />
                          Timber & Wood
                        </h4>
                        <div className="space-y-1.5 text-sm">
                          {guitar.specs.bodyWood && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Body</span>
                              <span className="font-medium text-gray-900">{guitar.specs.bodyWood}</span>
                            </div>
                          )}
                          {guitar.specs.topWood && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Top</span>
                              <span className="font-medium text-gray-900">{guitar.specs.topWood}</span>
                            </div>
                          )}
                          {guitar.specs.neckWood && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Neck</span>
                              <span className="font-medium text-gray-900">{guitar.specs.neckWood}</span>
                            </div>
                          )}
                          {guitar.specs.fretboardWood && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Fretboard</span>
                              <span className="font-medium text-gray-900">{guitar.specs.fretboardWood}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Electronics Section */}
                    {(guitar.specs.pickupNeck || guitar.specs.pickupBridge || guitar.specs.pickups || guitar.specs.pickupConfiguration || guitar.specs.controls || guitar.specs.switch) && (
                      <div className="pt-3 border-t border-gray-200">
                        <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                          <Zap className="w-4 h-4" />
                          Electronics
                        </h4>
                        <div className="space-y-1.5 text-sm">
                          {(guitar.specs.pickupNeck || guitar.specs.pickupBridge || guitar.specs.pickups) && (
                            <>
                              {guitar.specs.pickupNeck && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Neck Pickup</span>
                                  <span className="font-medium text-gray-900">{guitar.specs.pickupNeck}</span>
                                </div>
                              )}
                              {guitar.specs.pickupBridge && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Bridge Pickup</span>
                                  <span className="font-medium text-gray-900">{guitar.specs.pickupBridge}</span>
                                </div>
                              )}
                              {/* Legacy support - show old pickups field if new fields aren't set */}
                              {!guitar.specs.pickupNeck && !guitar.specs.pickupBridge && guitar.specs.pickups && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Pickups</span>
                                  <span className="font-medium text-gray-900">{guitar.specs.pickups}</span>
                                </div>
                              )}
                            </>
                          )}
                          {guitar.specs.pickupConfiguration && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Configuration</span>
                              <span className="font-medium text-gray-900">{guitar.specs.pickupConfiguration}</span>
                            </div>
                          )}
                          {guitar.specs.controls && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Controls</span>
                              <span className="font-medium text-gray-900">{guitar.specs.controls}</span>
                            </div>
                          )}
                          {guitar.specs.switch && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Switch</span>
                              <span className="font-medium text-gray-900">{guitar.specs.switch}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Hardware Section */}
                    {(guitar.specs.bridge || guitar.specs.tuners || guitar.specs.nut || guitar.specs.pickguard) && (
                      <div className="pt-3 border-t border-gray-200">
                        <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                          <Settings className="w-4 h-4" />
                          Hardware
                        </h4>
                        <div className="space-y-1.5 text-sm">
                          {guitar.specs.bridge && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Bridge</span>
                              <span className="font-medium text-gray-900">{guitar.specs.bridge}</span>
                            </div>
                          )}
                          {guitar.specs.tuners && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Tuners</span>
                              <span className="font-medium text-gray-900">{guitar.specs.tuners}</span>
                            </div>
                          )}
                          {guitar.specs.nut && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Nut</span>
                              <span className="font-medium text-gray-900">{guitar.specs.nut}</span>
                            </div>
                          )}
                          {guitar.specs.pickguard && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Pickguard</span>
                              <span className="font-medium text-gray-900">{guitar.specs.pickguard}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Strings & Setup Section */}
                    {(guitar.specs.strings || guitar.specs.stringGauge || guitar.specs.scaleLength || guitar.specs.action) && (
                      <div className="pt-3 border-t border-gray-200">
                        <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                          <Music className="w-4 h-4" />
                          Strings & Setup
                        </h4>
                        <div className="space-y-1.5 text-sm">
                          {guitar.specs.strings && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Strings</span>
                              <span className="font-medium text-gray-900">{guitar.specs.strings}</span>
                            </div>
                          )}
                          {guitar.specs.stringGauge && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Gauge</span>
                              <span className="font-medium text-gray-900">{guitar.specs.stringGauge}</span>
                            </div>
                          )}
                          {guitar.specs.scaleLength && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Scale Length</span>
                              <span className="font-medium text-gray-900">{guitar.specs.scaleLength}</span>
                            </div>
                          )}
                          {guitar.specs.action && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Action</span>
                              <span className="font-medium text-gray-900">{guitar.specs.action}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Finish & Appearance Section */}
                    {(guitar.specs.finishColor || guitar.specs.finishType || guitar.specs.binding || guitar.specs.inlays) && (
                      <div className="pt-3 border-t border-gray-200">
                        <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                          <Palette className="w-4 h-4" />
                          Finish & Appearance
                        </h4>
                        <div className="space-y-1.5 text-sm">
                          {guitar.specs.finishColor && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Color</span>
                              <span className="font-medium text-gray-900">{guitar.specs.finishColor}</span>
                            </div>
                          )}
                          {guitar.specs.finishType && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Finish Type</span>
                              <span className="font-medium text-gray-900">{guitar.specs.finishType}</span>
                            </div>
                          )}
                          {guitar.specs.binding && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Binding</span>
                              <span className="font-medium text-gray-900">{guitar.specs.binding}</span>
                            </div>
                          )}
                          {guitar.specs.inlays && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Inlays</span>
                              <span className="font-medium text-gray-900">{guitar.specs.inlays}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Neck Details Section */}
                    {(guitar.specs.frets || guitar.specs.neckProfile || guitar.specs.radius) && (
                      <div className="pt-3 border-t border-gray-200">
                        <h4 className="text-xs font-semibold text-gray-700 mb-2">Neck Details</h4>
                        <div className="space-y-1.5 text-sm">
                          {guitar.specs.frets && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Frets</span>
                              <span className="font-medium text-gray-900">{guitar.specs.frets}</span>
                            </div>
                          )}
                          {guitar.specs.neckProfile && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Profile</span>
                              <span className="font-medium text-gray-900">{guitar.specs.neckProfile}</span>
                            </div>
                          )}
                          {guitar.specs.radius && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Radius</span>
                              <span className="font-medium text-gray-900">{guitar.specs.radius}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Custom Notes */}
                    {guitar.specs.customNotes && (
                      <div className="pt-3 border-t border-gray-200">
                        <h4 className="text-xs font-semibold text-gray-700 mb-2">Custom Notes</h4>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{guitar.specs.customNotes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column - Photos & Notes */}
              <div className="space-y-6">
                {/* Reference Images */}
                {guitar.referenceImages && guitar.referenceImages.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                      <ImageIcon className="w-5 h-5" />
                      Reference Images ({guitar.referenceImages.length})
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      Initial reference images uploaded when creating this guitar
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {guitar.referenceImages.map((url, idx) => {
                        const isDriveLink = isGoogleDriveLink(url);
                        if (isDriveLink) {
                          return (
                            <a
                              key={idx}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                            >
                              <ExternalLink className="w-4 h-4 text-blue-600" />
                              <span className="text-sm text-blue-700 font-medium">
                                Google Drive Folder
                              </span>
                            </a>
                          );
                        }
                        return (
                          <div key={idx} className="relative group">
                            <img
                              src={url}
                              alt={`Reference ${idx + 1}`}
                              className="w-full h-32 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => setSelectedImage(url)}
                            />
                            {isAdminViewing && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteReferenceImage(url, idx);
                                }}
                                disabled={deletingImage === url}
                                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 disabled:opacity-50"
                                title="Delete image"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* All Photos */}
                {allPhotos.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                      <Camera className="w-5 h-5" />
                      All Photos ({allPhotos.length})
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {allPhotos.map((url, idx) => {
                        const isDriveLink = isGoogleDriveLink(url);
                        if (isDriveLink) {
                          return (
                            <a
                              key={idx}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                            >
                              <ExternalLink className="w-4 h-4 text-blue-600" />
                              <span className="text-sm text-blue-700 font-medium">
                                Google Drive Folder
                              </span>
                            </a>
                          );
                        }
                        return (
                          <img
                            key={idx}
                            src={url}
                            alt={`Photo ${idx + 1}`}
                            className="w-full h-32 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => setSelectedImage(url)}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Notes Timeline */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Notes & Updates ({notes.length})
                    </label>
                    {stage && (
                      <button
                        onClick={() => setIsNoteDrawerOpen(true)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Add Update
                      </button>
                    )}
                  </div>
                  {notes.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm bg-gray-50 rounded-lg">
                      <p className="mb-3">No notes yet</p>
                      {stage && (
                        <button
                          onClick={() => setIsNoteDrawerOpen(true)}
                          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                        >
                          Add First Update
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {notes
                        .sort((a, b) => b.createdAt - a.createdAt)
                        .map((note) => {
                          const NoteIcon = getNoteTypeIcon(note.type);
                          const noteTypeColor = getNoteTypeColor(note.type);
                          return (
                          <div
                            key={note.id}
                            className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-500"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-gray-900">
                                  {note.authorName}
                                </span>
                                {note.type && (
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${noteTypeColor}`}>
                                    <NoteIcon className="w-3 h-3" />
                                    {getNoteTypeLabel(note.type)}
                                  </span>
                                )}
                                {note.visibleToClient && (
                                  <span className="text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded-full">
                                    Client Visible
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-gray-500">
                                {new Date(note.createdAt).toLocaleDateString()}{" "}
                                {new Date(note.createdAt).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 mb-2">
                              {note.message}
                            </p>
                            {note.photoUrls && note.photoUrls.length > 0 && (
                              <div className="grid grid-cols-3 gap-2 mt-3">
                                {note.photoUrls.map((url, idx) => {
                                  const isDriveLink = isGoogleDriveLink(url);
                                  if (isDriveLink) {
                                    return (
                                      <a
                                        key={idx}
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                                      >
                                        <ExternalLink className="w-4 h-4 text-blue-600" />
                                        <span className="text-xs text-blue-700 font-medium">
                                          Google Drive Folder
                                        </span>
                                      </a>
                                    );
                                  }
                                  return (
                                    <div key={idx} className="relative group">
                                      <img
                                        src={url}
                                        alt={`Note photo ${idx + 1}`}
                                        className="w-full h-20 object-cover rounded border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                                        onClick={() => setSelectedImage(url)}
                                      />
                                      {isAdminViewing && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteNotePhoto(note.id, url, idx);
                                          }}
                                          disabled={deletingImage === url}
                                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 disabled:opacity-50"
                                          title="Delete photo"
                                        >
                                          <Trash2 className="w-2.5 h-2.5" />
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            {/* Staff: viewed-by count and client comments */}
                            {isAdminViewing && note.visibleToClient && (
                              <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500 space-y-1">
                                {(note.viewedBy && Object.keys(note.viewedBy).length > 0) && (
                                  <p>Viewed by {Object.keys(note.viewedBy).length} client(s)</p>
                                )}
                                {(noteCommentMap[note.id]?.length ?? 0) > 0 && (
                                  <div>
                                    <p className="font-medium text-gray-600 mb-1">Comments ({noteCommentMap[note.id].length}):</p>
                                    <ul className="space-y-1">
                                      {noteCommentMap[note.id].map((c) => (
                                        <li key={c.id} className="bg-white rounded px-2 py-1 border border-gray-100">
                                          <span className="font-medium text-gray-700">{c.authorName}</span>
                                          <span className="ml-1 text-gray-400">
                                            {new Date(c.createdAt).toLocaleDateString()} {new Date(c.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                          </span>
                                          <p className="text-gray-600 mt-0.5">{c.message}</p>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                        })}
                    </div>
                  )}
                </div>

                {/* Guitar activity & Client activity - staff/admin only */}
                {isAdminViewing && (
                  <>
                    <div className="mt-6">
                      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Guitar activity ({guitarActivity.length})
                      </h3>
                      <p className="text-xs text-gray-500 mb-2">When this guitar was viewed or related actions.</p>
                      {guitarActivity.length === 0 ? (
                        <div className="text-center py-4 text-gray-400 text-sm bg-gray-50 rounded-lg">No activity yet</div>
                      ) : (
                        <ul className="space-y-2 max-h-48 overflow-y-auto bg-gray-50 rounded-lg p-3">
                          {guitarActivity.map((entry) => {
                            const Icon = AUDIT_ACTION_ICONS[entry.action];
                            return (
                              <li key={entry.id} className="flex items-center gap-2 text-sm">
                                <Icon className="w-4 h-4 text-gray-500 shrink-0" />
                                <span className="text-gray-700">{AUDIT_ACTION_LABELS[entry.action]}</span>
                                <span className="text-gray-500">— {entry.userEmail ?? "Unknown"}</span>
                                <span className="text-gray-400 text-xs ml-auto shrink-0">
                                  {new Date(entry.createdAt).toLocaleDateString()} {new Date(entry.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                    {guitar.clientUid && (
                      <div className="mt-4">
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <User className="w-5 h-5" />
                          Client activity ({clientActivity.length})
                        </h3>
                        <p className="text-xs text-gray-500 mb-2">Logins and page views for the purchaser.</p>
                        {clientActivity.length === 0 ? (
                          <div className="text-center py-4 text-gray-400 text-sm bg-gray-50 rounded-lg">No activity yet</div>
                        ) : (
                          <ul className="space-y-2 max-h-48 overflow-y-auto bg-gray-50 rounded-lg p-3">
                            {clientActivity.map((entry) => {
                              const Icon = AUDIT_ACTION_ICONS[entry.action];
                              return (
                                <li key={entry.id} className="flex items-center gap-2 text-sm">
                                  <Icon className="w-4 h-4 text-gray-500 shrink-0" />
                                  <span className="text-gray-700">{AUDIT_ACTION_LABELS[entry.action]}</span>
                                  <span className="text-gray-400 text-xs ml-auto shrink-0">
                                    {new Date(entry.createdAt).toLocaleDateString()} {new Date(entry.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* Invoice Manager - Only for Accounting Users */}
                {userRole === "accounting" && (
                  <div className="mt-6">
                    <GuitarInvoiceManager
                      guitar={guitar}
                      onUpdate={() => {
                        // Refresh guitar data if needed
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Image Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-60 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 text-white hover:text-gray-300"
          >
            <X className="w-8 h-8" />
          </button>
          <img
            src={selectedImage}
            alt="Full size"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Note Drawer for adding updates in current stage */}
      {isNoteDrawerOpen && stage && (
        <GuitarNoteDrawer
          guitar={guitar}
          stage={stage}
          isOpen={isNoteDrawerOpen}
          onClose={(noteAdded) => {
            setIsNoteDrawerOpen(false);
            // Notes will automatically refresh via subscription
          }}
          skipStageUpdate={true}
        />
      )}

      {/* Edit Guitar Modal */}
      {isEditModalOpen && (
        <EditGuitarModal
          guitar={guitar}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={() => {
            // Guitar data will automatically refresh via subscription
            setIsEditModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

