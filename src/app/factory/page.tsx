"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import type { Run, GuitarBuild, RunStage } from "@/types/guitars";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useRuns } from "@/hooks/useRuns";
import { useClientDisplayNames } from "@/hooks/useClientDisplayNames";
import { subscribeGuitarsForRun, subscribeRunStages, getRun, subscribeGuitarNotes } from "@/lib/firestore";
import { Package, Guitar, Camera, ArrowLeft, LogOut, Check, Info, FileText, TreePine, Zap, Settings, Palette, Clock, ChevronRight, X, User, ImagePlus } from "lucide-react";
import { getNoteTypeLabel, getNoteTypeIcon, getNoteTypeColor } from "@/utils/noteTypes";
import { compressImageForUpload } from "@/utils/imageCompression";
import type { GuitarNote } from "@/types/guitars";
import { MobileGuitarDetailsView } from "./MobileGuitarDetailsView";

export default function FactoryPortalPage() {
  const { currentUser, userRole, loading, signOut } = useAuth();
  const router = useRouter();
  const runs = useRuns();
  const [selectedRun, setSelectedRun] = useState<Run | null>(null);
  const [selectedGuitar, setSelectedGuitar] = useState<GuitarBuild | null>(null);
  const [guitars, setGuitars] = useState<GuitarBuild[]>([]);
  const [stages, setStages] = useState<RunStage[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [showGuitarDetails, setShowGuitarDetails] = useState(false);

  const clientUidsNeedingNames = useMemo(
    () => guitars.filter((g) => g.clientUid && !g.customerName?.trim()).map((g) => g.clientUid!),
    [guitars]
  );
  const clientDisplayNames = useClientDisplayNames(clientUidsNeedingNames);
  const guitarsWithClientNames = useMemo(
    () =>
      guitars.map((g) =>
        g.clientUid && !g.customerName?.trim() && clientDisplayNames[g.clientUid]
          ? { ...g, customerName: clientDisplayNames[g.clientUid] }
          : g
      ),
    [guitars, clientDisplayNames]
  );

  useEffect(() => {
    if (loading) return;

    if (!currentUser) {
      router.push("/login");
      return;
    }

    // Allow factory, staff, and admin to access
    if (userRole !== "factory" && userRole !== "staff" && userRole !== "admin") {
      router.push("/");
      return;
    }
  }, [currentUser, userRole, loading, router]);

  // Load guitars and stages when run is selected
  useEffect(() => {
    if (!selectedRun) {
      setGuitars([]);
      setStages([]);
      return;
    }

    const unsubscribes: (() => void)[] = [];

    const unsubscribeGuitars = subscribeGuitarsForRun(selectedRun.id, (loadedGuitars) => {
      setGuitars(loadedGuitars.filter(g => !g.archived));
    });
    unsubscribes.push(unsubscribeGuitars);

    const unsubscribeStages = subscribeRunStages(selectedRun.id, (loadedStages) => {
      setStages(loadedStages.sort((a, b) => a.order - b.order));
    });
    unsubscribes.push(unsubscribeStages);

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [selectedRun]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!currentUser || (userRole !== "factory" && userRole !== "staff" && userRole !== "admin")) {
    return null;
  }

  const activeRuns = runs.filter(r => r.isActive && !r.archived);

  // If no run selected, show run list
  if (!selectedRun) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="px-4 py-4 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Factory Portal</h1>
            <button
              onClick={async () => {
                await signOut();
                router.push("/login");
              }}
              className="p-2 text-gray-600 hover:text-gray-900"
            >
              <LogOut className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Run List */}
        <div className="px-4 py-6 space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Runs</h2>
          {activeRuns.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No active runs</p>
            </div>
          ) : (
            activeRuns.map((run) => (
              <button
                key={run.id}
                onClick={() => setSelectedRun(run)}
                className="w-full bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-left hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3">
                  {run.thumbnailUrl ? (
                    <img
                      src={run.thumbnailUrl}
                      alt={run.name}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center">
                      <Package className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{run.name}</h3>
                    <p className="text-sm text-gray-500">Tap to view guitars</p>
                  </div>
                  <ArrowLeft className="w-5 h-5 text-gray-400 rotate-180" />
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  // If guitar selected, show details or camera
  if (selectedGuitar && showGuitarDetails) {
    return (
      <MobileGuitarDetailsView
        guitar={selectedGuitar}
        stages={stages}
        onClose={() => {
          setShowGuitarDetails(false);
          setSelectedGuitar(null);
        }}
        onUpdate={() => {
          setShowGuitarDetails(false);
          setShowCamera(true);
        }}
      />
    );
  }

  // If guitar selected, show camera/update interface
  if (selectedGuitar && showCamera) {
    return (
      <MobileCameraView
        guitar={selectedGuitar}
        stages={stages}
        currentStage={stages.find(s => s.id === selectedGuitar.stageId)}
        onClose={() => {
          setShowCamera(false);
          setSelectedGuitar(null);
        }}
        onSuccess={() => {
          setShowCamera(false);
          setSelectedGuitar(null);
        }}
      />
    );
  }

  // Show guitar list for selected run
  const currentStage = selectedGuitar ? stages.find(s => s.id === selectedGuitar.stageId) : null;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => {
              setSelectedRun(null);
              setSelectedGuitar(null);
            }}
            className="p-2 -ml-2"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900 truncate">{selectedRun?.name}</h1>
            <p className="text-sm text-gray-500">{guitars.length} guitar{guitars.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
      </div>

      {/* Guitar List */}
      <div className="px-4 py-6 space-y-3">
        {guitars.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Guitar className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No guitars in this run</p>
          </div>
        ) : (
          guitarsWithClientNames.map((guitar) => {
            const guitarStage = stages.find(s => s.id === guitar.stageId);
            const clientName = guitar.customerName || "No client assigned";
            return (
              <button
                key={guitar.id}
                onClick={() => {
                  setSelectedGuitar(guitar);
                  setShowGuitarDetails(true);
                }}
                className="w-full bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-left hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Guitar className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900">{guitar.model}</h3>
                    <p className="text-sm text-gray-600">{guitar.finish}</p>
                    <p className="text-xs text-gray-500 mt-1">Order: {guitar.orderNumber}</p>
                    <p className="text-xs text-gray-700 mt-1 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span className="truncate">{clientName}</span>
                    </p>
                    {guitarStage && (
                      <span className="inline-block mt-2 px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded">
                        {guitarStage.label}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <Camera className="w-6 h-6 text-blue-600" />
                    <span className="text-xs text-gray-500">Update</span>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

// Mobile Camera Component
interface MobileCameraViewProps {
  guitar: GuitarBuild;
  stages: RunStage[];
  currentStage: RunStage | undefined;
  onClose: () => void;
  onSuccess: () => void;
}

function MobileCameraView({ guitar, stages, currentStage, onSuccess, onClose }: MobileCameraViewProps) {
  const { currentUser } = useAuth();
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [selectedStage, setSelectedStage] = useState<string>(guitar.stageId);
  const [selectedWorker, setSelectedWorker] = useState<string>("Perry");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Factory workers list
  const factoryWorkers = [
    { value: "Perry", label: "Perry" },
    { value: "Alex", label: "Alex" },
    { value: "Jett", label: "Jett" },
  ];

  // Set default worker based on current user
  useEffect(() => {
    if (currentUser && selectedWorker === "Perry") {
      const userEmail = currentUser.email?.toLowerCase() || "";
      const userName = currentUser.displayName || "";
      
      // Try to match user to worker
      if (userEmail.includes("alex") || userName.includes("Alex")) {
        setSelectedWorker("Alex");
      } else if (userEmail.includes("jett") || userName.includes("Jett")) {
        setSelectedWorker("Jett");
      }
    }
  }, [currentUser]);

  const processNewPhotos = (files: File[]) => {
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (images.length === 0) return;
    setPhotos((prev) => [...prev, ...images]);
    images.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    processNewPhotos(files);
    e.target.value = "";
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (photos.length === 0 && !message.trim()) {
      alert("Please add at least one photo or a message");
      return;
    }

    if (!currentUser) return;

    setIsSubmitting(true);
    setUploading(true);

    try {
      const { updateGuitarStage, addGuitarNote, updateGuitarPhotoInfo } = await import("@/lib/firestore");
      const { uploadGuitarPhoto } = await import("@/lib/storage");

      const targetStage = stages.find(s => s.id === selectedStage) || currentStage;
      if (!targetStage) {
        alert("Invalid stage selected");
        return;
      }

      // Upload all photos with error handling (compress first, same as Custom Shop)
      const photoUrls: string[] = [];
      if (photos.length > 0) {
        for (let i = 0; i < photos.length; i++) {
          try {
            const photo = photos[i];
            const compressed = await compressImageForUpload(photo);
            const url = await uploadGuitarPhoto(guitar.id, targetStage.id, compressed);
            photoUrls.push(url);
            console.log(`Uploaded photo ${i + 1}/${photos.length}`);
          } catch (error) {
            console.error(`Failed to upload photo ${i + 1}:`, error);
            alert(`Failed to upload photo ${i + 1}. Please try again.`);
            // Continue with other photos
          }
        }
        
        if (photoUrls.length === 0) {
          alert("Failed to upload any photos. Please try again.");
          setIsSubmitting(false);
          setUploading(false);
          return;
        }
        
        if (photoUrls.length < photos.length) {
          alert(`Warning: Only ${photoUrls.length} of ${photos.length} photos uploaded successfully.`);
        }
      }

      // Update stage if changed
      if (selectedStage !== guitar.stageId) {
        await updateGuitarStage(guitar.id, selectedStage, currentUser.uid);
      }

      // Add note with all photos
      const workerName = selectedWorker || currentUser.displayName || currentUser.email || "Factory Worker";
      await addGuitarNote(guitar.id, {
        guitarId: guitar.id,
        stageId: targetStage.id,
        authorUid: currentUser.uid,
        authorName: workerName,
        message: message.trim() || "Stage update",
        type: "update",
        visibleToClient: true,
        photoUrls: photoUrls.length > 0 ? photoUrls : undefined,
      });

      // Update guitar photo info if photos were added
      if (photoUrls.length > 0) {
        const coverPhotoUrl = guitar.coverPhotoUrl || photoUrls[0];
        const currentPhotoCount = guitar.photoCount || 0;
        await updateGuitarPhotoInfo(guitar.id, coverPhotoUrl, currentPhotoCount + photoUrls.length);
      }

      onSuccess();
    } catch (error) {
      console.error("Error updating guitar:", error);
      alert("Failed to update. Please try again.");
    } finally {
      setIsSubmitting(false);
      setUploading(false);
    }
  };

  const nextStage = stages.find(s => s.order > (currentStage?.order || 0));
  const canMoveToNext = nextStage && selectedStage === guitar.stageId;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-4 flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 -ml-2"
            disabled={isSubmitting}
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900 truncate">{guitar.model}</h1>
            <p className="text-sm text-gray-500">{guitar.finish} • {guitar.orderNumber}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-6 space-y-6">
        {/* Current Stage */}
        {currentStage && (
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Current Stage</p>
            <p className="text-lg font-semibold text-gray-900">{currentStage.label}</p>
          </div>
        )}

        {/* Stage Selector */}
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Move to Stage
          </label>
          <select
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isSubmitting}
          >
            {stages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.label}
              </option>
            ))}
          </select>
          {canMoveToNext && (
            <button
              onClick={() => setSelectedStage(nextStage!.id)}
              className="mt-3 w-full px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium"
            >
              Quick: Move to {nextStage!.label} →
            </button>
          )}
        </div>

        {/* Photo Capture */}
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Photos {photos.length > 0 && `(${photos.length})`}
          </label>
          {/* Gallery: no capture = photo library on mobile */}
          <input
            id="factory-photo-gallery"
            ref={galleryInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/heic"
            multiple
            onChange={handlePhotoChange}
            className="hidden"
            aria-label="Add from gallery"
            disabled={isSubmitting}
          />
          {/* Camera: capture = opens camera on mobile */}
          <input
            id="factory-photo-camera"
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={handlePhotoChange}
            className="hidden"
            aria-label="Take photo"
            disabled={isSubmitting}
          />
          {photoPreviews.length > 0 ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {photoPreviews.map((preview, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full shadow-md hover:bg-red-600"
                      disabled={isSubmitting}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 flex-wrap">
                <label
                  htmlFor="factory-photo-gallery"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-50 text-blue-700 font-medium border border-blue-200 cursor-pointer hover:bg-blue-100 disabled:opacity-50 disabled:pointer-events-none"
                >
                  <ImagePlus className="w-5 h-5" />
                  Add from gallery
                </label>
                <label
                  htmlFor="factory-photo-camera"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gray-100 text-gray-700 font-medium border border-gray-200 cursor-pointer hover:bg-gray-200 disabled:opacity-50 disabled:pointer-events-none"
                >
                  <Camera className="w-5 h-5" />
                  Take photo
                </label>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex gap-2 flex-wrap">
                <label
                  htmlFor="factory-photo-gallery"
                  className="flex-1 min-w-[140px] py-4 px-4 rounded-lg border-2 border-blue-300 bg-blue-50 text-blue-800 font-medium flex flex-col items-center justify-center gap-2 hover:bg-blue-100 hover:border-blue-400 transition-colors cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                >
                  <ImagePlus className="w-10 h-10" />
                  <span>Add from gallery</span>
                </label>
                <label
                  htmlFor="factory-photo-camera"
                  className="flex-1 min-w-[140px] py-4 px-4 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-2 hover:border-blue-400 hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                >
                  <Camera className="w-10 h-10 text-gray-500" />
                  <span>Take photo</span>
                </label>
              </div>
              <p className="text-sm text-gray-500 text-center">Choose from your photos or use the camera</p>
            </div>
          )}
        </div>

        {/* Worker Selection */}
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Updated By
          </label>
          <select
            value={selectedWorker}
            onChange={(e) => setSelectedWorker(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-lg"
            disabled={isSubmitting}
          >
            {factoryWorkers.map((worker) => (
              <option key={worker.value} value={worker.value}>
                {worker.label}
              </option>
            ))}
          </select>
        </div>

        {/* Message */}
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Note (Optional)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Add a note about this update..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={4}
            disabled={isSubmitting}
          />
        </div>
      </div>

      {/* Submit Button */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || (photos.length === 0 && !message.trim())}
          className="w-full py-4 bg-blue-600 text-white rounded-lg font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {uploading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Check className="w-5 h-5" />
              Update Guitar
            </>
          )}
        </button>
      </div>
    </div>
  );
}

