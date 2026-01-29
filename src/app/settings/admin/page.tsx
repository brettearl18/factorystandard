"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { subscribeAppSettings, updateAppSettings } from "@/lib/firestore";
import { uploadBrandingAsset } from "@/lib/storage";
import { getFunctions, httpsCallable } from "firebase/functions";
import type { AppSettings, BrandingSettings, GeneralSettings, EmailSettings, NotificationSettings, SystemSettings } from "@/types/settings";
import {
  Palette,
  Building2,
  Mail,
  Bell,
  Settings as SettingsIcon,
  Upload,
  X,
  Image as ImageIcon,
  Save,
  Loader,
  Database,
  Download,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";

type TabType = "branding" | "general" | "email" | "notifications" | "system";

export default function AdminSettingsPage() {
  const { currentUser, userRole, loading, refreshToken } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("branding");
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;

    if (!currentUser) {
      router.push("/login");
      return;
    }

    if (userRole !== "admin" && userRole !== "staff") {
      router.push("/settings");
      return;
    }
    
    // Show warning for staff users
    if (userRole === "staff") {
      console.warn("Staff users have limited access to admin settings. Some features may be restricted.");
    }
  }, [currentUser, userRole, loading, router]);

  useEffect(() => {
    if (!currentUser || (userRole !== "admin" && userRole !== "staff")) return;

    const unsubscribe = subscribeAppSettings((loadedSettings) => {
      if (loadedSettings) {
        setSettings(loadedSettings);
      } else {
        // Initialize with defaults if no settings exist
        const defaultSettings: AppSettings = {
          branding: {
            companyName: "Factory Standards",
            primaryColor: "#F97316",
            secondaryColor: "#3B82F6",
            accentColor: "#10B981",
          },
          general: {
            timezone: "Australia/Perth",
          },
          email: {},
          notifications: {
            emailNotificationsEnabled: true,
            notifyOnNewGuitar: true,
            notifyOnStageChange: true,
            notifyOnNoteAdded: true,
            notifyOnInvoiceCreated: true,
            notifyOnPaymentReceived: true,
          },
          system: {
            maintenanceMode: false,
            allowClientRegistration: false,
            defaultClientRole: "client",
            sessionTimeout: 60,
            maxFileUploadSize: 10,
          },
          updatedAt: Date.now(),
          updatedBy: currentUser.uid,
        };
        setSettings(defaultSettings);
      }
    });

    return () => unsubscribe();
  }, [currentUser, userRole]);

  const handleSave = async (section: string, sectionData: Partial<AppSettings>) => {
    if (!currentUser || !settings) return;

    setIsSaving(true);
    setSaveMessage(null);

    try {
      await updateAppSettings(sectionData, currentUser.uid);
      setSaveMessage(`${section} settings saved successfully!`);
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error: any) {
      console.error("Error saving settings:", error);
      if (error?.code === "permission-denied" || error?.message?.includes("permission")) {
        // Try to refresh the token
        try {
          await refreshToken();
          setSaveMessage("Token refreshed. Please try saving again.");
        } catch (refreshError) {
          setSaveMessage("Permission denied. Please sign out and sign back in to refresh your permissions, then try again.");
        }
      } else {
        setSaveMessage("Failed to save settings. Please try again.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-lg">Loading settings...</div>
        </div>
      </AppLayout>
    );
  }

  if (!currentUser || (userRole !== "admin" && userRole !== "staff")) {
    return null;
  }
  
  const isAdmin = userRole === "admin";

  const tabs = [
    { id: "branding" as TabType, label: "Branding", icon: Palette },
    { id: "general" as TabType, label: "General", icon: Building2 },
    { id: "email" as TabType, label: "Email", icon: Mail },
    { id: "notifications" as TabType, label: "Notifications", icon: Bell },
    { id: "system" as TabType, label: "System", icon: SettingsIcon },
  ];

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Settings</h1>
              <p className="text-gray-600">Configure application settings and branding</p>
            </div>
            {!isAdmin && (
              <div className="px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ⚠️ Staff access - Some features may be restricted
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <div className="flex space-x-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Save Message */}
        {saveMessage && (
          <div
            className={`mb-4 p-3 rounded-lg ${
              saveMessage.includes("Failed")
                ? "bg-red-50 text-red-700"
                : "bg-green-50 text-green-700"
            }`}
          >
            {saveMessage}
          </div>
        )}

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {activeTab === "branding" && (
            <BrandingSection
              settings={settings.branding}
              onSave={(data) => handleSave("Branding", { branding: data })}
              isSaving={isSaving}
            />
          )}
          {activeTab === "general" && (
            <GeneralSection
              settings={settings.general}
              onSave={(data) => handleSave("General", { general: data })}
              isSaving={isSaving}
            />
          )}
          {activeTab === "email" && (
            <EmailSection
              settings={settings.email}
              onSave={(data) => handleSave("Email", { email: data })}
              isSaving={isSaving}
            />
          )}
          {activeTab === "notifications" && (
            <NotificationsSection
              settings={settings.notifications}
              onSave={(data) => handleSave("Notifications", { notifications: data })}
              isSaving={isSaving}
            />
          )}
          {activeTab === "system" && (
            <SystemSection
              settings={settings.system}
              onSave={(data) => handleSave("System", { system: data })}
              isSaving={isSaving}
            />
          )}
        </div>
      </div>
    </AppLayout>
  );
}

// Branding Section
function BrandingSection({
  settings,
  onSave,
  isSaving,
}: {
  settings: BrandingSettings;
  onSave: (data: BrandingSettings) => void;
  isSaving: boolean;
}) {
  const [formData, setFormData] = useState(settings);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [uploadingBackground, setUploadingBackground] = useState(false);

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    setUploadingLogo(true);
    try {
      const url = await uploadBrandingAsset("logo", file);
      setFormData({ ...formData, companyLogo: url });
    } catch (error) {
      console.error("Error uploading logo:", error);
      alert("Failed to upload logo. Please try again.");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    setUploadingFavicon(true);
    try {
      const url = await uploadBrandingAsset("favicon", file);
      setFormData({ ...formData, favicon: url });
    } catch (error) {
      console.error("Error uploading favicon:", error);
      alert("Failed to upload favicon. Please try again.");
    } finally {
      setUploadingFavicon(false);
    }
  };

  const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    setUploadingBackground(true);
    try {
      const url = await uploadBrandingAsset("background", file);
      setFormData({ ...formData, backgroundImage: url });
    } catch (error) {
      console.error("Error uploading background image:", error);
      alert("Failed to upload background image. Please try again.");
    } finally {
      setUploadingBackground(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Branding Settings</h2>
        <p className="text-sm text-gray-600 mb-6">
          Customize your application's branding, logos, and colors
        </p>
      </div>

      {/* Company Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Company Name
        </label>
        <input
          type="text"
          value={formData.companyName || ""}
          onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Factory Standards"
        />
      </div>

      {/* Logo */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Company Logo
        </label>
        {formData.companyLogo ? (
          <div className="flex items-center gap-4">
            <img
              src={formData.companyLogo}
              alt="Company logo"
              className="h-20 w-auto object-contain border border-gray-200 rounded-lg p-2"
            />
            <div className="flex gap-2">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                  disabled={uploadingLogo}
                />
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">
                  <Upload className="w-4 h-4" />
                  {uploadingLogo ? "Uploading..." : "Replace"}
                </span>
              </label>
              <button
                onClick={() => setFormData({ ...formData, companyLogo: undefined })}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
              >
                <X className="w-4 h-4" />
                Remove
              </button>
            </div>
          </div>
        ) : (
          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
              disabled={uploadingLogo}
            />
            <div className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center hover:border-blue-400 hover:bg-blue-50 transition-colors">
              <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />
              <p className="text-sm text-gray-600 font-medium">
                {uploadingLogo ? "Uploading..." : "Click to upload logo"}
              </p>
              <p className="text-xs text-gray-500 mt-1">PNG, JPG, SVG up to 5MB</p>
            </div>
          </label>
        )}
      </div>

      {/* Favicon */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Favicon
        </label>
        {formData.favicon ? (
          <div className="flex items-center gap-4">
            <img
              src={formData.favicon}
              alt="Favicon"
              className="h-16 w-16 object-contain border border-gray-200 rounded-lg p-2"
            />
            <div className="flex gap-2">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*,.ico"
                  onChange={handleFaviconUpload}
                  className="hidden"
                  disabled={uploadingFavicon}
                />
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">
                  <Upload className="w-4 h-4" />
                  {uploadingFavicon ? "Uploading..." : "Replace"}
                </span>
              </label>
              <button
                onClick={() => setFormData({ ...formData, favicon: undefined })}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
              >
                <X className="w-4 h-4" />
                Remove
              </button>
            </div>
          </div>
        ) : (
          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/*,.ico"
              onChange={handleFaviconUpload}
              className="hidden"
              disabled={uploadingFavicon}
            />
            <div className="w-full h-24 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center hover:border-blue-400 hover:bg-blue-50 transition-colors">
              <ImageIcon className="w-6 h-6 text-gray-400 mb-2" />
              <p className="text-sm text-gray-600 font-medium">
                {uploadingFavicon ? "Uploading..." : "Click to upload favicon"}
              </p>
              <p className="text-xs text-gray-500 mt-1">ICO, PNG up to 5MB</p>
            </div>
          </label>
        )}
      </div>

      {/* Colors */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Primary Color
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={formData.primaryColor || "#F97316"}
              onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
              className="w-16 h-10 border border-gray-300 rounded cursor-pointer"
            />
            <input
              type="text"
              value={formData.primaryColor || "#F97316"}
              onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              placeholder="#F97316"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Secondary Color
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={formData.secondaryColor || "#3B82F6"}
              onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
              className="w-16 h-10 border border-gray-300 rounded cursor-pointer"
            />
            <input
              type="text"
              value={formData.secondaryColor || "#3B82F6"}
              onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              placeholder="#3B82F6"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Accent Color
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={formData.accentColor || "#10B981"}
              onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
              className="w-16 h-10 border border-gray-300 rounded cursor-pointer"
            />
            <input
              type="text"
              value={formData.accentColor || "#10B981"}
              onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              placeholder="#10B981"
            />
          </div>
        </div>
      </div>

      {/* Background Image */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Background Image (30% opacity)
        </label>
        <p className="text-xs text-gray-500 mb-2">
          Upload a background image that will be displayed at 30% opacity on the dashboard for design purposes.
        </p>
        {formData.backgroundImage ? (
          <div className="space-y-3">
            <div className="relative w-full h-48 border border-gray-200 rounded-lg overflow-hidden">
              <img
                src={formData.backgroundImage}
                alt="Background preview"
                className="w-full h-full object-cover"
                style={{ opacity: 0.3 }}
              />
              <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
                <p className="text-sm text-gray-600 font-medium">30% Opacity Preview</p>
              </div>
            </div>
            <div className="flex gap-2">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleBackgroundUpload}
                  className="hidden"
                  disabled={uploadingBackground}
                />
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">
                  <Upload className="w-4 h-4" />
                  {uploadingBackground ? "Uploading..." : "Replace"}
                </span>
              </label>
              <button
                onClick={() => setFormData({ ...formData, backgroundImage: undefined })}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
              >
                <X className="w-4 h-4" />
                Remove
              </button>
            </div>
          </div>
        ) : (
          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/*"
              onChange={handleBackgroundUpload}
              className="hidden"
              disabled={uploadingBackground}
            />
            <div className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center hover:border-blue-400 hover:bg-blue-50 transition-colors">
              <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />
              <p className="text-sm text-gray-600 font-medium">
                {uploadingBackground ? "Uploading..." : "Click to upload background image"}
              </p>
              <p className="text-xs text-gray-500 mt-1">PNG, JPG, SVG up to 10MB</p>
            </div>
          </label>
        )}
      </div>

      {/* Footer Text */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Footer Text (Optional)
        </label>
        <input
          type="text"
          value={formData.footerText || ""}
          onChange={(e) => setFormData({ ...formData, footerText: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="© 2025 Factory Standards. All rights reserved."
        />
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t border-gray-200">
        <button
          onClick={() => onSave(formData)}
          disabled={isSaving || uploadingLogo || uploadingFavicon || uploadingBackground}
          className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Branding
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// General Section
function GeneralSection({
  settings,
  onSave,
  isSaving,
}: {
  settings: GeneralSettings;
  onSave: (data: GeneralSettings) => void;
  isSaving: boolean;
}) {
  const [formData, setFormData] = useState(settings);

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">General Settings</h2>
        <p className="text-sm text-gray-600 mb-6">
          Configure company information and contact details
        </p>
      </div>

      {/* Contact Email */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Contact Email
        </label>
        <input
          type="email"
          value={formData.contactEmail || ""}
          onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="contact@factorystandards.com"
        />
      </div>

      {/* Contact Phone */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Contact Phone
        </label>
        <input
          type="tel"
          value={formData.contactPhone || ""}
          onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="+61 8 1234 5678"
        />
      </div>

      {/* Website URL */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Website URL
        </label>
        <input
          type="url"
          value={formData.websiteUrl || ""}
          onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="https://factorystandards.com"
        />
      </div>

      {/* Address */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Company Address
        </label>
        <div className="space-y-2">
          <input
            type="text"
            value={formData.companyAddress?.line1 || ""}
            onChange={(e) =>
              setFormData({
                ...formData,
                companyAddress: { ...formData.companyAddress, line1: e.target.value },
              })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Street Address"
          />
          <input
            type="text"
            value={formData.companyAddress?.line2 || ""}
            onChange={(e) =>
              setFormData({
                ...formData,
                companyAddress: { ...formData.companyAddress, line2: e.target.value },
              })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Suite, Unit, etc. (Optional)"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={formData.companyAddress?.city || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  companyAddress: { ...formData.companyAddress, city: e.target.value },
                })
              }
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="City"
            />
            <input
              type="text"
              value={formData.companyAddress?.state || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  companyAddress: { ...formData.companyAddress, state: e.target.value },
                })
              }
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="State"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={formData.companyAddress?.postalCode || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  companyAddress: { ...formData.companyAddress, postalCode: e.target.value },
                })
              }
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Postal Code"
            />
            <input
              type="text"
              value={formData.companyAddress?.country || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  companyAddress: { ...formData.companyAddress, country: e.target.value },
                })
              }
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Country"
            />
          </div>
        </div>
      </div>

      {/* Timezone */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Timezone
        </label>
        <select
          value={formData.timezone || "Australia/Perth"}
          onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="Australia/Perth">Australia/Perth (AWST)</option>
          <option value="Australia/Sydney">Australia/Sydney (AEST)</option>
          <option value="Australia/Melbourne">Australia/Melbourne (AEST)</option>
          <option value="Australia/Brisbane">Australia/Brisbane (AEST)</option>
          <option value="Australia/Adelaide">Australia/Adelaide (ACST)</option>
          <option value="Australia/Darwin">Australia/Darwin (ACST)</option>
          <option value="UTC">UTC</option>
        </select>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t border-gray-200">
        <button
          onClick={() => onSave(formData)}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save General Settings
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// Email Section
function EmailSection({
  settings,
  onSave,
  isSaving,
}: {
  settings: EmailSettings;
  onSave: (data: EmailSettings) => void;
  isSaving: boolean;
}) {
  const [formData, setFormData] = useState(settings);

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Email Settings</h2>
        <p className="text-sm text-gray-600 mb-6">
          Configure email sending settings and SMTP configuration
        </p>
      </div>

      {/* From Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          From Name
        </label>
        <input
          type="text"
          value={formData.fromName || ""}
          onChange={(e) => setFormData({ ...formData, fromName: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Factory Standards"
        />
      </div>

      {/* From Email */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          From Email
        </label>
        <input
          type="email"
          value={formData.fromEmail || ""}
          onChange={(e) => setFormData({ ...formData, fromEmail: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="noreply@factorystandards.com"
        />
      </div>

      {/* Reply To */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Reply-To Email
        </label>
        <input
          type="email"
          value={formData.replyToEmail || ""}
          onChange={(e) => setFormData({ ...formData, replyToEmail: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="support@factorystandards.com"
        />
      </div>

      {/* SMTP Settings */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">SMTP Configuration</h3>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.smtpEnabled || false}
              onChange={(e) => setFormData({ ...formData, smtpEnabled: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label className="text-sm font-medium text-gray-700">
              Enable Custom SMTP (Use custom SMTP server instead of Firebase)
            </label>
          </div>

          {formData.smtpEnabled && (
            <div className="space-y-4 pl-6 border-l-2 border-gray-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SMTP Host
                </label>
                <input
                  type="text"
                  value={formData.smtpHost || ""}
                  onChange={(e) => setFormData({ ...formData, smtpHost: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="smtp.gmail.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SMTP Port
                </label>
                <input
                  type="number"
                  value={formData.smtpPort || 587}
                  onChange={(e) => setFormData({ ...formData, smtpPort: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="587"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SMTP Username
                </label>
                <input
                  type="text"
                  value={formData.smtpUser || ""}
                  onChange={(e) => setFormData({ ...formData, smtpUser: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="your-email@gmail.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SMTP Password
                </label>
                <input
                  type="password"
                  value={formData.smtpPassword || ""}
                  onChange={(e) => setFormData({ ...formData, smtpPassword: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Note: For Gmail, use an App Password instead of your regular password
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Send test emails (Mailgun) */}
      <div className="border-t border-gray-200 pt-6">
        <SendTestEmailsBlock />
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t border-gray-200">
        <button
          onClick={() => onSave(formData)}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Email Settings
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// Send test emails (Mailgun) – admin only
function SendTestEmailsBlock() {
  const [to, setTo] = useState("brett.earl@gmail.com");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSend = async () => {
    if (!to.trim()) return;
    setSending(true);
    setMessage(null);
    try {
      const functions = getFunctions();
      const sendTestEmails = httpsCallable<{ to: string }, { success: boolean; sent: number; to: string }>(functions, "sendTestEmails");
      const result = await sendTestEmails({ to: to.trim() });
      const data = result.data;
      if (data?.success) {
        setMessage({ type: "success", text: `Sent ${data.sent} test emails to ${data.to}.` });
      } else {
        setMessage({ type: "error", text: "Send failed or Mailgun not configured." });
      }
    } catch (err: unknown) {
      const text = err instanceof Error ? err.message : "Failed to send test emails.";
      setMessage({ type: "error", text });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Send test emails (Mailgun)</h3>
      <p className="text-sm text-gray-600">
        Sends sample &quot;stage change&quot; and &quot;run update&quot; emails to the address below. Requires Mailgun to be configured.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
          <input
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="brett.earl@gmail.com"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={handleSend}
          disabled={sending}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {sending ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              Sending...
            </>
          ) : (
            "Send test emails"
          )}
        </button>
      </div>
      {message && (
        <p className={`text-sm ${message.type === "success" ? "text-green-600" : "text-red-600"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}

// Notifications Section
function NotificationsSection({
  settings,
  onSave,
  isSaving,
}: {
  settings: NotificationSettings;
  onSave: (data: NotificationSettings) => void;
  isSaving: boolean;
}) {
  const [formData, setFormData] = useState(settings);

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Notification Settings</h2>
        <p className="text-sm text-gray-600 mb-6">
          Configure which notifications are sent via email
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div>
            <label className="text-sm font-medium text-gray-900">
              Enable Email Notifications
            </label>
            <p className="text-xs text-gray-500 mt-1">
              Master switch for all email notifications
            </p>
          </div>
          <input
            type="checkbox"
            checked={formData.emailNotificationsEnabled}
            onChange={(e) =>
              setFormData({ ...formData, emailNotificationsEnabled: e.target.checked })
            }
            className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
        </div>

        {formData.emailNotificationsEnabled && (
          <div className="space-y-3 pl-4 border-l-2 border-gray-200">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <label className="text-sm font-medium text-gray-700">
                Notify on New Guitar Created
              </label>
              <input
                type="checkbox"
                checked={formData.notifyOnNewGuitar}
                onChange={(e) =>
                  setFormData({ ...formData, notifyOnNewGuitar: e.target.checked })
                }
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <label className="text-sm font-medium text-gray-700">
                Notify on Stage Change
              </label>
              <input
                type="checkbox"
                checked={formData.notifyOnStageChange}
                onChange={(e) =>
                  setFormData({ ...formData, notifyOnStageChange: e.target.checked })
                }
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <label className="text-sm font-medium text-gray-700">
                Notify on Note Added
              </label>
              <input
                type="checkbox"
                checked={formData.notifyOnNoteAdded}
                onChange={(e) =>
                  setFormData({ ...formData, notifyOnNoteAdded: e.target.checked })
                }
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <label className="text-sm font-medium text-gray-700">
                Notify on Invoice Created
              </label>
              <input
                type="checkbox"
                checked={formData.notifyOnInvoiceCreated}
                onChange={(e) =>
                  setFormData({ ...formData, notifyOnInvoiceCreated: e.target.checked })
                }
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <label className="text-sm font-medium text-gray-700">
                Notify on Payment Received
              </label>
              <input
                type="checkbox"
                checked={formData.notifyOnPaymentReceived}
                onChange={(e) =>
                  setFormData({ ...formData, notifyOnPaymentReceived: e.target.checked })
                }
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t border-gray-200">
        <button
          onClick={() => onSave(formData)}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Notification Settings
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// System Section
function SystemSection({
  settings,
  onSave,
  isSaving,
}: {
  settings: SystemSettings;
  onSave: (data: SystemSettings) => void;
  isSaving: boolean;
}) {
  const { currentUser } = useAuth();
  const [formData, setFormData] = useState(settings);
  const [backups, setBackups] = useState<Array<{ name: string; path: string; created?: string }>>([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const [selectedBackup, setSelectedBackup] = useState<string>("");

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  useEffect(() => {
    if (currentUser) {
      loadBackups();
    }
  }, [currentUser]);

  const loadBackups = async () => {
    if (!currentUser) return;
    
    setLoadingBackups(true);
    setBackupMessage(null);
    try {
      const functions = getFunctions();
      const listBackups = httpsCallable(functions, "listBackups");
      const result = await listBackups();
      const data = result.data as any;

      if (data.success) {
        setBackups(data.backups || []);
      } else {
        throw new Error(data.error || "Failed to load backups");
      }
    } catch (error: any) {
      console.error("Error loading backups:", error);
      const errorMessage = error.message || error.code || "Failed to load backups. Please check your connection and try again.";
      setBackupMessage(`❌ ${errorMessage}`);
    } finally {
      setLoadingBackups(false);
    }
  };

  const handleBackup = async () => {
    if (!currentUser) return;
    
    const confirmed = window.confirm(
      "Are you sure you want to create a backup? This will export all Firestore data to Cloud Storage."
    );
    
    if (!confirmed) return;

    setBackingUp(true);
    setBackupMessage(null);
    
    try {
      const functions = getFunctions();
      const backupFirestore = httpsCallable(functions, "backupFirestore");
      const result = await backupFirestore();
      const data = result.data as any;
      
      if (data.success) {
        setBackupMessage(`✅ Backup initiated successfully! Output: ${data.outputUri}`);
        // Reload backups after a short delay
        setTimeout(() => {
          loadBackups();
        }, 2000);
      } else {
        throw new Error(data.error || "Backup failed");
      }
    } catch (error: any) {
      console.error("Error creating backup:", error);
      const errorMessage = error.message || error.code || "Failed to create backup. Please check your connection and try again.";
      setBackupMessage(`❌ ${errorMessage}`);
    } finally {
      setBackingUp(false);
    }
  };

  const handleRestore = async () => {
    if (!selectedBackup) {
      alert("Please select a backup to restore from");
      return;
    }

    const confirmed = window.confirm(
      `⚠️ WARNING: This will OVERWRITE your current database with data from:\n\n${selectedBackup}\n\nThis action cannot be undone. Are you absolutely sure?`
    );
    
    if (!confirmed) return;

    const doubleConfirm = window.confirm(
      "This is your last chance. Type 'RESTORE' in the next prompt to confirm."
    );
    
    if (!doubleConfirm) return;

    setRestoring(true);
    setBackupMessage(null);
    
    try {
      const functions = getFunctions();
      const restoreFirestore = httpsCallable(functions, "restoreFirestore");
      const result = await restoreFirestore({ inputUriPrefix: selectedBackup });
      const data = result.data as any;
      
      if (data.success) {
        setBackupMessage(`✅ Restore initiated successfully! Operation: ${data.operationName}\n\n⚠️ The restore is in progress. This may take several minutes.`);
      } else {
        throw new Error(data.error || "Restore failed");
      }
    } catch (error: any) {
      console.error("Error restoring backup:", error);
      const errorMessage = error.message || error.code || "Failed to restore backup. Please check your connection and try again.";
      setBackupMessage(`❌ ${errorMessage}`);
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">System Settings</h2>
        <p className="text-sm text-gray-600 mb-6">
          Configure system-wide settings and security options
        </p>
      </div>

      {/* Maintenance Mode */}
      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
        <div>
          <label className="text-sm font-medium text-gray-900">Maintenance Mode</label>
          <p className="text-xs text-gray-500 mt-1">
            When enabled, only admins can access the application
          </p>
        </div>
        <input
          type="checkbox"
          checked={formData.maintenanceMode}
          onChange={(e) => setFormData({ ...formData, maintenanceMode: e.target.checked })}
          className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
      </div>

      {/* Allow Client Registration */}
      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
        <div>
          <label className="text-sm font-medium text-gray-900">Allow Client Registration</label>
          <p className="text-xs text-gray-500 mt-1">
            Allow new clients to register themselves (not recommended)
          </p>
        </div>
        <input
          type="checkbox"
          checked={formData.allowClientRegistration}
          onChange={(e) =>
            setFormData({ ...formData, allowClientRegistration: e.target.checked })
          }
          className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
      </div>

      {/* Default Client Role */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Default Client Role
        </label>
        <select
          value={formData.defaultClientRole}
          onChange={(e) =>
            setFormData({
              ...formData,
              defaultClientRole: e.target.value as "client" | "staff" | "admin",
            })
          }
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="client">Client</option>
          <option value="staff">Staff</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      {/* Session Timeout */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Session Timeout (minutes)
        </label>
        <input
          type="number"
          value={formData.sessionTimeout}
          onChange={(e) =>
            setFormData({ ...formData, sessionTimeout: parseInt(e.target.value) || 60 })
          }
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          min="5"
          max="1440"
        />
        <p className="text-xs text-gray-500 mt-1">
          How long before users are automatically logged out (5-1440 minutes)
        </p>
      </div>

      {/* Max File Upload Size */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Max File Upload Size (MB)
        </label>
        <input
          type="number"
          value={formData.maxFileUploadSize}
          onChange={(e) =>
            setFormData({ ...formData, maxFileUploadSize: parseInt(e.target.value) || 10 })
          }
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          min="1"
          max="100"
        />
        <p className="text-xs text-gray-500 mt-1">
          Maximum file size for uploads (1-100 MB)
        </p>
      </div>

      {/* Backup & Restore Section */}
      <div className="border-t border-gray-200 pt-6 mt-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <Database className="w-5 h-5" />
            Database Backup & Restore
          </h3>
          <p className="text-sm text-gray-600">
            Create manual backups or restore from a previous backup. Automated weekly backups run every Sunday at 2 AM.
          </p>
        </div>

        {/* Backup Message */}
        {backupMessage && (
          <div
            className={`mb-4 p-3 rounded-lg text-sm ${
              backupMessage.includes("❌") || backupMessage.includes("Failed")
                ? "bg-red-50 text-red-700 border border-red-200"
                : "bg-green-50 text-green-700 border border-green-200"
            }`}
          >
            <pre className="whitespace-pre-wrap font-sans">{backupMessage}</pre>
          </div>
        )}

        {/* Backup Button */}
        <div className="mb-4">
          <button
            onClick={handleBackup}
            disabled={backingUp || restoring}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {backingUp ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Creating Backup...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Create Backup Now
              </>
            )}
          </button>
          <p className="text-xs text-gray-500 mt-1">
            Creates a new backup of all Firestore data
          </p>
        </div>

        {/* Restore Section */}
        <div className="border border-gray-200 rounded-lg p-4 bg-yellow-50">
          <div className="flex items-start gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-yellow-900">Restore from Backup</h4>
              <p className="text-xs text-yellow-700 mt-1">
                ⚠️ This will overwrite your current database. Use with extreme caution!
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Backup to Restore
              </label>
              {loadingBackups ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader className="w-4 h-4 animate-spin" />
                  Loading backups...
                </div>
              ) : backups.length === 0 ? (
                <p className="text-sm text-gray-500">No backups found. Create a backup first.</p>
              ) : (
                <select
                  value={selectedBackup}
                  onChange={(e) => setSelectedBackup(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  disabled={restoring}
                >
                  <option value="">-- Select a backup --</option>
                  {backups.map((backup) => (
                    <option key={backup.path} value={backup.path}>
                      {backup.name} {backup.created ? `(${backup.created})` : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <button
              onClick={handleRestore}
              disabled={!selectedBackup || restoring || loadingBackups}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {restoring ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Restoring...
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4" />
                  Restore from Selected Backup
                </>
              )}
            </button>

            <button
              onClick={loadBackups}
              disabled={loadingBackups}
              className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
            >
              {loadingBackups ? "Refreshing..." : "Refresh Backup List"}
            </button>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t border-gray-200">
        <button
          onClick={() => onSave(formData)}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save System Settings
            </>
          )}
        </button>
      </div>
    </div>
  );
}

