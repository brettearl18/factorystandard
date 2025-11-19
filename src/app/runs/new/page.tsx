"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { createRun, createStage } from "@/lib/firestore";
import { Plus, X, GripVertical } from "lucide-react";
import type { RunStage } from "@/types/guitars";

export default function NewRunPage() {
  const { currentUser, userRole, loading } = useAuth();
  const router = useRouter();
  const [runName, setRunName] = useState("");
  const [stages, setStages] = useState<Omit<RunStage, "id">[]>([
    {
      label: "Design & Planning",
      order: 0,
      internalOnly: false,
      requiresNote: false,
      requiresPhoto: false,
      clientStatusLabel: "In Planning",
    },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!currentUser || (userRole !== "staff" && userRole !== "admin")) {
    router.push("/runs");
    return null;
  }

  const addStage = () => {
    setStages([
      ...stages,
      {
        label: "",
        order: stages.length,
        internalOnly: true,
        requiresNote: false,
        requiresPhoto: false,
        clientStatusLabel: "",
      },
    ]);
  };

  const removeStage = (index: number) => {
    const newStages = stages.filter((_, i) => i !== index).map((stage, i) => ({
      ...stage,
      order: i,
    }));
    setStages(newStages);
  };

  const updateStage = (index: number, updates: Partial<RunStage>) => {
    const newStages = [...stages];
    newStages[index] = { ...newStages[index], ...updates };
    setStages(newStages);
  };

  const moveStage = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === stages.length - 1)
    ) {
      return;
    }

    const newStages = [...stages];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    [newStages[index], newStages[targetIndex]] = [
      newStages[targetIndex],
      newStages[index],
    ];
    newStages.forEach((stage, i) => {
      stage.order = i;
    });
    setStages(newStages);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!runName.trim() || stages.length === 0) return;

    setIsSubmitting(true);

    try {
      // Create the run
      const runId = await createRun({
        name: runName,
        factory: "perth",
        isActive: true,
        startsAt: Date.now(),
      });

      // Create all stages
      for (const stage of stages) {
        await createStage(runId, stage);
      }

      // Redirect to the board
      router.push(`/runs/${runId}/board`);
    } catch (error) {
      console.error("Error creating run:", error);
      alert("Failed to create run. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-6">Create New Run</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Run Name */}
        <div>
          <label className="block text-sm font-medium mb-2">Run Name</label>
          <input
            type="text"
            value={runName}
            onChange={(e) => setRunName(e.target.value)}
            placeholder="e.g., Perth Run #7 – March 2026"
            className="w-full p-2 border rounded-md"
            required
          />
        </div>

        {/* Stages */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <label className="block text-sm font-medium">Stages</label>
            <button
              type="button"
              onClick={addStage}
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
            >
              <Plus className="w-4 h-4" />
              Add Stage
            </button>
          </div>

          <div className="space-y-4">
            {stages.map((stage, index) => (
              <div
                key={index}
                className="bg-gray-50 border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-start gap-4">
                  <div className="flex flex-col gap-1 pt-2">
                    <button
                      type="button"
                      onClick={() => moveStage(index, "up")}
                      disabled={index === 0}
                      className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <GripVertical className="w-4 h-4 text-gray-400" />
                    <button
                      type="button"
                      onClick={() => moveStage(index, "down")}
                      disabled={index === stages.length - 1}
                      className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    >
                      ↓
                    </button>
                  </div>

                  <div className="flex-1 space-y-3">
                    <div>
                      <label className="block text-xs font-medium mb-1">
                        Stage Label
                      </label>
                      <input
                        type="text"
                        value={stage.label}
                        onChange={(e) =>
                          updateStage(index, { label: e.target.value })
                        }
                        placeholder="e.g., Neck Carve & Routing"
                        className="w-full p-2 border rounded-md text-sm"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium mb-1">
                        Client Status Label (shown to clients)
                      </label>
                      <input
                        type="text"
                        value={stage.clientStatusLabel || ""}
                        onChange={(e) =>
                          updateStage(index, {
                            clientStatusLabel: e.target.value,
                          })
                        }
                        placeholder="e.g., In Build"
                        className="w-full p-2 border rounded-md text-sm"
                      />
                    </div>

                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={stage.internalOnly}
                          onChange={(e) =>
                            updateStage(index, {
                              internalOnly: e.target.checked,
                            })
                          }
                          className="rounded"
                        />
                        Internal Only
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={stage.requiresNote || false}
                          onChange={(e) =>
                            updateStage(index, {
                              requiresNote: e.target.checked,
                            })
                          }
                          className="rounded"
                        />
                        Requires Note
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={stage.requiresPhoto || false}
                          onChange={(e) =>
                            updateStage(index, {
                              requiresPhoto: e.target.checked,
                            })
                          }
                          className="rounded"
                        />
                        Requires Photo
                      </label>
                    </div>
                  </div>

                  {stages.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeStage(index)}
                      className="text-red-600 hover:text-red-700 p-1"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => router.push("/runs")}
            className="px-4 py-2 border rounded-md hover:bg-gray-50"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            disabled={isSubmitting || !runName.trim() || stages.length === 0}
          >
            {isSubmitting ? "Creating..." : "Create Run"}
          </button>
        </div>
      </form>
      </div>
    </AppLayout>
  );
}

