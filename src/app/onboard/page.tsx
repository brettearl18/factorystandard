"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeRuns, getFirstStage, createGuitar } from "@/lib/firestore";
import { uploadColorInspirationImage } from "@/lib/storage";
import { useClientProfile } from "@/hooks/useClientProfile";
import type { Run, GuitarSpecs } from "@/types/guitars";
import {
  BODY_WOOD_OPTIONS,
  TOP_WOOD_OPTIONS,
  NECK_WOOD_OPTIONS,
  FRETBOARD_WOOD_OPTIONS,
  PICKUP_NECK_OPTIONS,
  PICKUP_BRIDGE_OPTIONS,
  PICKUP_CONFIGURATION_OPTIONS,
  CONTROLS_OPTIONS,
  SWITCH_OPTIONS,
  BRIDGE_OPTIONS,
  TUNER_OPTIONS,
  NUT_OPTIONS,
  PICKGUARD_OPTIONS,
  STRING_COUNT_OPTIONS,
  STRING_GAUGE_OPTIONS,
  SCALE_LENGTH_OPTIONS,
  ACTION_OPTIONS,
  FINISH_TYPE_OPTIONS,
  BINDING_OPTIONS,
  INLAY_STYLE_OPTIONS,
  INLAY_MATERIAL_OPTIONS,
  FRET_COUNT_OPTIONS,
  NECK_PROFILE_OPTIONS,
  RADIUS_OPTIONS,
  HANDEDNESS_OPTIONS,
} from "@/constants/guitarSpecs";
import { Guitar, Upload, X, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

export default function OnboardPage() {
  const { currentUser, userRole, loading: authLoading } = useAuth();
  const router = useRouter();
  const clientProfile = useClientProfile(currentUser?.uid || null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Form fields
  const [selectedRunId, setSelectedRunId] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [model, setModel] = useState("");
  const [finish, setFinish] = useState("");

  // Specs
  const [specs, setSpecs] = useState<Partial<GuitarSpecs>>({});

  // Color inspiration images
  const [colorImages, setColorImages] = useState<File[]>([]);
  const [colorImagePreviews, setColorImagePreviews] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  // Notes
  const [customNotes, setCustomNotes] = useState("");

  // Redirect if not authenticated or not a client
  useEffect(() => {
    if (!authLoading) {
      if (!currentUser) {
        router.push("/signup");
        return;
      }
      if (userRole !== "client") {
        // If user doesn't have client role, try to refresh token
        if (currentUser && !userRole) {
          currentUser.getIdToken(true).then(() => {
            // Token refreshed, component will re-render
            window.location.reload();
          }).catch(() => {
            router.push("/");
          });
          return;
        }
        router.push("/");
        return;
      }
    }
  }, [currentUser, userRole, authLoading, router]);

  // Get selected run for constraints
  const selectedRun = runs.find((r) => r.id === selectedRunId);
  const constraints = selectedRun?.specConstraints;

  // Helper function to get filtered options based on constraints
  const getFilteredOptions = (
    category: keyof NonNullable<Run["specConstraints"]>,
    allOptions: readonly string[]
  ): string[] => {
    const constraintOptions = constraints?.[category];
    if (!constraintOptions || constraintOptions.length === 0) {
      // No constraints = show all predefined options
      return [...allOptions];
    }
    // Return all constraint options (includes both predefined and custom)
    // This ensures custom options are shown even if not in predefined list
    return constraintOptions;
  };

  // Load runs and filter by assigned runs
  useEffect(() => {
    if (!currentUser || userRole !== "client") return;

    const unsubscribe = subscribeRuns((runsData) => {
      // Only show active, non-archived runs
      let activeRuns = runsData.filter((r) => r.isActive && !r.archived);
      
      // Filter by assigned runs if client has assignedRunIds
      if (clientProfile?.assignedRunIds && clientProfile.assignedRunIds.length > 0) {
        activeRuns = activeRuns.filter((r) => clientProfile.assignedRunIds!.includes(r.id));
      }
      
      setRuns(activeRuns);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, userRole, clientProfile?.assignedRunIds]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newFiles = [...colorImages, ...files].slice(0, 10); // Max 10 images
    setColorImages(newFiles);

    // Create previews
    const newPreviews: string[] = [];
    newFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        newPreviews.push(e.target?.result as string);
        if (newPreviews.length === newFiles.length) {
          setColorImagePreviews(newPreviews);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (index: number) => {
    const newImages = colorImages.filter((_, i) => i !== index);
    const newPreviews = colorImagePreviews.filter((_, i) => i !== index);
    setColorImages(newImages);
    setColorImagePreviews(newPreviews);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    // Validation
    if (!selectedRunId) {
      setError("Please select a run");
      setSubmitting(false);
      return;
    }

    if (!orderNumber.trim()) {
      setError("Order number is required");
      setSubmitting(false);
      return;
    }

    if (!model.trim()) {
      setError("Model is required");
      setSubmitting(false);
      return;
    }

    if (!finish.trim()) {
      setError("Finish is required");
      setSubmitting(false);
      return;
    }

    if (!currentUser) {
      setError("You must be signed in to submit");
      setSubmitting(false);
      return;
    }

    try {
      // Get the first stage (Design & Planning) for the selected run
      const firstStage = await getFirstStage(selectedRunId);
      if (!firstStage) {
        throw new Error("Could not find Design & Planning stage for this run");
      }

      // Upload color inspiration images
      setUploadingImages(true);
      const colorImageUrls: string[] = [];
      try {
        // Force refresh auth token to ensure role is up to date
        if (currentUser) {
          const token = await currentUser.getIdToken(true);
          const tokenResult = await currentUser.getIdTokenResult(true);
          
          // Debug: Log the role to help diagnose issues
          console.log("User role from token:", tokenResult.claims.role);
          console.log("User UID:", currentUser.uid);
          
          // If user doesn't have client role, try to set it
          if (!tokenResult.claims.role || tokenResult.claims.role !== "client") {
            console.warn("User token missing client role, attempting to set it...");
            try {
              const functions = getFunctions();
              const setClientRole = httpsCallable(functions, "setClientRole");
              await setClientRole({
                uid: currentUser.uid,
                displayName: currentUser.displayName || undefined,
              });
              // Refresh token again after setting role
              await currentUser.getIdToken(true);
            } catch (roleError) {
              console.error("Failed to set client role:", roleError);
              throw new Error("Your account doesn't have the correct permissions. Please sign out and sign back in, or contact support.");
            }
          }
        }
        
        for (const image of colorImages) {
          const url = await uploadColorInspirationImage(image, "temp");
          colorImageUrls.push(url);
        }
      } catch (uploadError: any) {
        console.error("Upload error:", uploadError);
        if (uploadError.code === "storage/unauthorized" || uploadError.message?.includes("permission")) {
          throw new Error("Permission denied. Your account may not have the correct role. Please sign out and sign back in, or contact support if the issue persists.");
        }
        throw uploadError;
      } finally {
        setUploadingImages(false);
      }

      // Create guitar specs object
      const guitarSpecs: GuitarSpecs = {
        ...specs,
        customNotes: customNotes.trim() || undefined,
      };

      // Create the guitar record
      await createGuitar({
        runId: selectedRunId,
        stageId: firstStage.id,
        clientUid: currentUser.uid,
        customerName: currentUser.displayName || undefined,
        customerEmail: currentUser.email || undefined,
        orderNumber: orderNumber.trim(),
        model: model.trim(),
        finish: finish.trim(),
        specs: guitarSpecs,
        referenceImages: colorImageUrls.length > 0 ? colorImageUrls : undefined,
      });

      setSuccess(true);
      
      // Redirect to my-guitars page after 2 seconds
      setTimeout(() => {
        router.push("/my-guitars");
      }, 2000);
    } catch (err: any) {
      console.error("Error submitting guitar specs:", err);
      setError(err.message || "Failed to submit guitar specifications. Please try again.");
      setUploadingImages(false);
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Submission Successful!</h2>
          <p className="text-gray-600 mb-4">
            Your guitar specifications have been submitted and are now in the Design & Planning stage.
          </p>
          <p className="text-sm text-gray-500">Redirecting to your guitars...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Guitar className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Guitar Specification Form</h1>
          </div>
          <p className="text-gray-600">
            Fill out the form below to submit your guitar specifications. Your guitar will be placed in the Design & Planning stage.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">Error</p>
              <p className="text-sm">{error}</p>
              {error.includes("permission") || error.includes("unauthorized") ? (
                <p className="text-xs mt-2 text-red-600">
                  If you just signed up, please sign out and sign back in to refresh your permissions.
                </p>
              ) : null}
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>
            {selectedRun && constraints && Object.keys(constraints).length > 0 && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> This run has spec constraints. Only selected options will be available in the form below.
                </p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Run <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedRunId}
                  onChange={(e) => {
                    setSelectedRunId(e.target.value);
                    // Clear specs when run changes to avoid invalid selections
                    setSpecs({});
                  }}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  disabled={submitting}
                >
                  <option value="">Select a run</option>
                  {runs.map((run) => (
                    <option key={run.id} value={run.id}>
                      {run.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Order Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  disabled={submitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Model <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Hype GTR"
                  required
                  disabled={submitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Finish <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={finish}
                  onChange={(e) => setFinish(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Interstellar Blue"
                  required
                  disabled={submitting}
                />
              </div>
            </div>
          </div>

          {/* Timber/Wood Specs */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Timber / Wood</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Body Wood</label>
                <select
                  value={specs.bodyWood || ""}
                  onChange={(e) => setSpecs({ ...specs, bodyWood: e.target.value || undefined })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={submitting}
                >
                  <option value="">Select body wood</option>
                  {getFilteredOptions("bodyWood", BODY_WOOD_OPTIONS).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Top Wood</label>
                <select
                  value={specs.topWood || ""}
                  onChange={(e) => setSpecs({ ...specs, topWood: e.target.value || undefined })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={submitting}
                >
                  <option value="">Select top wood</option>
                  {getFilteredOptions("topWood", TOP_WOOD_OPTIONS).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Neck Wood</label>
                <select
                  value={specs.neckWood || ""}
                  onChange={(e) => setSpecs({ ...specs, neckWood: e.target.value || undefined })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={submitting}
                >
                  <option value="">Select neck wood</option>
                  {getFilteredOptions("neckWood", NECK_WOOD_OPTIONS).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fretboard Wood</label>
                <select
                  value={specs.fretboardWood || ""}
                  onChange={(e) => setSpecs({ ...specs, fretboardWood: e.target.value || undefined })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={submitting}
                >
                  <option value="">Select fretboard wood</option>
                  {getFilteredOptions("fretboardWood", FRETBOARD_WOOD_OPTIONS).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Hardware */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Hardware</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bridge</label>
                <select
                  value={specs.bridge || ""}
                  onChange={(e) => setSpecs({ ...specs, bridge: e.target.value || undefined })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={submitting}
                >
                  <option value="">Select bridge</option>
                  {getFilteredOptions("bridge", BRIDGE_OPTIONS).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tuners</label>
                <select
                  value={specs.tuners || ""}
                  onChange={(e) => setSpecs({ ...specs, tuners: e.target.value || undefined })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={submitting}
                >
                  <option value="">Select tuners</option>
                  {getFilteredOptions("tuners", TUNER_OPTIONS).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nut</label>
                <select
                  value={specs.nut || ""}
                  onChange={(e) => setSpecs({ ...specs, nut: e.target.value || undefined })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={submitting}
                >
                  <option value="">Select nut</option>
                  {getFilteredOptions("nut", NUT_OPTIONS).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Pickguard</label>
                <select
                  value={specs.pickguard || ""}
                  onChange={(e) => setSpecs({ ...specs, pickguard: e.target.value || undefined })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={submitting}
                >
                  <option value="">Select pickguard</option>
                  {getFilteredOptions("pickguard", PICKGUARD_OPTIONS).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Electronics */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Electronics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Pickup Configuration</label>
                <select
                  value={specs.pickupConfiguration || ""}
                  onChange={(e) => setSpecs({ ...specs, pickupConfiguration: e.target.value || undefined })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={submitting}
                >
                  <option value="">Select configuration</option>
                  {getFilteredOptions("pickupConfiguration", PICKUP_CONFIGURATION_OPTIONS).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Neck Pickup</label>
                <select
                  value={specs.pickupNeck || ""}
                  onChange={(e) => setSpecs({ ...specs, pickupNeck: e.target.value || undefined })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={submitting}
                >
                  <option value="">Select neck pickup</option>
                  {getFilteredOptions("pickupNeck", PICKUP_NECK_OPTIONS).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bridge Pickup</label>
                <select
                  value={specs.pickupBridge || ""}
                  onChange={(e) => setSpecs({ ...specs, pickupBridge: e.target.value || undefined })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={submitting}
                >
                  <option value="">Select bridge pickup</option>
                  {getFilteredOptions("pickupBridge", PICKUP_BRIDGE_OPTIONS).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Controls</label>
                <select
                  value={specs.controls || ""}
                  onChange={(e) => setSpecs({ ...specs, controls: e.target.value || undefined })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={submitting}
                >
                  <option value="">Select controls</option>
                  {getFilteredOptions("controls", CONTROLS_OPTIONS).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Switch</label>
                <select
                  value={specs.switch || ""}
                  onChange={(e) => setSpecs({ ...specs, switch: e.target.value || undefined })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={submitting}
                >
                  <option value="">Select switch</option>
                  {getFilteredOptions("switch", SWITCH_OPTIONS).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Strings & Setup */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Strings & Setup</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">String Count</label>
                <select
                  value={specs.strings || ""}
                  onChange={(e) => setSpecs({ ...specs, strings: e.target.value || undefined })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={submitting}
                >
                  <option value="">Select string count</option>
                  {getFilteredOptions("strings", STRING_COUNT_OPTIONS).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">String Gauge</label>
                <select
                  value={specs.stringGauge || ""}
                  onChange={(e) => setSpecs({ ...specs, stringGauge: e.target.value || undefined })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={submitting}
                >
                  <option value="">Select string gauge</option>
                  {getFilteredOptions("stringGauge", STRING_GAUGE_OPTIONS).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Scale Length</label>
                <select
                  value={specs.scaleLength || ""}
                  onChange={(e) => setSpecs({ ...specs, scaleLength: e.target.value || undefined })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={submitting}
                >
                  <option value="">Select scale length</option>
                  {getFilteredOptions("scaleLength", SCALE_LENGTH_OPTIONS).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Action</label>
                <select
                  value={specs.action || ""}
                  onChange={(e) => setSpecs({ ...specs, action: e.target.value || undefined })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={submitting}
                >
                  <option value="">Select action</option>
                  {getFilteredOptions("action", ACTION_OPTIONS).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Finish & Appearance */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Finish & Appearance</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Finish Color</label>
                <input
                  type="text"
                  value={specs.finishColor || ""}
                  onChange={(e) => setSpecs({ ...specs, finishColor: e.target.value || undefined })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Interstellar Blue"
                  disabled={submitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Finish Type</label>
                <select
                  value={specs.finishType || ""}
                  onChange={(e) => setSpecs({ ...specs, finishType: e.target.value || undefined })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={submitting}
                >
                  <option value="">Select finish type</option>
                  {getFilteredOptions("finishType", FINISH_TYPE_OPTIONS).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Binding</label>
                <select
                  value={specs.binding || ""}
                  onChange={(e) => setSpecs({ ...specs, binding: e.target.value || undefined })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={submitting}
                >
                  <option value="">Select binding</option>
                  {getFilteredOptions("binding", BINDING_OPTIONS).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Inlay Style</label>
                <select
                  value={specs.inlays || ""}
                  onChange={(e) => setSpecs({ ...specs, inlays: e.target.value || undefined })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={submitting}
                >
                  <option value="">Select inlay style</option>
                  {getFilteredOptions("inlays", INLAY_STYLE_OPTIONS).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Other Specs */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Other Specifications</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fret Count</label>
                <select
                  value={specs.frets || ""}
                  onChange={(e) => setSpecs({ ...specs, frets: e.target.value || undefined })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={submitting}
                >
                  <option value="">Select fret count</option>
                  {getFilteredOptions("frets", FRET_COUNT_OPTIONS).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Neck Profile</label>
                <select
                  value={specs.neckProfile || ""}
                  onChange={(e) => setSpecs({ ...specs, neckProfile: e.target.value || undefined })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={submitting}
                >
                  <option value="">Select neck profile</option>
                  {getFilteredOptions("neckProfile", NECK_PROFILE_OPTIONS).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Radius</label>
                <select
                  value={specs.radius || ""}
                  onChange={(e) => setSpecs({ ...specs, radius: e.target.value || undefined })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={submitting}
                >
                  <option value="">Select radius</option>
                  {getFilteredOptions("radius", RADIUS_OPTIONS).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Handedness</label>
                <select
                  value={specs.handedness || ""}
                  onChange={(e) => setSpecs({ ...specs, handedness: e.target.value || undefined })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={submitting}
                >
                  <option value="">Select handedness</option>
                  {getFilteredOptions("handedness", HANDEDNESS_OPTIONS).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Color Inspiration Images */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Color Inspiration Images</h2>
            <p className="text-sm text-gray-600 mb-4">
              Upload images that show the colors, finishes, or styles you'd like for your guitar (max 10 images)
            </p>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="flex-1 cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageSelect}
                    className="hidden"
                    disabled={submitting || colorImages.length >= 10}
                  />
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">
                      Click to upload images
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {colorImages.length}/10 images selected
                    </p>
                  </div>
                </label>
              </div>
              {colorImagePreviews.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {colorImagePreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={preview}
                        alt={`Color inspiration ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        disabled={submitting}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Additional Notes</h2>
            <textarea
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              rows={6}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Any additional notes, special requests, or details about your guitar..."
              disabled={submitting}
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => router.push("/my-guitars")}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || uploadingImages}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
            >
              {submitting || uploadingImages ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {uploadingImages ? "Uploading images..." : "Submitting..."}
                </>
              ) : (
                "Submit Specifications"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

