"use client";

import { useState, useEffect } from "react";
import { X, Upload, Image as ImageIcon, Search, Check, UserPlus, ExternalLink } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { updateGuitar, subscribeRunStages } from "@/lib/firestore";
import { uploadReferenceImage } from "@/lib/storage";
import { getFunctions, httpsCallable } from "firebase/functions";
import type { GuitarBuild, GuitarSpecs, RunStage } from "@/types/guitars";
import { BODY_WOOD_OPTIONS, TOP_WOOD_OPTIONS, NECK_WOOD_OPTIONS, FRETBOARD_WOOD_OPTIONS, ORMSBY_PICKUP_MODELS, PICKUP_NECK_OPTIONS, PICKUP_BRIDGE_OPTIONS, PICKUP_CONFIGURATION_OPTIONS, CONTROLS_OPTIONS, SWITCH_OPTIONS, BRIDGE_OPTIONS, TUNER_OPTIONS, NUT_OPTIONS, PICKGUARD_OPTIONS, STRING_COUNT_OPTIONS, STRING_GAUGE_OPTIONS, SCALE_LENGTH_OPTIONS, ACTION_OPTIONS, FINISH_TYPE_OPTIONS, BINDING_OPTIONS, INLAY_STYLE_OPTIONS, FRET_COUNT_OPTIONS, NECK_PROFILE_OPTIONS, RADIUS_OPTIONS } from "@/constants/guitarSpecs";

interface EditGuitarModalProps {
  guitar: GuitarBuild;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function EditGuitarModal({
  guitar,
  isOpen,
  onClose,
  onSuccess,
}: EditGuitarModalProps) {
  const { currentUser } = useAuth();
  const [stages, setStages] = useState<RunStage[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form fields - initialized from guitar
  const [customerName, setCustomerName] = useState(guitar.customerName || "");
  const [customerEmail, setCustomerEmail] = useState(guitar.customerEmail || "");
  const [orderNumber, setOrderNumber] = useState(guitar.orderNumber);
  const [model, setModel] = useState(guitar.model);
  const [finish, setFinish] = useState(guitar.finish);
  const [serial, setSerial] = useState(guitar.serial || "");
  const [clientUid, setClientUid] = useState(guitar.clientUid || "");
  const [stageId, setStageId] = useState(guitar.stageId);

  // Specs fields
  const [specs, setSpecs] = useState<Partial<GuitarSpecs>>(guitar.specs || {});

  // Reference images
  const [existingReferenceImages, setExistingReferenceImages] = useState<string[]>(
    guitar.referenceImages || []
  );
  const [newReferenceImages, setNewReferenceImages] = useState<File[]>([]);
  const [newReferenceImageUrls, setNewReferenceImageUrls] = useState<string[]>([]); // For Google Drive links
  const [uploadingImages, setUploadingImages] = useState(false);
  const [driveLinkInput, setDriveLinkInput] = useState("");

  // User lookup
  const [lookingUpUser, setLookingUpUser] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [lookupResult, setLookupResult] = useState<{
    success: boolean;
    uid?: string;
    message?: string;
  } | null>(null);

  // Load stages when modal opens
  useEffect(() => {
    if (isOpen && guitar.runId) {
      setLoading(true);
      const unsubscribe = subscribeRunStages(guitar.runId, (loadedStages) => {
        setStages(loadedStages);
        setLoading(false);
      });
      return () => unsubscribe();
    }
  }, [isOpen, guitar.runId]);

  // Reset form when guitar changes
  useEffect(() => {
    if (isOpen) {
      setCustomerName(guitar.customerName || "");
      setCustomerEmail(guitar.customerEmail || "");
      setOrderNumber(guitar.orderNumber);
      setModel(guitar.model);
      setFinish(guitar.finish);
      setSerial(guitar.serial || "");
      setClientUid(guitar.clientUid || "");
      setStageId(guitar.stageId);
      setSpecs(guitar.specs || {});
      setExistingReferenceImages(guitar.referenceImages || []);
      setNewReferenceImages([]);
      setNewReferenceImageUrls([]);
      setDriveLinkInput("");
      setLookupResult(null);
    }
  }, [isOpen, guitar]);

  if (!isOpen) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setNewReferenceImages(Array.from(e.target.files));
    }
  };

