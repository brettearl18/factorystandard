"use client";

import { use } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { getGuitar, subscribeGuitar, subscribeGuitarNotes, getRun, subscribeRunStages } from "@/lib/firestore";
import { isGoogleDriveLink } from "@/lib/storage";
import { ArrowLeft, Camera, CheckCircle, Circle, TreePine, Zap, Music, Palette, Settings, ExternalLink } from "lucide-react";
import type { GuitarBuild, GuitarNote, RunStage } from "@/types/guitars";

export default function GuitarDetailPage({
  params,
}: {
  params: Promise<{ guitarId: string }>;
}) {
  const { guitarId } = use(params);
  const { currentUser, userRole, loading: authLoading } = useAuth();
  const router = useRouter();
  const [guitar, setGuitar] = useState<GuitarBuild | null>(null);
  const [notes, setNotes] = useState<GuitarNote[]>([]);
  const [stage, setStage] = useState<RunStage | null>(null);
  const [allStages, setAllStages] = useState<RunStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

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

  useEffect(() => {
    // Allow staff/admin to view, but only load data if authenticated
    if (!currentUser) return;

    let unsubscribeGuitar: (() => void) | null = null;
    let unsubscribeStages: (() => void) | null = null;
    let unsubscribeNotes: (() => void) | null = null;

    let currentRunId: string | null = null;

    // Subscribe to guitar updates in real-time
    unsubscribeGuitar = subscribeGuitar(guitarId, (guitarData) => {
      if (!guitarData) {
        setLoading(false);
        return;
      }

      // For clients, verify they own this guitar
      // Staff/admin can view any guitar
      if (userRole === "client" && guitarData.clientUid !== currentUser.uid) {
        router.push("/my-guitars");
        return;
      }

      setGuitar(guitarData);
      setLoading(false);

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

    // Load initial guitar and set up subscriptions
    const loadInitialData = async () => {
      try {
        // First get the guitar to know which run it belongs to
        const initialGuitar = await getGuitar(guitarId);
        if (!initialGuitar) {
          setLoading(false);
          return;
        }

        // For clients, verify they own this guitar
        if (userRole === "client" && initialGuitar.clientUid !== currentUser.uid) {
          router.push("/my-guitars");
          return;
        }

        currentRunId = initialGuitar.runId;

        // Subscribe to stages for this run
        unsubscribeStages = subscribeRunStages(initialGuitar.runId, (stages) => {
          const sortedStages = [...stages].sort((a, b) => a.order - b.order);
          setAllStages(sortedStages);
        });

        // Subscribe to notes
        // For clients, use clientOnly=true to filter in the query (required by security rules)
        unsubscribeNotes = subscribeGuitarNotes(guitarId, (allNotes) => {
          // If client, notes are already filtered by visibleToClient in the query
          // If staff/admin, get all notes
          setNotes(allNotes);
        }, userRole === "client");
      } catch (error) {
        console.error("Error loading initial data:", error);
      }
    };

    loadInitialData();

    return () => {
      if (unsubscribeGuitar) unsubscribeGuitar();
      if (unsubscribeStages) unsubscribeStages();
      if (unsubscribeNotes) unsubscribeNotes();
    };
  }, [guitarId, currentUser, userRole, router]);

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
      return "bg-purple-100 text-purple-800 border-purple-200";
    }
    if (statusLower.includes("build") || statusLower.includes("progress")) {
      return "bg-blue-100 text-blue-800 border-blue-200";
    }
    if (statusLower.includes("finish") || statusLower.includes("paint")) {
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    }
    if (statusLower.includes("ready") || statusLower.includes("complete")) {
      return "bg-green-100 text-green-800 border-green-200";
    }
    return "bg-gray-100 text-gray-800 border-gray-200";
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Back Button */}
        <Link
          href="/my-guitars"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to My Guitars</span>
        </Link>

        {/* Hero Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cover Photo */}
            <div>
              {guitar.coverPhotoUrl ? (
                <img
                  src={guitar.coverPhotoUrl}
                  alt={guitar.model}
                  className="w-full h-64 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setSelectedImage(guitar.coverPhotoUrl || null)}
                />
              ) : (
                <div className="w-full h-64 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
                  <Camera className="w-16 h-16 text-gray-400" />
                </div>
              )}
            </div>

            {/* Info */}
            <div>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold mb-2">{guitar.model}</h1>
                  <p className="text-xl text-gray-600 mb-4">{guitar.finish}</p>
                </div>
                <div className={`px-4 py-2 rounded-lg font-semibold border ${getStatusColor(clientStatus)}`}>
                  {clientStatus}
                </div>
              </div>
              
              <div className="space-y-2 text-sm mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Order Number</span>
                  <span className="font-semibold text-gray-900">{guitar.orderNumber}</span>
                </div>
                {guitar.serial && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Serial Number</span>
                    <span className="font-mono text-gray-900">{guitar.serial}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Created</span>
                  <span className="text-gray-900">
                    {new Date(guitar.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Build Progress</span>
                  <span className="text-sm font-semibold text-blue-600">{progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Progress Timeline */}
            {allStages.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold mb-4">Build Timeline</h2>
                <div className="space-y-4">
                  {allStages.map((s, index) => {
                    const isCurrent = s.id === guitar.stageId;
                    const isPast = currentStageIndex > index;
                    const clientLabel = s.clientStatusLabel || s.label;
                    
                    return (
                      <div key={s.id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          {isPast ? (
                            <CheckCircle className="w-6 h-6 text-green-500" />
                          ) : isCurrent ? (
                            <div className="w-6 h-6 rounded-full border-2 border-blue-500 bg-blue-100" />
                          ) : (
                            <Circle className="w-6 h-6 text-gray-300" />
                          )}
                          {index < allStages.length - 1 && (
                            <div
                              className={`w-0.5 h-8 mt-1 ${
                                isPast ? "bg-green-500" : "bg-gray-200"
                              }`}
                            />
                          )}
                        </div>
                        <div className="flex-1 pb-4">
                          <div
                            className={`font-semibold ${
                              isCurrent
                                ? "text-blue-600"
                                : isPast
                                ? "text-green-600"
                                : "text-gray-400"
                            }`}
                          >
                            {clientLabel}
                          </div>
                          {/* Show actual stage label as subtitle if it's different from clientStatusLabel */}
                          {s.clientStatusLabel && s.clientStatusLabel !== s.label && (
                            <div className={`text-sm mt-1 ${
                              isCurrent
                                ? "text-blue-500"
                                : isPast
                                ? "text-green-500"
                                : "text-gray-500"
                            }`}>
                              {s.label}
                            </div>
                          )}
                          {isCurrent && (
                            <div className="text-xs text-gray-500 mt-1">Current Stage</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Updates Timeline */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold mb-4">Updates & Progress</h2>
              {notes.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p>No updates yet. Check back soon for progress updates!</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {notes
                    .sort((a, b) => b.createdAt - a.createdAt)
                    .map((note) => (
                      <div key={note.id} className="border-l-4 border-blue-500 pl-4 pb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-gray-900">{note.authorName}</span>
                          <span className="text-sm text-gray-500">
                            {new Date(note.createdAt).toLocaleDateString()}{" "}
                            {new Date(note.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="text-gray-700 mb-3">{note.message}</p>
                        {note.photoUrls && note.photoUrls.length > 0 && (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3">
                            {note.photoUrls.map((url, idx) => {
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
                                    alt={`Update ${idx + 1}`}
                                    className="w-full h-32 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                                    onClick={() => setSelectedImage(url)}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Reference Images */}
            {guitar.referenceImages && guitar.referenceImages.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold mb-4">Reference Images</h3>
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
                          className="w-full h-24 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setSelectedImage(url)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Build Specifications */}
            {guitar.specs && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold mb-4">Build Specifications</h3>
                <div className="space-y-4 text-sm">
                  {/* Timber & Wood */}
                  {(guitar.specs.bodyWood || guitar.specs.neckWood || guitar.specs.fretboardWood || guitar.specs.topWood) && (
                    <div>
                      <div className="flex items-center gap-2 text-gray-700 font-medium mb-2">
                        <TreePine className="w-4 h-4" />
                        Timber & Wood
                      </div>
                      <div className="space-y-1 pl-6">
                        {guitar.specs.bodyWood && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Body:</span>
                            <span className="text-gray-900">{guitar.specs.bodyWood}</span>
                          </div>
                        )}
                        {guitar.specs.topWood && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Top:</span>
                            <span className="text-gray-900">{guitar.specs.topWood}</span>
                          </div>
                        )}
                        {guitar.specs.neckWood && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Neck:</span>
                            <span className="text-gray-900">{guitar.specs.neckWood}</span>
                          </div>
                        )}
                        {guitar.specs.fretboardWood && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Fretboard:</span>
                            <span className="text-gray-900">{guitar.specs.fretboardWood}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Electronics */}
                  {(guitar.specs.pickupNeck || guitar.specs.pickupBridge || guitar.specs.pickups || guitar.specs.pickupConfiguration || guitar.specs.controls) && (
                    <div>
                      <div className="flex items-center gap-2 text-gray-700 font-medium mb-2">
                        <Zap className="w-4 h-4" />
                        Electronics
                      </div>
                      <div className="space-y-1 pl-6">
                        {guitar.specs.pickupNeck && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Neck Pickup:</span>
                            <span className="text-gray-900">{guitar.specs.pickupNeck}</span>
                          </div>
                        )}
                        {guitar.specs.pickupBridge && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Bridge Pickup:</span>
                            <span className="text-gray-900">{guitar.specs.pickupBridge}</span>
                          </div>
                        )}
                        {/* Legacy support - show old pickups field if new fields aren't set */}
                        {!guitar.specs.pickupNeck && !guitar.specs.pickupBridge && guitar.specs.pickups && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Pickups:</span>
                            <span className="text-gray-900">{guitar.specs.pickups}</span>
                          </div>
                        )}
                        {guitar.specs.pickupConfiguration && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Config:</span>
                            <span className="text-gray-900">{guitar.specs.pickupConfiguration}</span>
                          </div>
                        )}
                        {guitar.specs.controls && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Controls:</span>
                            <span className="text-gray-900">{guitar.specs.controls}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Hardware */}
                  {(guitar.specs.bridge || guitar.specs.tuners || guitar.specs.nut) && (
                    <div>
                      <div className="flex items-center gap-2 text-gray-700 font-medium mb-2">
                        <Settings className="w-4 h-4" />
                        Hardware
                      </div>
                      <div className="space-y-1 pl-6">
                        {guitar.specs.bridge && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Bridge:</span>
                            <span className="text-gray-900">{guitar.specs.bridge}</span>
                          </div>
                        )}
                        {guitar.specs.tuners && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Tuners:</span>
                            <span className="text-gray-900">{guitar.specs.tuners}</span>
                          </div>
                        )}
                        {guitar.specs.nut && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Nut:</span>
                            <span className="text-gray-900">{guitar.specs.nut}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Finish */}
                  {(guitar.specs.finishColor || guitar.specs.finishType) && (
                    <div>
                      <div className="flex items-center gap-2 text-gray-700 font-medium mb-2">
                        <Palette className="w-4 h-4" />
                        Finish
                      </div>
                      <div className="space-y-1 pl-6">
                        {guitar.specs.finishColor && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Color:</span>
                            <span className="text-gray-900">{guitar.specs.finishColor}</span>
                          </div>
                        )}
                        {guitar.specs.finishType && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Type:</span>
                            <span className="text-gray-900">{guitar.specs.finishType}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Custom Notes */}
                  {guitar.specs.customNotes && (
                    <div>
                      <div className="text-gray-700 font-medium mb-2">Additional Notes</div>
                      <p className="text-sm text-gray-600 pl-6">{guitar.specs.customNotes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Photo Gallery */}
            {allPhotos.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold mb-4">All Photos ({allPhotos.length})</h3>
                <div className="grid grid-cols-2 gap-3">
                  {allPhotos.slice(0, 6).map((url, idx) => {
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
                          alt={`Photo ${idx + 1}`}
                          className="w-full h-24 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setSelectedImage(url)}
                        />
                      </div>
                    );
                  })}
                </div>
                {allPhotos.length > 6 && (
                  <p className="text-xs text-gray-500 mt-3 text-center">
                    +{allPhotos.length - 6} more photos
                  </p>
                )}
              </div>
            )}
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
            className="absolute top-4 right-4 text-white hover:text-gray-300 text-2xl font-bold"
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

