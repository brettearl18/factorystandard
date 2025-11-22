"use client";

import { useState, useEffect } from "react";
import { X, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
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

      // Success!
      alert(`Client created successfully!\n\nEmail: ${email}\nPassword: ${password}\n\n${createGuitar && guitars.length > 0 ? `${guitars.length} guitar(s) created.` : "No guitars created."}\n\nPlease share these credentials with the client.`);
      
      // Reset form
      setEmail("");
      setName("");
      setPassword("");
      setCreateGuitar(false);
      setGuitars([{ runId: "", stageId: "", model: "", finish: "", orderNumber: "" }]);
      setError(null);
      
      onSuccess?.();
      onClose();
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
    </div>
  );
}

