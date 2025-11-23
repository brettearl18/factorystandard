"use client";

import { useState, useEffect } from "react";
import { X, Plus, Upload, Image as ImageIcon, Search, Check, UserPlus, ExternalLink, Eye, EyeOff, Copy } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { createGuitar, getRun, subscribeRunStages } from "@/lib/firestore";
import { uploadReferenceImage } from "@/lib/storage";
import { getFunctions, httpsCallable } from "firebase/functions";
import { auth } from "@/lib/firebase";
import type { GuitarBuild, GuitarSpecs, RunStage } from "@/types/guitars";
import { BODY_WOOD_OPTIONS, TOP_WOOD_OPTIONS, NECK_WOOD_OPTIONS, FRETBOARD_WOOD_OPTIONS, ORMSBY_PICKUP_MODELS, PICKUP_NECK_OPTIONS, PICKUP_BRIDGE_OPTIONS, PICKUP_CONFIGURATION_OPTIONS, CONTROLS_OPTIONS, SWITCH_OPTIONS, BRIDGE_OPTIONS, TUNER_OPTIONS, NUT_OPTIONS, PICKGUARD_OPTIONS, STRING_COUNT_OPTIONS, STRING_GAUGE_OPTIONS, SCALE_LENGTH_OPTIONS, ACTION_OPTIONS, FINISH_TYPE_OPTIONS, BINDING_OPTIONS, INLAY_STYLE_OPTIONS, FRET_COUNT_OPTIONS, NECK_PROFILE_OPTIONS, RADIUS_OPTIONS } from "@/constants/guitarSpecs";

interface AddGuitarModalProps {
  runId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AddGuitarModal({
  runId,
  isOpen,
  onClose,
  onSuccess,
}: AddGuitarModalProps) {
  const { currentUser } = useAuth();
  const [stages, setStages] = useState<RunStage[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form fields
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPassword, setCustomerPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [model, setModel] = useState("");
  const [finish, setFinish] = useState("");
  const [serial, setSerial] = useState("");
  const [clientUid, setClientUid] = useState("");
  const [stageId, setStageId] = useState("");
  const [noCustomer, setNoCustomer] = useState(false);

  // Specs fields
  const [specs, setSpecs] = useState<Partial<GuitarSpecs>>({});

  // Reference images
  const [referenceImages, setReferenceImages] = useState<File[]>([]);
  const [referenceImageUrls, setReferenceImageUrls] = useState<string[]>([]); // For Google Drive links
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
  
  // Success modal for new client creation
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdClientInfo, setCreatedClientInfo] = useState<{
    email: string;
    password: string;
    name: string;
  } | null>(null);
  const [emailCopied, setEmailCopied] = useState(false);

  const getSiteUrl = () => {
    if (typeof window !== "undefined") {
      return window.location.origin;
    }
    return "https://factorystandards.com"; // Fallback
  };

  const generateEmailTemplate = () => {
    if (!createdClientInfo) return "";
    
    const siteUrl = getSiteUrl();
    const loginUrl = `${siteUrl}/login`;
    
    return `Subject: Your Factory Standards Account

Hi ${createdClientInfo.name},

Your account has been created for Factory Standards. You can now log in to track your guitar build progress.

Login Details:
Email: ${createdClientInfo.email}
Password: ${createdClientInfo.password}

Login Link: ${loginUrl}

Please change your password after your first login for security.

If you have any questions, please don't hesitate to reach out.

Best regards,
Factory Standards Team`;
  };

  const handleCopyEmail = async () => {
    const emailText = generateEmailTemplate();
    try {
      await navigator.clipboard.writeText(emailText);
      setEmailCopied(true);
      setTimeout(() => setEmailCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
      // Fallback: select text
      const textarea = document.createElement("textarea");
      textarea.value = emailText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setEmailCopied(true);
      setTimeout(() => setEmailCopied(false), 2000);
    }
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    setCreatedClientInfo(null);
    setEmailCopied(false);
    onSuccess?.();
    onClose();
  };

  // Load stages when modal opens
  useEffect(() => {
    if (isOpen && runId) {
      setLoading(true);
      const unsubscribe = subscribeRunStages(runId, (loadedStages) => {
        setStages(loadedStages);
        if (loadedStages.length > 0 && !stageId) {
          setStageId(loadedStages[0].id);
        }
        setLoading(false);
      });
      return () => unsubscribe();
    }
  }, [isOpen, runId, stageId]);

  if (!isOpen) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setReferenceImages(Array.from(e.target.files));
    }
  };