  const removeExistingImage = (index: number) => {
    setExistingReferenceImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeNewImage = (index: number) => {
    setNewReferenceImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeNewImageUrl = (index: number) => {
    setNewReferenceImageUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddDriveLink = () => {
    if (!driveLinkInput.trim()) return;
    
    // Store the link as-is (no conversion needed for folder links)
    setNewReferenceImageUrls((prev) => [...prev, driveLinkInput.trim()]);
    setDriveLinkInput("");
  };

  const handleLookupUser = async () => {
    if (!customerEmail.trim()) {
      alert("Please enter a customer email first");
      return;
    }

    setLookingUpUser(true);
    setLookupResult(null);

    try {
      const functions = getFunctions();
      const lookupUser = httpsCallable(functions, "lookupUserByEmail");
      const result = await lookupUser({ email: customerEmail.trim() });
      const data = result.data as any;

      if (data.success) {
        setClientUid(data.uid);
        setLookupResult({
          success: true,
          uid: data.uid,
        });
      } else {
        setLookupResult({
          success: false,
          message: data.message || "User not found",
        });
      }
    } catch (error: any) {
      console.error("Error looking up user:", error);
      setLookupResult({
        success: false,
        message: error.message || "Failed to look up user",
      });
    } finally {
      setLookingUpUser(false);
    }
  };

  const handleCreateUser = async () => {
    if (!customerEmail.trim()) {
      alert("Please enter a customer email first");
      return;
    }

    if (!customerName.trim()) {
      alert("Please enter a customer name first");
      return;
    }

    const confirmCreate = confirm(
      `Create a new Firebase Auth user for ${customerEmail}? They will receive a password reset email to set their password.`
    );

    if (!confirmCreate) return;

    setCreatingUser(true);
    setLookupResult(null);

    try {
      const functions = getFunctions();
      const createUser = httpsCallable(functions, "createUser");
      const result = await createUser({
        email: customerEmail.trim(),
        displayName: customerName.trim(),
        role: "client",
      });
      const data = result.data as any;

      if (data.success) {
        setClientUid(data.uid);
        setLookupResult({
          success: true,
          uid: data.uid,
          message: "User created successfully!",
        });
      } else {
        if (data.uid) {
          setClientUid(data.uid);
          setLookupResult({
            success: true,
            uid: data.uid,
            message: "User already exists",
          });
        } else {
          setLookupResult({
            success: false,
            message: data.message || "Failed to create user",
          });
        }
      }
    } catch (error: any) {
      console.error("Error creating user:", error);
      setLookupResult({
        success: false,
        message: error.message || "Failed to create user",
      });
    } finally {
      setCreatingUser(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setIsSubmitting(true);
    setUploadingImages(true);

    try {
      // Upload new reference images
      let uploadedUrls: string[] = [];
      if (newReferenceImages.length > 0) {
        for (const image of newReferenceImages) {
          const url = await uploadReferenceImage(image);
          uploadedUrls.push(url);
        }
      }

      // Combine existing, newly uploaded, and Google Drive links
      const allReferenceImages = [...existingReferenceImages, ...uploadedUrls, ...newReferenceImageUrls];

      // Update the guitar
      await updateGuitar(guitar.id, {
        customerName: customerName.trim() || undefined,
        customerEmail: customerEmail.trim() || undefined,
        orderNumber,
        model,
        finish,
        serial: serial || undefined,
        clientUid: clientUid.trim() || undefined,
        stageId,
        specs: Object.keys(specs).length > 0 ? specs : undefined,
        referenceImages: allReferenceImages.length > 0 ? allReferenceImages : undefined,
        coverPhotoUrl: allReferenceImages[0] || guitar.coverPhotoUrl || undefined,
      });

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Error updating guitar:", error);
      alert("Failed to update guitar. Please try again.");
    } finally {
      setIsSubmitting(false);
      setUploadingImages(false);
    }
  };

  const updateSpec = (key: keyof GuitarSpecs, value: string) => {
    setSpecs((prev) => ({
      ...prev,
      [key]: value || undefined,
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Edit Guitar</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-4">
            {/* Reference Images */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Reference Images
              </h3>
              <div className="space-y-4">
                {/* Existing Images */}
                {existingReferenceImages.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Existing Images
                    </label>
                    <div className="grid grid-cols-4 gap-3">
                      {existingReferenceImages.map((url, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={url}
                            alt={`Reference ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg border border-gray-200"
                          />
                          <button
                            type="button"
                            onClick={() => removeExistingImage(index)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add New Images */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Add More Reference Images
                  </label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md cursor-pointer transition-colors">
                      <Upload className="w-4 h-4" />
                      <span className="text-sm">Choose Images</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
                    {(newReferenceImages.length > 0 || newReferenceImageUrls.length > 0) && (
                      <span className="text-sm text-gray-600">
                        {newReferenceImages.length + newReferenceImageUrls.length} new image{(newReferenceImages.length + newReferenceImageUrls.length) !== 1 ? "s" : ""} selected
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Upload reference images, design mockups, or inspiration photos
                  </p>
                </div>

                {/* Google Drive Links */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Add Google Drive Link (Alternative to Upload)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={driveLinkInput}
                      onChange={(e) => setDriveLinkInput(e.target.value)}
                      placeholder="Paste Google Drive folder link here..."
                      className="flex-1 p-2 border rounded-md text-sm"
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddDriveLink();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddDriveLink}
                      disabled={!driveLinkInput.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      Add Link
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Paste a Google Drive folder link to avoid storing images in Firebase Storage (cost savings)
                  </p>
                </div>

                  {/* New Image Preview Grid */}
                  {(newReferenceImages.length > 0 || newReferenceImageUrls.length > 0) && (
                    <div className="grid grid-cols-4 gap-3 mt-3">
                      {/* Uploaded images */}
                      {newReferenceImages.map((file, index) => (
                        <div key={`file-${index}`} className="relative group">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`New ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg border border-gray-200"
                          />
                          <button
                            type="button"
                            onClick={() => removeNewImage(index)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      {/* Google Drive links */}
                      {newReferenceImageUrls.map((url, index) => (
                        <div key={`url-${index}`} className="relative group">
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                          >
                            <ExternalLink className="w-4 h-4 text-blue-600" />
                            <span className="text-sm text-blue-700 font-medium flex-1 truncate">
                              Google Drive Folder
                            </span>
                          </a>
                          <button
                            type="button"
                            onClick={() => removeNewImageUrl(index)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Basic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Model *
                  </label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full p-2 border rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Finish *
                  </label>
                  <input
                    type="text"
                    value={finish}
                    onChange={(e) => setFinish(e.target.value)}
                    className="w-full p-2 border rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Order Number *
                  </label>
                  <input
                    type="text"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    className="w-full p-2 border rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Serial Number
                  </label>
                  <input
                    type="text"
                    value={serial}
                    onChange={(e) => setSerial(e.target.value)}
                    className="w-full p-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Stage *
                  </label>
                  <select
                    value={stageId}
                    onChange={(e) => setStageId(e.target.value)}
                    className="w-full p-2 border rounded-md"
                    required
                    disabled={loading}
                  >
                    {loading ? (
                      <option>Loading stages...</option>
                    ) : (
                      stages.map((stage) => (
                        <option key={stage.id} value={stage.id}>
                          {stage.label}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>
            </div>

            {/* Customer Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Customer Information
              </h3>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full p-2 border rounded-md"
                    placeholder="Leave empty if no customer assigned"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Email
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => {
                        setCustomerEmail(e.target.value);
                        setLookupResult(null);
                      }}
                      className="flex-1 p-2 border rounded-md"
                      placeholder="Leave empty if no customer assigned"
                    />
                    <button
                      type="button"
                      onClick={handleLookupUser}
                      disabled={lookingUpUser || creatingUser || !customerEmail.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {lookingUpUser ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Looking up...</span>
                        </>
                      ) : (
                        <>
                          <Search className="w-4 h-4" />
                          <span>Lookup</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateUser}
                      disabled={lookingUpUser || creatingUser || !customerEmail.trim() || !customerName.trim()}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {creatingUser ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Creating...</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" />
                          <span>Create User</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client UID (Firebase Auth UID)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={clientUid}
                      onChange={(e) => setClientUid(e.target.value)}
                      placeholder="Leave empty if no customer assigned, or will be auto-filled when you click 'Lookup'"
                      className="flex-1 p-2 border rounded-md"
                      readOnly={!!lookupResult?.success}
                    />
                    {lookupResult?.success && (
                      <div className="flex items-center gap-1 text-green-600 px-2">
                        <Check className="w-5 h-5" />
                        <span className="text-sm">Found</span>
                      </div>
                    )}
                  </div>
                  {lookupResult?.success && (
                    <p className="text-xs text-green-600 mt-1">
                      ✓ {lookupResult.message || `User found: ${lookupResult.uid}`}
                    </p>
                  )}
                  {lookupResult && !lookupResult.success && (
                    <div className="mt-1">
                      <p className="text-xs text-red-600 mb-1">
                        {lookupResult.message || "User not found."}
                      </p>
                      <p className="text-xs text-gray-600">
                        Click "Create User" to create a new Firebase Auth user, or enter the UID manually.
                      </p>
                    </div>
                  )}
                  {!lookupResult && (
                    <p className="text-xs text-gray-500 mt-1">
                      Enter the customer email and click "Lookup" to find their UID, or "Create User" to create a new account.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Build Specifications */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Build Specifications (Optional)
              </h3>
              <div className="space-y-3">
                {/* Timber/Wood */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Timber & Wood
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={specs.bodyWood || ""}
                      onChange={(e) => updateSpec("bodyWood", e.target.value)}
                      className="p-2 border rounded-md text-sm"
                    >
                      <option value="">Body Wood</option>
                      {BODY_WOOD_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <select
                      value={specs.topWood || ""}
                      onChange={(e) => updateSpec("topWood", e.target.value)}
                      className="p-2 border rounded-md text-sm"
                    >
                      <option value="">Top Cap</option>
                      {TOP_WOOD_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <select
                      value={specs.neckWood || ""}
                      onChange={(e) => updateSpec("neckWood", e.target.value)}
                      className="p-2 border rounded-md text-sm"
                    >
                      <option value="">Neck Wood</option>
                      {NECK_WOOD_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <select
                      value={specs.fretboardWood || ""}
                      onChange={(e) => updateSpec("fretboardWood", e.target.value)}
                      className="p-2 border rounded-md text-sm"
                    >
                      <option value="">Fretboard Wood</option>
                      {FRETBOARD_WOOD_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Electronics */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Electronics
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={specs.pickupNeck || ""}
                      onChange={(e) => updateSpec("pickupNeck", e.target.value)}
                      className="p-2 border rounded-md text-sm"
                    >
                      <option value="">Neck Pickup</option>
                      {PICKUP_NECK_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <select
                      value={specs.pickupBridge || ""}
                      onChange={(e) => updateSpec("pickupBridge", e.target.value)}
                      className="p-2 border rounded-md text-sm"
                    >
                      <option value="">Bridge Pickup</option>
                      {PICKUP_BRIDGE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <select
                      value={specs.pickupConfiguration || ""}
                      onChange={(e) => updateSpec("pickupConfiguration", e.target.value)}
                      className="p-2 border rounded-md text-sm"
                    >
                      <option value="">Configuration</option>
                      {PICKUP_CONFIGURATION_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <select
                      value={specs.controls || ""}
                      onChange={(e) => updateSpec("controls", e.target.value)}
                      className="p-2 border rounded-md text-sm"
                    >
                      <option value="">Controls</option>
                      {CONTROLS_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <select
                      value={specs.switch || ""}
                      onChange={(e) => updateSpec("switch", e.target.value)}
                      className="p-2 border rounded-md text-sm"
                    >
                      <option value="">Switch</option>
                      {SWITCH_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Hardware */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Hardware
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={specs.bridge || ""}
                      onChange={(e) => updateSpec("bridge", e.target.value)}
                      className="p-2 border rounded-md text-sm"
                    >
                      <option value="">Bridge</option>
                      {BRIDGE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <select
                      value={specs.tuners || ""}
                      onChange={(e) => updateSpec("tuners", e.target.value)}
                      className="p-2 border rounded-md text-sm"
                    >
                      <option value="">Tuners</option>
                      {TUNER_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <select
                      value={specs.nut || ""}
                      onChange={(e) => updateSpec("nut", e.target.value)}
                      className="p-2 border rounded-md text-sm"
                    >
                      <option value="">Nut</option>
                      {NUT_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <select
                      value={specs.pickguard || ""}
                      onChange={(e) => updateSpec("pickguard", e.target.value)}
                      className="p-2 border rounded-md text-sm"
                    >
                      <option value="">Pickguard</option>
                      {PICKGUARD_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Strings & Setup */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Strings & Setup
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={specs.strings || ""}
                      onChange={(e) => updateSpec("strings", e.target.value)}
                      className="p-2 border rounded-md text-sm"
                    >
                      <option value="">Strings</option>
                      {STRING_COUNT_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <select
                      value={specs.stringGauge || ""}
                      onChange={(e) => updateSpec("stringGauge", e.target.value)}
                      className="p-2 border rounded-md text-sm"
                    >
                      <option value="">String Gauge</option>
                      {STRING_GAUGE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <select
                      value={specs.scaleLength || ""}
                      onChange={(e) => updateSpec("scaleLength", e.target.value)}
                      className="p-2 border rounded-md text-sm"
                    >
                      <option value="">Scale Length</option>
                      {SCALE_LENGTH_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <select
                      value={specs.action || ""}
                      onChange={(e) => updateSpec("action", e.target.value)}
                      className="p-2 border rounded-md text-sm"
                    >
                      <option value="">Action</option>
                      {ACTION_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Finish & Appearance */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Finish & Appearance
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Finish Color"
                      value={specs.finishColor || ""}
                      onChange={(e) =>
                        updateSpec("finishColor", e.target.value)
                      }
                      className="p-2 border rounded-md text-sm"
                    />
                    <select
                      value={specs.finishType || ""}
                      onChange={(e) => updateSpec("finishType", e.target.value)}
                      className="p-2 border rounded-md text-sm"
                    >
                      <option value="">Finish Type</option>
                      {FINISH_TYPE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <select
                      value={specs.binding || ""}
                      onChange={(e) => updateSpec("binding", e.target.value)}
                      className="p-2 border rounded-md text-sm"
                    >
                      <option value="">Binding</option>
                      {BINDING_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <select
                      value={specs.inlays || ""}
                      onChange={(e) => updateSpec("inlays", e.target.value)}
                      className="p-2 border rounded-md text-sm"
                    >
                      <option value="">Inlay Style</option>
                      {INLAY_STYLE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Neck Details */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Neck Details
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={specs.frets || ""}
                      onChange={(e) => updateSpec("frets", e.target.value)}
                      className="p-2 border rounded-md text-sm"
                    >
                      <option value="">Fret Count</option>
                      {FRET_COUNT_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <select
                      value={specs.neckProfile || ""}
                      onChange={(e) => updateSpec("neckProfile", e.target.value)}
                      className="p-2 border rounded-md text-sm"
                    >
                      <option value="">Neck Profile</option>
                      {NECK_PROFILE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <select
                      value={specs.radius || ""}
                      onChange={(e) => updateSpec("radius", e.target.value)}
                      className="p-2 border rounded-md text-sm"
                    >
                      <option value="">Radius</option>
                      {RADIUS_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Custom Notes */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Custom Notes
                  </h4>
                  <textarea
                    placeholder="Any additional specifications or notes..."
                    value={specs.customNotes || ""}
                    onChange={(e) =>
                      updateSpec("customNotes", e.target.value)
                    }
                    className="w-full p-2 border rounded-md text-sm h-24 resize-none"
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Footer */}
          <div className="flex gap-4 px-6 py-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-md hover:bg-gray-50"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

