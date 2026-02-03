"use client";

import { useState, useEffect } from "react";
import { X, Upload, Image as ImageIcon, Trash2, Settings, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { updateRun } from "@/lib/firestore";
import { uploadRunThumbnail, deleteRunThumbnail } from "@/lib/storage";
import type { Run } from "@/types/guitars";
import { SPEC_CATEGORIES } from "@/constants/guitarSpecs";
import { useRunSpecOptions } from "@/hooks/useRunSpecOptions";

interface EditRunModalProps {
  run: Run;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function EditRunModal({
  run,
  isOpen,
  onClose,
  onSuccess,
}: EditRunModalProps) {
  const { currentUser } = useAuth();
  const [name, setName] = useState(run.name);
  const [isActive, setIsActive] = useState(run.isActive);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(
    run.thumbnailUrl || null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  
  // Spec constraints
  const [specConstraints, setSpecConstraints] = useState<Run["specConstraints"]>(run.specConstraints || {});
  const [showSpecConstraints, setShowSpecConstraints] = useState(false);
  const [expandedSpecCategories, setExpandedSpecCategories] = useState<Set<string>>(new Set());

  // Reset form when run changes
  useEffect(() => {
    if (isOpen) {
      setName(run.name);
      setIsActive(run.isActive);
      setThumbnailPreview(run.thumbnailUrl || null);
      setThumbnailFile(null);
      setSpecConstraints(run.specConstraints || {});
      setExpandedSpecCategories(new Set());
    }
  }, [isOpen, run]);

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        alert("Please select an image file");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        alert("Image must be less than 10MB");
        return;
      }
      setThumbnailFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveThumbnail = () => {
    if (!confirm("Are you sure you want to remove this thumbnail? The image will be permanently deleted from storage.")) {
      return;
    }
    setThumbnailFile(null);
    setThumbnailPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setIsSubmitting(true);
    setUploadingThumbnail(!!thumbnailFile);

    try {
      let thumbnailUrl = run.thumbnailUrl;

      // Upload new thumbnail if one was selected
      if (thumbnailFile) {
        // Delete old thumbnail if it exists
        if (run.thumbnailUrl) {
          await deleteRunThumbnail(run.id, run.thumbnailUrl).catch((error) => {
            console.error("Error deleting old thumbnail:", error);
            // Continue even if deletion fails
          });
        }
        thumbnailUrl = await uploadRunThumbnail(run.id, thumbnailFile);
      } else if (!thumbnailPreview && run.thumbnailUrl) {
        // If thumbnail was removed, delete from storage and set to undefined
        await deleteRunThumbnail(run.id, run.thumbnailUrl).catch((error) => {
          console.error("Error deleting thumbnail:", error);
          // Continue even if deletion fails
        });
        thumbnailUrl = undefined;
      }

      // Clean up empty constraint arrays
      const cleanedConstraints: Run["specConstraints"] = {};
      if (specConstraints) {
        Object.entries(specConstraints).forEach(([key, value]) => {
          if (value && value.length > 0) {
            cleanedConstraints[key as keyof typeof cleanedConstraints] = value;
          }
        });
      }

      // Update the run
      await updateRun(run.id, {
        name,
        isActive,
        thumbnailUrl,
        specConstraints: Object.keys(cleanedConstraints).length > 0 ? cleanedConstraints : undefined,
      });

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Error updating run:", error);
      alert("Failed to update run. Please try again.");
    } finally {
      setIsSubmitting(false);
      setUploadingThumbnail(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Edit Run</h2>
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
            <div className="space-y-6">
              {/* Run Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Run Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Perth Run #7 - March 2026"
                />
              </div>

              {/* Active Status */}
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Active Run
                  </span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-8">
                  Active runs appear in the dashboard and can have guitars added to them
                </p>
              </div>

              {/* Thumbnail */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Thumbnail Image
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  Upload an image to help identify this run at a glance
                </p>

                {thumbnailPreview ? (
                  <div className="relative">
                    <div className="w-full h-48 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center">
                      <img
                        src={thumbnailPreview}
                        alt="Thumbnail preview"
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <label className="flex-1 cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleThumbnailChange}
                          className="hidden"
                          disabled={uploadingThumbnail}
                        />
                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">
                          <Upload className="w-4 h-4" />
                          Replace Image
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={handleRemoveThumbnail}
                        disabled={uploadingThumbnail}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                      >
                        <Trash2 className="w-4 h-4" />
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleThumbnailChange}
                      className="hidden"
                      disabled={uploadingThumbnail}
                    />
                    <div className="w-full h-48 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center hover:border-blue-400 hover:bg-blue-50 transition-colors">
                      <ImageIcon className="w-12 h-12 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600 font-medium">
                        Click to upload thumbnail
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        PNG, JPG up to 10MB
                      </p>
                    </div>
                  </label>
                )}

                {uploadingThumbnail && (
                  <p className="text-sm text-gray-500 mt-2">Uploading image...</p>
                )}
              </div>

              {/* Spec Constraints */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Spec Constraints</h3>
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
                  <SpecConstraintsEditor
                    specConstraints={specConstraints}
                    setSpecConstraints={setSpecConstraints}
                    expandedSpecCategories={expandedSpecCategories}
                    setExpandedSpecCategories={setExpandedSpecCategories}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

// Spec Constraints Editor Component
function SpecConstraintsEditor({
  specConstraints,
  setSpecConstraints,
  expandedSpecCategories,
  setExpandedSpecCategories,
}: {
  specConstraints: Run["specConstraints"];
  setSpecConstraints: (constraints: Run["specConstraints"]) => void;
  expandedSpecCategories: Set<string>;
  setExpandedSpecCategories: (set: Set<string>) => void;
}) {
  const runSpecOptions = useRunSpecOptions();
  const specCategoriesWithOptions = SPEC_CATEGORIES.map(({ key, label, options }) => ({
    key,
    label,
    options: runSpecOptions[key] ?? options,
  }));

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
    if (current.includes(customValue.trim())) return;
    
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

  return (
    <div className="space-y-4 mt-4">
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
  };

  return (
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