  const removeImage = (index: number) => {
    setReferenceImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeImageUrl = (index: number) => {
    setReferenceImageUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddDriveLink = () => {
    if (!driveLinkInput.trim()) return;
    
    // Store the link as-is (no conversion needed for folder links)
    setReferenceImageUrls((prev) => [...prev, driveLinkInput.trim()]);
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

  const generatePassword = () => {
    // Generate a random 12-character password
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCustomerPassword(password);
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

    if (!customerPassword.trim() || customerPassword.length < 6) {
      alert("Please enter a password (minimum 6 characters) or generate one");
      return;
    }

    setCreatingUser(true);
    setLookupResult(null);

    try {
      const functions = getFunctions();
      const createUser = httpsCallable(functions, "createUser");
      const result = await createUser({
        email: customerEmail.trim(),
        displayName: customerName.trim(),
        password: customerPassword.trim(),
        role: "client", // Default new users to client role
      });
      const data = result.data as any;

      if (data.success) {
        setClientUid(data.uid);
        setLookupResult({
          success: true,
          uid: data.uid,
          message: "User created successfully!",
        });
        // Store client info for success modal (will show after guitar is created)
        setCreatedClientInfo({
          email: customerEmail.trim(),
          password: customerPassword,
          name: customerName.trim(),
        });
        // Clear password from form (but keep in createdClientInfo)
        setCustomerPassword("");
      } else {
        // User might already exist
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
      // Upload reference images first, then combine with Google Drive links
      let uploadedUrls: string[] = [];
      if (referenceImages.length > 0) {
        for (const image of referenceImages) {
          const url = await uploadReferenceImage(image);
          uploadedUrls.push(url);
        }
      }
      // Combine uploaded URLs with Google Drive links
      const allReferenceImageUrls = [...uploadedUrls, ...referenceImageUrls];

      // Create the guitar
      const guitarId = await createGuitar({
        runId,
        stageId: stageId || stages[0]?.id || "",
        // Only include customer fields if not "no customer" mode
        clientUid: noCustomer ? undefined : (clientUid || undefined),
        customerName: noCustomer ? undefined : (customerName || undefined),
        customerEmail: noCustomer ? undefined : (customerEmail || undefined),
        orderNumber,
        model,
        finish,
        serial: serial || undefined,
        specs: Object.keys(specs).length > 0 ? specs : undefined,
        referenceImages: allReferenceImageUrls.length > 0 ? allReferenceImageUrls : undefined,
        coverPhotoUrl: allReferenceImageUrls[0] || undefined,
        photoCount: allReferenceImageUrls.length,
      });

      // Reset form
      setCustomerName("");
      setCustomerEmail("");
      setCustomerPassword("");
      setOrderNumber("");
      setModel("");
      setFinish("");
      setSerial("");
      setClientUid("");
      setNoCustomer(false);
      setLookupResult(null);
      setSpecs({});
      setReferenceImages([]);
      setReferenceImageUrls([]);
      setDriveLinkInput("");

      // If we created a new client, show success modal with password
      // Otherwise, just close and call success
      if (createdClientInfo) {
        setShowSuccessModal(true);
      } else {
        onSuccess?.();
        onClose();
      }
    } catch (error) {
      console.error("Error creating guitar:", error);
      alert("Failed to create guitar. Please try again.");
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
          <h2 className="text-2xl font-bold text-gray-900">Add New Guitar</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-4">
            {/* Reference Images */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Reference Images
              </h3>
              <div className="space-y-4">
                {/* Upload Images */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Reference Images
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
                    {referenceImages.length > 0 && (
                      <span className="text-sm text-gray-600">
                        {referenceImages.length} image{referenceImages.length !== 1 ? "s" : ""} selected
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Upload reference images, design mockups, or inspiration photos for this build
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

                {/* Image Preview Grid */}
                {(referenceImages.length > 0 || referenceImageUrls.length > 0) && (
                  <div className="grid grid-cols-4 gap-3">
                    {/* Uploaded images */}
                    {referenceImages.map((file, index) => (
                      <div key={`file-${index}`} className="relative group">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Reference ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg border border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 rounded-b-lg truncate">
                          {file.name}
                        </div>
                      </div>
                    ))}
                    {/* Google Drive links */}
                    {referenceImageUrls.map((url, index) => (
                      <div key={`url-${index}`} className="relative">
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
                          onClick={() => removeImageUrl(index)}
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
                    Initial Stage *
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
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Customer Information
                </h3>
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={noCustomer}
                    onChange={(e) => {
                      setNoCustomer(e.target.checked);
                      if (e.target.checked) {
                        // Clear customer fields when checked
                        setCustomerName("");
                        setCustomerEmail("");
                        setClientUid("");
                        setLookupResult(null);
                      }
                    }}
                    className="rounded"
                  />
                  <span>No customer assigned yet</span>
                </label>
              </div>
              {!noCustomer && (
                <p className="text-xs text-gray-500 mb-3">
                  Enter customer details and click "Create User" to create a new client account, or use "Lookup" to find an existing user.
                </p>
              )}
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Name {!noCustomer && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full p-2 border rounded-md"
                    required={!noCustomer}
                    disabled={noCustomer}
                    placeholder={noCustomer ? "Will be assigned later" : "John Doe"}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Email {!noCustomer && <span className="text-red-500">*</span>}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => {
                        setCustomerEmail(e.target.value);
                        setLookupResult(null); // Clear lookup result when email changes
                      }}
                      className="flex-1 p-2 border rounded-md disabled:bg-gray-100 disabled:cursor-not-allowed"
                      required={!noCustomer}
                      disabled={noCustomer}
                      placeholder={noCustomer ? "Will be assigned later" : "client@example.com"}
                    />
                    <button
                      type="button"
                      onClick={handleLookupUser}
                      disabled={noCustomer || lookingUpUser || creatingUser || !customerEmail.trim()}
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
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password {!noCustomer && !lookupResult?.success && <span className="text-red-500">*</span>}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={customerPassword}
                      onChange={(e) => setCustomerPassword(e.target.value)}
                      className="w-full p-2 border rounded-md pr-20 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      required={!noCustomer && !lookupResult?.success}
                      disabled={noCustomer || !!lookupResult?.success}
                      placeholder={noCustomer ? "Will be assigned later" : lookupResult?.success ? "User found - password not needed" : "Enter password (min 6 characters)"}
                      minLength={6}
                    />
                    {!noCustomer && !lookupResult?.success && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="p-1 text-gray-500 hover:text-gray-700"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={generatePassword}
                          className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                        >
                          Generate
                        </button>
                      </div>
                    )}
                  </div>
                  {!noCustomer && !lookupResult?.success && (
                    <p className="text-xs text-gray-500 mt-1">
                      Share this password with the client. They can change it after logging in.
                    </p>
                  )}
                </div>
                <div>
                  <button
                    type="button"
                    onClick={handleCreateUser}
                    disabled={noCustomer || lookingUpUser || creatingUser || !customerEmail.trim() || !customerName.trim() || !customerPassword.trim() || customerPassword.length < 6}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {creatingUser ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Creating User...</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>Create User</span>
                      </>
                    )}
                  </button>
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
                      placeholder={noCustomer ? "Will be assigned later" : "Will be auto-filled when you click 'Lookup'"}
                      className="flex-1 p-2 border rounded-md disabled:bg-gray-100 disabled:cursor-not-allowed"
                      readOnly={!!lookupResult?.success || noCustomer}
                      disabled={noCustomer}
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
                        Click "Create User" to create a new Firebase Auth user, or enter the UID manually. Leave empty to use your UID.
                      </p>
                    </div>
                  )}
                  {!lookupResult && !noCustomer && (
                    <p className="text-xs text-gray-500 mt-1">
                      Enter the customer email and click "Lookup" to find their UID, or "Create User" to create a new account. Leave empty to use your UID.
                    </p>
                  )}
                  {noCustomer && (
                    <p className="text-xs text-blue-600 mt-1 font-medium">
                      ✓ Guitar will be created without a customer. You can assign a customer later using the Edit Guitar feature or Settings page.
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
          <div className="flex gap-4 mt-6 pt-6 border-t border-gray-200">
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
              {isSubmitting ? "Creating..." : "Create Guitar"}
            </button>
          </div>
        </form>
      </div>

      {/* Success Modal for New Client Creation */}
      {showSuccessModal && createdClientInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Client Created Successfully</h2>
              <button
                onClick={handleCloseSuccessModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800 font-medium">
                    ✓ Client account and guitar created successfully!
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Email Template (Copy & Paste)
                    </label>
                    <button
                      onClick={handleCopyEmail}
                      className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      {emailCopied ? (
                        <>
                          <Check className="w-4 h-4" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy Email
                        </>
                      )}
                    </button>
                  </div>
                  <textarea
                    readOnly
                    value={generateEmailTemplate()}
                    className="w-full h-64 px-4 py-3 border border-gray-300 rounded-lg font-mono text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Click the text above to select all, or use the "Copy Email" button.
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Next Steps:</strong>
                  </p>
                  <ol className="text-sm text-blue-700 mt-2 list-decimal list-inside space-y-1">
                    <li>Copy the email template above</li>
                    <li>Paste it into your email client</li>
                    <li>Send it to {createdClientInfo.email}</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button
                onClick={handleCloseSuccessModal}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

