"use client";

import { useState, useEffect } from "react";
import { X, Upload, Image as ImageIcon, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { updateRun } from "@/lib/firestore";
import { uploadRunThumbnail } from "@/lib/storage";
import type { Run } from "@/types/guitars";

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

  // Reset form when run changes
  useEffect(() => {
    if (isOpen) {
      setName(run.name);
      setIsActive(run.isActive);
      setThumbnailPreview(run.thumbnailUrl || null);
      setThumbnailFile(null);
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
        thumbnailUrl = await uploadRunThumbnail(run.id, thumbnailFile);
      } else if (!thumbnailPreview && run.thumbnailUrl) {
        // If thumbnail was removed, set to undefined
        thumbnailUrl = undefined;
      }

      // Update the run
      await updateRun(run.id, {
        name,
        isActive,
        thumbnailUrl,
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

