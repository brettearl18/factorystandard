"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { createRun, createStage } from "@/lib/firestore";
import { Plus, X, GripVertical, FileText, DollarSign, ChevronDown, ChevronUp, Settings, CheckSquare } from "lucide-react";
import type { RunStage, InvoiceSchedule, Run } from "@/types/guitars";
import { SPEC_CATEGORIES } from "@/constants/guitarSpecs";
import { useRunSpecOptions } from "@/hooks/useRunSpecOptions";

// Standard template stages
const STANDARD_STAGES: Omit<RunStage, "id">[] = [
  {
    label: "Design & Planning",
    order: 0,
    internalOnly: false,
    requiresNote: false,
    requiresPhoto: false,
    clientStatusLabel: "In Planning",
  },
  {
    label: "Wood Selection & Prep",
    order: 1,
    internalOnly: true,
    requiresNote: false,
    requiresPhoto: true,
    clientStatusLabel: "In Build",
  },
  {
    label: "Body Shaping",
    order: 2,
    internalOnly: true,
    requiresNote: false,
    requiresPhoto: true,
    clientStatusLabel: "In Build",
  },
  {
    label: "Neck Carve & Routing",
    order: 3,
    internalOnly: true,
    requiresNote: true,
    requiresPhoto: true,
    clientStatusLabel: "In Build",
  },
  {
    label: "Finishing",
    order: 4,
    internalOnly: true,
    requiresNote: false,
    requiresPhoto: true,
    clientStatusLabel: "In Finish",
  },
  {
    label: "Assembly & Setup",
    order: 5,
    internalOnly: true,
    requiresNote: true,
    requiresPhoto: true,
    clientStatusLabel: "Final Assembly",
  },
  {
    label: "Quality Check",
    order: 6,
    internalOnly: false,
    requiresNote: true,
    requiresPhoto: true,
    clientStatusLabel: "Quality Check",
  },
  {
    label: "Ready for Shipping",
    order: 7,
    internalOnly: false,
    requiresNote: false,
    requiresPhoto: true,
    clientStatusLabel: "Ready to Ship",
  },
];

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
  const [expandedInvoiceSchedules, setExpandedInvoiceSchedules] = useState<Set<number>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSpecConstraints, setShowSpecConstraints] = useState(true);
  const [specConstraints, setSpecConstraints] = useState<Run["specConstraints"]>({});
  const [expandedSpecCategories, setExpandedSpecCategories] = useState<Set<string>>(new Set());
  const runSpecOptions = useRunSpecOptions();
  const specCategoriesWithOptions = SPEC_CATEGORIES.map(({ key, label, options }) => ({
    key,
    label,
    options: runSpecOptions[key] ?? options,
  }));

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

  const toggleInvoiceSchedule = (index: number) => {
    const newExpanded = new Set(expandedInvoiceSchedules);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedInvoiceSchedules(newExpanded);
  };

  const updateInvoiceSchedule = (index: number, updates: Partial<InvoiceSchedule>) => {
    const newStages = [...stages];
    const currentSchedule = newStages[index].invoiceSchedule || { enabled: false };
    newStages[index] = {
      ...newStages[index],
      invoiceSchedule: { ...currentSchedule, ...updates },
    };
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

  const loadStandardTemplate = () => {
    if (stages.length > 0 && !confirm("This will replace all current stages. Continue?")) {
      return;
    }
    setStages(STANDARD_STAGES.map((stage, index) => ({ ...stage, order: index })));
  };

  // Spec constraints handlers
  const toggleSpecCategory = (category: string) => {
    const newExpanded = new Set(expandedSpecCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedSpecCategories(newExpanded);
  };

  const toggleSpecOption = (category: keyof NonNullable<Run["specConstraints"]>, option: string) => {
    const current = specConstraints?.[category] || [];
    const isSelected = current.includes(option);
    
    setSpecConstraints({
      ...specConstraints,
      [category]: isSelected
        ? current.filter((o) => o !== option)
        : [...current, option],
    });
  };

  const addCustomSpecOption = (category: keyof NonNullable<Run["specConstraints"]>, customValue: string) => {
    if (!customValue.trim()) return;
    const current = specConstraints?.[category] || [];
    if (current.includes(customValue.trim())) return; // Prevent duplicates
    
    setSpecConstraints({
      ...specConstraints,
      [category]: [...current, customValue.trim()],
    });
  };

  const removeCustomSpecOption = (category: keyof NonNullable<Run["specConstraints"]>, option: string) => {
    const current = specConstraints?.[category] || [];
    setSpecConstraints({
      ...specConstraints,
      [category]: current.filter((o) => o !== option),
    });
  };

  const selectAllOptions = (category: keyof NonNullable<Run["specConstraints"]>, allOptions: string[]) => {
    setSpecConstraints({
      ...specConstraints,
      [category]: allOptions,
    });
  };

  const deselectAllOptions = (category: keyof NonNullable<Run["specConstraints"]>) => {
    setSpecConstraints({
      ...specConstraints,
      [category]: [],
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!runName.trim() || stages.length === 0) return;

    setIsSubmitting(true);

    try {
      // Clean up empty constraint arrays
      const cleanedConstraints: Run["specConstraints"] = {};
      if (specConstraints) {
        Object.entries(specConstraints).forEach(([key, value]) => {
          if (value && value.length > 0) {
            cleanedConstraints[key as keyof typeof cleanedConstraints] = value;
          }
        });
      }

      // Create the run
      const runId = await createRun({
        name: runName,
        factory: "perth",
        isActive: true,
        startsAt: Date.now(),
        specConstraints: Object.keys(cleanedConstraints).length > 0 ? cleanedConstraints : undefined,
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
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={loadStandardTemplate}
                className="flex items-center gap-2 text-sm bg-gray-100 text-gray-700 px-3 py-1.5 rounded-md hover:bg-gray-200 transition-colors"
              >
                <FileText className="w-4 h-4" />
                Load Standard Template
              </button>
              <button
                type="button"
                onClick={addStage}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
              >
                <Plus className="w-4 h-4" />
                Add Stage
              </button>
            </div>
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

                    {/* Invoice Schedule Section */}
                    <div className="mt-4 border-t border-gray-200 pt-4">
                      <button
                        type="button"
                        onClick={() => toggleInvoiceSchedule(index)}
                        className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 w-full"
                      >
                        <DollarSign className="w-4 h-4" />
                        <span>Invoice Schedule</span>
                        {expandedInvoiceSchedules.has(index) ? (
                          <ChevronUp className="w-4 h-4 ml-auto" />
                        ) : (
                          <ChevronDown className="w-4 h-4 ml-auto" />
                        )}
                      </button>

                      {expandedInvoiceSchedules.has(index) && (
                        <div className="mt-3 space-y-3 bg-blue-50 p-3 rounded-md border border-blue-200">
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={stage.invoiceSchedule?.enabled || false}
                              onChange={(e) =>
                                updateInvoiceSchedule(index, {
                                  enabled: e.target.checked,
                                })
                              }
                              className="rounded"
                            />
                            <span className="font-medium">Create invoice when guitar reaches this stage</span>
                          </label>

                          {stage.invoiceSchedule?.enabled && (
                            <div className="space-y-3 pl-6">
                              <div>
                                <label className="block text-xs font-medium mb-1">
                                  Invoice Title (optional)
                                </label>
                                <input
                                  type="text"
                                  value={stage.invoiceSchedule?.title || ""}
                                  onChange={(e) =>
                                    updateInvoiceSchedule(index, {
                                      title: e.target.value,
                                    })
                                  }
                                  placeholder={`Defaults to "${stage.label}"`}
                                  className="w-full p-2 border rounded-md text-sm"
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-medium mb-1">
                                    Amount <span className="text-red-500">*</span>
                                  </label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={stage.invoiceSchedule?.amount || ""}
                                    onChange={(e) =>
                                      updateInvoiceSchedule(index, {
                                        amount: e.target.value ? parseFloat(e.target.value) : undefined,
                                      })
                                    }
                                    className="w-full p-2 border rounded-md text-sm"
                                    required={stage.invoiceSchedule?.enabled}
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium mb-1">
                                    Currency
                                  </label>
                                  <select
                                    value={stage.invoiceSchedule?.currency || "AUD"}
                                    onChange={(e) =>
                                      updateInvoiceSchedule(index, {
                                        currency: e.target.value,
                                      })
                                    }
                                    className="w-full p-2 border rounded-md text-sm"
                                  >
                                    <option value="AUD">AUD</option>
                                    <option value="USD">USD</option>
                                    <option value="EUR">EUR</option>
                                  </select>
                                </div>
                              </div>

                              <div>
                                <label className="block text-xs font-medium mb-1">
                                  Due Date (days from stage entry)
                                </label>
                                <input
                                  type="number"
                                  value={stage.invoiceSchedule?.dueDateDays || 30}
                                  onChange={(e) =>
                                    updateInvoiceSchedule(index, {
                                      dueDateDays: e.target.value ? parseInt(e.target.value) : 30,
                                    })
                                  }
                                  className="w-full p-2 border rounded-md text-sm"
                                  min="1"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                  Invoice will be due {stage.invoiceSchedule?.dueDateDays || 30} days after guitar enters this stage
                                </p>
                              </div>

                              <div>
                                <label className="block text-xs font-medium mb-1">
                                  Payment Link (optional)
                                </label>
                                <input
                                  type="url"
                                  value={stage.invoiceSchedule?.paymentLink || ""}
                                  onChange={(e) =>
                                    updateInvoiceSchedule(index, {
                                      paymentLink: e.target.value,
                                    })
                                  }
                                  placeholder="https://pay.stripe.com/..."
                                  className="w-full p-2 border rounded-md text-sm"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-medium mb-1">
                                  Description (optional)
                                </label>
                                <textarea
                                  value={stage.invoiceSchedule?.description || ""}
                                  onChange={(e) =>
                                    updateInvoiceSchedule(index, {
                                      description: e.target.value,
                                    })
                                  }
                                  placeholder="Optional invoice description"
                                  className="w-full p-2 border rounded-md text-sm"
                                  rows={2}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
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

        {/* Spec Constraints */}
        <div className="border rounded-lg p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Spec Constraints (Optional)</h2>
            </div>
            <button
              type="button"
              onClick={() => setShowSpecConstraints(!showSpecConstraints)}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              {showSpecConstraints ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Hide Constraints
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Show Constraints
                </>
              )}
            </button>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Limit which spec options are available for this run. Clients will only see the options you select when filling out their guitar specifications.
          </p>

          {showSpecConstraints && (
            <div className="space-y-4 mt-4">
              {/* Spec Constraint Category Component */}
              {specCategoriesWithOptions.map(({ key, label, options }) => {
                const isExpanded = expandedSpecCategories.has(key);
                const selected = specConstraints?.[key] || [];
                const customOptions = selected.filter((opt) => !options.includes(opt));
                const predefinedSelected = selected.filter((opt) => options.includes(opt));

                return (
                  <div key={key} className="bg-white border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <button
                        type="button"
                        onClick={() => toggleSpecCategory(key)}
                        className="flex items-center gap-2 text-sm font-medium text-gray-900 hover:text-blue-600"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                        {label}
                        {selected.length > 0 && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                            {selected.length} selected
                          </span>
                        )}
                      </button>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => selectAllOptions(key, options)}
                          className="text-xs text-gray-600 hover:text-blue-600"
                        >
                          Select All
                        </button>
                        <span className="text-gray-300">|</span>
                        <button
                          type="button"
                          onClick={() => deselectAllOptions(key)}
                          className="text-xs text-gray-600 hover:text-blue-600"
                        >
                          Deselect All
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 space-y-3">
                        {/* Predefined Options */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 bg-gray-50 rounded">
                          {options.map((option) => {
                            const isChecked = predefinedSelected.includes(option);
                            return (
                              <label
                                key={option}
                                className="flex items-center gap-2 text-sm cursor-pointer hover:bg-white p-1 rounded"
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleSpecOption(key, option)}
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className={isChecked ? "font-medium text-blue-700" : "text-gray-700"}>
                                  {option}
                                </span>
                              </label>
                            );
                          })}
                        </div>

                        {/* Custom Options */}
                        {customOptions.length > 0 && (
                          <div className="border-t pt-3">
                            <p className="text-xs font-medium text-gray-700 mb-2">Custom Options:</p>
                            <div className="flex flex-wrap gap-2">
                              {customOptions.map((option) => (
                                <span
                                  key={option}
                                  className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm"
                                >
                                  {option}
                                  <button
                                    type="button"
                                    onClick={() => removeCustomSpecOption(key, option)}
                                    className="text-blue-600 hover:text-blue-800"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Add Custom Option */}
                        <CustomOptionInput
                          onAdd={(value) => addCustomSpecOption(key, value)}
                          placeholder={`Add custom ${label.toLowerCase()}...`}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
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

// Custom Option Input Component
function CustomOptionInput({
  onAdd,
  placeholder,
}: {
  onAdd: (value: string) => void;
  placeholder: string;
}) {
  const [value, setValue] = useState("");

  const handleAdd = () => {
    if (value.trim()) {
      onAdd(value.trim());
      setValue("");
    }
  };  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyPress={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleAdd();
          }
        }}
        placeholder={placeholder}
        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
      <button
        type="button"
        onClick={handleAdd}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
      >
        Add
      </button>
    </div>
  );
}