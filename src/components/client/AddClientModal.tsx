"use client";

import { useState, useEffect } from "react";
import { X, Eye, EyeOff, Plus, Trash2, Copy, Check } from "lucide-react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useRuns } from "@/hooks/useRuns";
import { subscribeRunStages, createGuitar as createGuitarRecord } from "@/lib/firestore";
import type { Run, RunStage } from "@/types/guitars";

interface GuitarFormData {
  runId: string;
  stageId: string;
  model: string;
  finish: string;
  orderNumber: string;
}

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AddClientModal({ isOpen, onClose, onSuccess }: AddClientModalProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEmailTemplate, setShowEmailTemplate] = useState(false);
  const [createdClientInfo, setCreatedClientInfo] = useState<{ 
    email: string; 
    password: string; 
    name: string;
    guitarsCreated: number;
  } | null>(null);
  const [emailCopied, setEmailCopied] = useState(false);
  
  // Guitar creation
  const [createGuitar, setCreateGuitar] = useState(false);
  const [guitars, setGuitars] = useState<GuitarFormData[]>([
    { runId: "", stageId: "", model: "", finish: "", orderNumber: "" }
  ]);
  const [runStagesMap, setRunStagesMap] = useState<Map<string, RunStage[]>>(new Map());
  
  const runs = useRuns();
  const activeRuns = runs.filter(r => !r.archived && r.isActive);

  // Load stages for selected runs
  useEffect(() => {
    if (!isOpen) return;

    const unsubscribes: (() => void)[] = [];
    const stagesMap = new Map<string, RunStage[]>();

    guitars.forEach((guitar) => {
      if (guitar.runId && !stagesMap.has(guitar.runId)) {
        const unsubscribe = subscribeRunStages(guitar.runId, (stages) => {
          stagesMap.set(guitar.runId, stages);
          setRunStagesMap(new Map(stagesMap));
          
          // Auto-select first stage if none selected
          setGuitars(prev => prev.map(g => 
            g.runId === guitar.runId && !g.stageId && stages.length > 0
              ? { ...g, stageId: stages[0].id }
              : g
          ));
        });
        unsubscribes.push(unsubscribe);
      }
    });

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [isOpen, guitars.map(g => g.runId).join(",")]);

  if (!isOpen) return null;

  const handleAddGuitar = () => {
    setGuitars([...guitars, { runId: "", stageId: "", model: "", finish: "", orderNumber: "" }]);
  };

  const handleRemoveGuitar = (index: number) => {
    setGuitars(guitars.filter((_, i) => i !== index));
  };

  const handleGuitarChange = (index: number, field: keyof GuitarFormData, value: string) => {
    const updated = [...guitars];
    updated[index] = { ...updated[index], [field]: value };
    
    // Reset stageId when runId changes
    if (field === "runId") {
      updated[index].stageId = "";
    }
    
    setGuitars(updated);
  };

  const generatePassword = () => {
    // Generate a random 12-character password
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(password);
  };

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

  const handleCloseEmailTemplate = () => {
    setShowEmailTemplate(false);
    setCreatedClientInfo(null);
    setEmailCopied(false);
    onSuccess?.();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

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

    if (createGuitar) {
      const invalidGuitars = guitars.filter(g => 
        !g.runId || !g.stageId || !g.model.trim() || !g.finish.trim() || !g.orderNumber.trim()
      );
      if (invalidGuitars.length > 0) {
        setError("Please fill in all guitar fields or remove incomplete guitars");
        return;
      }
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

      // Step 2: Create guitars if requested
      if (createGuitar && guitars.length > 0) {
        for (const guitar of guitars) {
          if (guitar.runId && guitar.stageId && guitar.model && guitar.finish && guitar.orderNumber) {
            await createGuitarRecord({
              runId: guitar.runId,
              stageId: guitar.stageId,
              clientUid,
              customerName: name.trim(),
              customerEmail: email.trim(),
              model: guitar.model.trim(),
              finish: guitar.finish.trim(),
              orderNumber: guitar.orderNumber.trim(),
            });
          }
        }
      }

      // Success! Show email template modal
      const guitarsCreated = createGuitar && guitars.length > 0 ? guitars.length : 0;
      setCreatedClientInfo({ 
        email: email.trim(), 
        password, 
        name: name.trim(),
        guitarsCreated 
      });
      setShowEmailTemplate(true);
      
      // Reset form (but keep modal open to show email template)
      setEmail("");
      setName("");
      setPassword("");
      setCreateGuitar(false);
      setGuitars([{ runId: "", stageId: "", model: "", finish: "", orderNumber: "" }]);
      setError(null);
    } catch (error: any) {
      console.error("Error creating client:", error);
      setError(error.message || "Failed to create client. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Add New Client</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={isSubmitting}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Client Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Client Information</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                placeholder="client@example.com"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                placeholder="John Doe"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-20"
                  required
                  placeholder="Enter password (min 6 characters)"
                  minLength={6}
                  disabled={isSubmitting}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1 text-gray-500 hover:text-gray-700"
                    disabled={isSubmitting}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={generatePassword}
                    className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                    disabled={isSubmitting}
                  >
                    Generate
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Share this password with the client. They can change it after logging in.
              </p>
            </div>
          </div>

          {/* Guitar Creation */}
          <div className="space-y-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Guitar Information (Optional)</h3>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createGuitar}
                  onChange={(e) => setCreateGuitar(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  disabled={isSubmitting}
                />
                <span className="text-sm text-gray-700">Create guitar(s) for this client</span>
              </label>
            </div>

            {createGuitar && (
              <div className="space-y-4">
                {guitars.map((guitar, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-gray-700">Guitar {index + 1}</h4>
                      {guitars.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveGuitar(index)}
                          className="p-1 text-red-600 hover:text-red-700"
                          disabled={isSubmitting}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Run *
                        </label>
                        <select
                          value={guitar.runId}
                          onChange={(e) => handleGuitarChange(index, "runId", e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required={createGuitar}
                          disabled={isSubmitting}
                        >
                          <option value="">Select run...</option>
                          {activeRuns.map((run) => (
                            <option key={run.id} value={run.id}>
                              {run.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Stage *
                        </label>
                        <select
                          value={guitar.stageId}
                          onChange={(e) => handleGuitarChange(index, "stageId", e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required={!!(createGuitar && guitar.runId)}
                          disabled={isSubmitting || !guitar.runId}
                        >
                          <option value="">Select stage...</option>
                          {runStagesMap.get(guitar.runId)?.map((stage) => (
                            <option key={stage.id} value={stage.id}>
                              {stage.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Model *
                        </label>
                        <input
                          type="text"
                          value={guitar.model}
                          onChange={(e) => handleGuitarChange(index, "model", e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required={createGuitar}
                          placeholder="e.g., Hype GTR"
                          disabled={isSubmitting}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Finish *
                        </label>
                        <input
                          type="text"
                          value={guitar.finish}
                          onChange={(e) => handleGuitarChange(index, "finish", e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required={createGuitar}
                          placeholder="e.g., Interstellar"
                          disabled={isSubmitting}
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Order Number *
                        </label>
                        <input
                          type="text"
                          value={guitar.orderNumber}
                          onChange={(e) => handleGuitarChange(index, "orderNumber", e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required={createGuitar}
                          placeholder="e.g., 1203"
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddGuitar}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  disabled={isSubmitting}
                >
                  <Plus className="w-4 h-4" />
                  Add Another Guitar
                </button>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create Client"}
            </button>
          </div>
        </form>
      </div>

      {/* Email Template Modal */}
      {showEmailTemplate && createdClientInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Client Created Successfully</h2>
              <button
                onClick={handleCloseEmailTemplate}
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
                    ✓ Client account created successfully!
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
                onClick={handleCloseEmailTemplate}
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

