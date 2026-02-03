"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useRuns } from "@/hooks/useRuns";
import { updateClientProfile } from "@/lib/firestore";
import { 
  UserPlus, 
  Mail, 
  Lock, 
  User, 
  Guitar, 
  Eye, 
  EyeOff, 
  Copy, 
  Check,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Loader2,
  X,
} from "lucide-react";
import type { Run } from "@/types/guitars";

export default function CreateClientPage() {
  const { currentUser, userRole, loading: authLoading } = useAuth();
  const router = useRouter();
  
  // Form state
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Email template
  const [showEmailTemplate, setShowEmailTemplate] = useState(false);
  const [createdClientInfo, setCreatedClientInfo] = useState<{ 
    email: string; 
    password: string; 
    name: string;
    guitarsCreated: number;
  } | null>(null);
  const [emailCopied, setEmailCopied] = useState(false);
  
  // Run assignment
  const runs = useRuns();
  const activeRuns = runs.filter(r => !r.archived && r.isActive);
  const [assignedRunIds, setAssignedRunIds] = useState<string[]>([]);
  
  // Redirect if not staff/admin
  useEffect(() => {
    if (!authLoading) {
      if (!currentUser) {
        router.push("/login");
        return;
      }
      if (userRole !== "staff" && userRole !== "admin") {
        router.push("/");
        return;
      }
    }
  }, [currentUser, userRole, authLoading, router]);

  const generatePassword = () => {
    const length = 12;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    setPassword(password);
  };

  const getSiteUrl = () => {
    if (typeof window !== "undefined") {
      return window.location.origin;
    }
    return "https://factorystandards.com";
  };

  const generateEmailTemplate = () => {
    if (!createdClientInfo) return "";
    
    const siteUrl = getSiteUrl();
    const loginUrl = `${siteUrl}/login`;
    
    return `Subject: Your Factory Standards Account

Hi ${createdClientInfo.name},

Your account has been created for Factory Standards. You can now log in to submit your guitar specifications and track your build progress.

Login Details:
Email: ${createdClientInfo.email}
Password: ${createdClientInfo.password}

Login Link: ${loginUrl}

Next Steps:
1. Log in using the credentials above
2. You'll be directed to the onboarding page where you can fill out your guitar specifications
3. Submit your specs to begin your guitar build journey

Please change your password after your first login for security.

If you have any questions, please don't hesitate to reach out.

Best regards,
Factory Standards Team`;
  };

  const copyEmailTemplate = () => {
    const template = generateEmailTemplate();
    navigator.clipboard.writeText(template);
    setEmailCopied(true);
    setTimeout(() => setEmailCopied(false), 2000);
  };

  const handleCloseEmailTemplate = () => {
    setShowEmailTemplate(false);
    setCreatedClientInfo(null);
    // Reset form
    setEmail("");
    setName("");
    setPassword("");
    setError(null);
    setSuccess(false);
    // Redirect back to clients page
    router.push("/clients");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validation
    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    if (!password.trim() || password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsSubmitting(true);

    try {
      // Step 1: Create the user account
      const functions = getFunctions();
      const createUser = httpsCallable(functions, "createUser");
      const userResult = await createUser({
        email: email.trim(),
        displayName: name.trim(),
        password: password.trim(),
        role: "client",
      });

      const userData = userResult.data as any;
      if (!userData.success) {
        throw new Error(userData.message || "Failed to create user");
      }

      const clientUid = userData.uid;

      // Step 2: Update client profile with displayName and assigned runs (if any)
      await updateClientProfile(clientUid, {
        displayName: name.trim(),
        ...(assignedRunIds.length > 0 ? { assignedRunIds } : {}),
      }, currentUser?.uid);

      // Success! Show email template modal
      setCreatedClientInfo({
        email: email.trim(),
        password: password,
        name: name.trim(),
        guitarsCreated: 0,
      });
      setShowEmailTemplate(true);
      setSuccess(true);
    } catch (err: any) {
      console.error("Error creating client:", err);
      setError(err.message || "Failed to create client account. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/clients"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Clients
          </Link>
          <div className="flex items-center gap-3">
            <UserPlus className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Create New Client</h1>
          </div>
          <p className="text-gray-600 mt-2">
            Create a new client account. The client will then log in and fill out their guitar specifications through the onboarding workflow.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">Error</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Success Message */}
        {success && !showEmailTemplate && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6 flex items-start gap-2">
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">Success</p>
              <p className="text-sm">Client account created successfully!</p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Client Information */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Client Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="John Doe"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="client@example.com"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
                      placeholder="At least 6 characters"
                      required
                      disabled={isSubmitting}
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      disabled={isSubmitting}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={generatePassword}
                    className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                    disabled={isSubmitting}
                  >
                    Generate
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Password must be at least 6 characters. Use the Generate button for a secure random password.
                </p>
              </div>
            </div>
          </div>

          {/* Run Assignment */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Assign Runs (Optional)</h2>
            <p className="text-sm text-gray-600 mb-4">
              Select which runs this client can access. If no runs are selected, the client will see all active runs.
            </p>
            {activeRuns.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No active runs available.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-4">
                {activeRuns.map((run) => {
                  const isSelected = assignedRunIds.includes(run.id);
                  return (
                    <label
                      key={run.id}
                      className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setAssignedRunIds([...assignedRunIds, run.id]);
                          } else {
                            setAssignedRunIds(assignedRunIds.filter((id) => id !== run.id));
                          }
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        disabled={isSubmitting}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{run.name}</p>
                        <p className="text-xs text-gray-500">
                          {run.factory} • {new Date(run.startsAt).toLocaleDateString()}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Guitar className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900 mb-1">
                  Next Steps
                </p>
                <p className="text-sm text-blue-700">
                  After creating the account, the client will receive login credentials. They can then log in and fill out their guitar specifications through the onboarding workflow at <code className="bg-blue-100 px-1 rounded">/onboard</code>.
                  {assignedRunIds.length > 0 && (
                    <> The client will only see the {assignedRunIds.length} run{assignedRunIds.length > 1 ? "s" : ""} you've assigned.</>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <Link
              href="/clients"
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  Create Client
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Email Template Modal */}
      {showEmailTemplate && createdClientInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Client Account Created</h2>
                <button
                  onClick={handleCloseEmailTemplate}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-900">Account Created Successfully</p>
                    <p className="text-sm text-green-700 mt-1">
                      Client account for <strong>{createdClientInfo.name}</strong> has been created.
                      The client can now log in and fill out their guitar specifications through the onboarding workflow.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Template (Copy and send to client)
                </label>
                <textarea
                  value={generateEmailTemplate()}
                  readOnly
                  rows={15}
                  className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyEmailTemplate}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  {emailCopied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy Email Template
                    </>
                  )}
                </button>
                <button
                  onClick={handleCloseEmailTemplate}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

