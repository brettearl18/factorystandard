"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeRuns, getFirstStage, createGuitar } from "@/lib/firestore";
import { uploadColorInspirationImage } from "@/lib/storage";
import { useClientProfile } from "@/hooks/useClientProfile";
import { getFunctions, httpsCallable } from "firebase/functions";
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
    // Always return an array, even if it has only 1 option (dropdown will still work)
    // The dropdown will show: empty "Select..." option + the constraint option(s)
    return Array.isArray(constraintOptions) ? [...constraintOptions] : [];
  };

  // Auto-set spec value when there's only 1 option available
  useEffect(() => {
    if (!selectedRunId || !constraints) return;

    const categories: Array<{ key: keyof GuitarSpecs; constraintKey: keyof NonNullable<Run["specConstraints"]>; options: readonly string[] }> = [
      { key: "bodyWood", constraintKey: "bodyWood", options: BODY_WOOD_OPTIONS },
      { key: "topWood", constraintKey: "topWood", options: TOP_WOOD_OPTIONS },
      { key: "neckWood", constraintKey: "neckWood", options: NECK_WOOD_OPTIONS },
      { key: "fretboardWood", constraintKey: "fretboardWood", options: FRETBOARD_WOOD_OPTIONS },
      { key: "pickupNeck", constraintKey: "pickupNeck", options: PICKUP_NECK_OPTIONS },
      { key: "pickupBridge", constraintKey: "pickupBridge", options: PICKUP_BRIDGE_OPTIONS },
      { key: "pickupConfiguration", constraintKey: "pickupConfiguration", options: PICKUP_CONFIGURATION_OPTIONS },
      { key: "controls", constraintKey: "controls", options: CONTROLS_OPTIONS },
      { key: "switch", constraintKey: "switch", options: SWITCH_OPTIONS },
      { key: "bridge", constraintKey: "bridge", options: BRIDGE_OPTIONS },
      { key: "tuners", constraintKey: "tuners", options: TUNER_OPTIONS },
      { key: "nut", constraintKey: "nut", options: NUT_OPTIONS },
      { key: "pickguard", constraintKey: "pickguard", options: PICKGUARD_OPTIONS },
      { key: "strings", constraintKey: "strings", options: STRING_COUNT_OPTIONS },
      { key: "stringGauge", constraintKey: "stringGauge", options: STRING_GAUGE_OPTIONS },
      { key: "scaleLength", constraintKey: "scaleLength", options: SCALE_LENGTH_OPTIONS },
      { key: "action", constraintKey: "action", options: ACTION_OPTIONS },
      { key: "finishType", constraintKey: "finishType", options: FINISH_TYPE_OPTIONS },
      { key: "binding", constraintKey: "binding", options: BINDING_OPTIONS },
      { key: "inlays", constraintKey: "inlays", options: INLAY_STYLE_OPTIONS },
      { key: "frets", constraintKey: "frets", options: FRET_COUNT_OPTIONS },
      { key: "neckProfile", constraintKey: "neckProfile", options: NECK_PROFILE_OPTIONS },
      { key: "radius", constraintKey: "radius", options: RADIUS_OPTIONS },
      { key: "handedness", constraintKey: "handedness", options: HANDEDNESS_OPTIONS },
    ];

    const updates: Partial<GuitarSpecs> = {};
    categories.forEach(({ key, constraintKey, options }) => {
      const filtered = getFilteredOptions(constraintKey, options);
      if (filtered.length === 1) {
        // Auto-set the value if there's only 1 option
        updates[key] = filtered[0];
      }
    });

    if (Object.keys(updates).length > 0) {
      setSpecs((prevSpecs) => ({ ...prevSpecs, ...updates }));
    }
  }, [selectedRunId, constraints]);

  // Helper function to render spec field (read-only input if 1 option, dropdown if multiple)
  const renderSpecField = (
    category: keyof NonNullable<Run["specConstraints"]>,
    specKey: keyof GuitarSpecs,
    allOptions: readonly string[],
    placeholder: string,
    label: string
  ) => {
    const options = getFilteredOptions(category, allOptions);
    const isSingleOption = options.length === 1;
    const currentValue = specs[specKey] || "";

    if (isSingleOption) {
      return (
        <input
          type="text"
          value={options[0]}
          readOnly
          className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
        />
      );
    }

    return (
      <select
        value={currentValue}
        onChange={(e) => setSpecs({ ...specs, [specKey]: e.target.value || undefined })}
        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        disabled={submitting}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
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
                {renderSpecField("bodyWood", "bodyWood", BODY_WOOD_OPTIONS, "Select body wood", "Body Wood")}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Top Wood</label>
                {renderSpecField("topWood", "topWood", TOP_WOOD_OPTIONS, "Select top wood", "Top Wood")}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Neck Wood</label>
                {renderSpecField("neckWood", "neckWood", NECK_WOOD_OPTIONS, "Select neck wood", "Neck Wood")}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fretboard Wood</label>
                {renderSpecField("fretboardWood", "fretboardWood", FRETBOARD_WOOD_OPTIONS, "Select fretboard wood", "Fretboard Wood")}
              </div>
            </div>
          </div>

          {/* Hardware */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Hardware</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bridge</label>
                {renderSpecField("bridge", "bridge", BRIDGE_OPTIONS, "Select bridge", "Bridge")}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tuners</label>
                {renderSpecField("tuners", "tuners", TUNER_OPTIONS, "Select tuners", "Tuners")}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nut</label>
                {renderSpecField("nut", "nut", NUT_OPTIONS, "Select nut", "Nut")}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Pickguard</label>
                {renderSpecField("pickguard", "pickguard", PICKGUARD_OPTIONS, "Select pickguard", "Pickguard")}
              </div>
            </div>
          </div>

          {/* Electronics */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Electronics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Pickup Configuration</label>
                {renderSpecField("pickupConfiguration", "pickupConfiguration", PICKUP_CONFIGURATION_OPTIONS, "Select configuration", "Pickup Configuration")}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Neck Pickup</label>
                {renderSpecField("pickupNeck", "pickupNeck", PICKUP_NECK_OPTIONS, "Select neck pickup", "Neck Pickup")}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bridge Pickup</label>
                {renderSpecField("pickupBridge", "pickupBridge", PICKUP_BRIDGE_OPTIONS, "Select bridge pickup", "Bridge Pickup")}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Controls</label>
                {renderSpecField("controls", "controls", CONTROLS_OPTIONS, "Select controls", "Controls")}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Switch</label>
                {renderSpecField("switch", "switch", SWITCH_OPTIONS, "Select switch", "Switch")}
              </div>
            </div>
          </div>

          {/* Strings & Setup */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Strings & Setup</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">String Count</label>
                {renderSpecField("strings", "strings", STRING_COUNT_OPTIONS, "Select string count", "String Count")}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">String Gauge</label>
                {renderSpecField("stringGauge", "stringGauge", STRING_GAUGE_OPTIONS, "Select string gauge", "String Gauge")}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Scale Length</label>
                {renderSpecField("scaleLength", "scaleLength", SCALE_LENGTH_OPTIONS, "Select scale length", "Scale Length")}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Action</label>
                {renderSpecField("action", "action", ACTION_OPTIONS, "Select action", "Action")}
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
                {renderSpecField("finishType", "finishType", FINISH_TYPE_OPTIONS, "Select finish type", "Finish Type")}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Binding</label>
                {renderSpecField("binding", "binding", BINDING_OPTIONS, "Select binding", "Binding")}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Inlay Style</label>
                {renderSpecField("inlays", "inlays", INLAY_STYLE_OPTIONS, "Select inlay style", "Inlay Style")}
              </div>
            </div>
          </div>

          {/* Other Specs */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Other Specifications</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fret Count</label>
                {renderSpecField("frets", "frets", FRET_COUNT_OPTIONS, "Select fret count", "Fret Count")}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Neck Profile</label>
                {renderSpecField("neckProfile", "neckProfile", NECK_PROFILE_OPTIONS, "Select neck profile", "Neck Profile")}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Radius</label>
                {renderSpecField("radius", "radius", RADIUS_OPTIONS, "Select radius", "Radius")}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Handedness</label>
                {renderSpecField("handedness", "handedness", HANDEDNESS_OPTIONS, "Select handedness", "Handedness")}
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

