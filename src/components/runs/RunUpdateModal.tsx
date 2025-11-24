"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createRunUpdate } from "@/lib/firestore";
import { uploadRunUpdateImage } from "@/lib/storage";
import { X, Send, Users, Upload, Image as ImageIcon, Trash2 } from "lucide-react";
import type { Run } from "@/types/guitars";

interface RunUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  run: Run;
  clientCount: number; // Number of clients in the run
}

export function RunUpdateModal({
  isOpen,
  onClose,
  run,
  clientCount,
}: RunUpdateModalProps) {
  const { currentUser } = useAuth();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [visibleToClients, setVisibleToClients] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  if (!isOpen) return null;

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const selectedImages = files.filter((file) => file.type.startsWith("image/"));
    
    if (selectedImages.length === 0) {
      setError("Please select image files only");
      return;
    }

    // Check how many slots we have left
    const currentCount = imageFiles.length;
    const remainingSlots = 10 - currentCount;
    
    if (remainingSlots <= 0) {
      setError("Maximum 10 images allowed");
      return;
    }

    // Take only as many as we can fit
    const imagesToAdd = selectedImages.slice(0, remainingSlots);
    const newFiles = [...imageFiles, ...imagesToAdd];
    
    // Check total file size (max 50MB total)
    const totalSize = newFiles.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > 50 * 1024 * 1024) {
      setError("Total image size must be less than 50MB");
      return;
    }

    setImageFiles(newFiles);

    // Create previews for new images
    const newPreviews: string[] = [...imagePreviews];
    imagesToAdd.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          newPreviews.push(e.target.result as string);
          setImagePreviews([...newPreviews]);
        }
      };
      reader.readAsDataURL(file);
    });
    
    // Reset file input
    e.target.value = "";
  };

  const handleRemoveImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !title.trim() || !message.trim()) {
      setError("Please fill in both title and message");
      return;
    }

    setIsSubmitting(true);
    setUploadingImages(true);
    setError(null);

    try {
      // Upload images first
      let imageUrls: string[] = [];
      if (imageFiles.length > 0) {
        try {
          const uploadPromises = imageFiles.map((file) =>
            uploadRunUpdateImage(run.id, file)
          );
          imageUrls = await Promise.all(uploadPromises);
        } catch (uploadError: any) {
          console.error("Error uploading images:", uploadError);
          setError("Failed to upload images. Please try again.");
          setIsSubmitting(false);
          setUploadingImages(false);
          return;
        }
      }

      await createRunUpdate(run.id, {
        runId: run.id,
        title: title.trim(),
        message: message.trim(),
        authorUid: currentUser.uid,
        authorName: currentUser.displayName || currentUser.email || "Staff",
        visibleToClients,
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
      });

      // Reset form
      setTitle("");
      setMessage("");
      setVisibleToClients(true);
      setImageFiles([]);
      setImagePreviews([]);
      onClose();
    } catch (error: any) {
      console.error("Error creating run update:", error);
      setError(error.message || "Failed to send update. Please try again.");
    } finally {
      setIsSubmitting(false);
      setUploadingImages(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Send Run Update</h2>
            <p className="text-sm text-gray-500 mt-1">{run.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={isSubmitting}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-blue-600" />
                <p className="text-sm font-medium text-blue-900">
                  This update will be sent to {clientCount} {clientCount === 1 ? "client" : "clients"} in this run
                </p>
              </div>
              <p className="text-xs text-blue-700">
                All clients with guitars in "{run.name}" will receive a notification
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Update Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Production Milestone Reached"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={isSubmitting}
                maxLength={100}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message <span className="text-red-500">*</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Share updates about the run progress, milestones, delays, or any important information..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={8}
                required
                disabled={isSubmitting}
                maxLength={2000}
              />
              <p className="text-xs text-gray-500 mt-1">
                {message.length}/2000 characters
              </p>
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Images (Optional)
              </label>
              <div className="space-y-3">
                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-3 gap-3">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          disabled={isSubmitting}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageSelect}
                    className="hidden"
                    disabled={isSubmitting || imageFiles.length >= 10}
                  />
                  <div className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-blue-400 hover:bg-blue-50 transition-colors flex flex-col items-center justify-center">
                    <Upload className="w-6 h-6 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600 font-medium">
                      {imageFiles.length >= 10
                        ? "Maximum 10 images"
                        : "Click to upload images"}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      PNG, JPG up to 50MB total ({imageFiles.length}/10)
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="visibleToClients"
                checked={visibleToClients}
                onChange={(e) => setVisibleToClients(e.target.checked)}
                className="rounded"
                disabled={isSubmitting}
              />
              <label htmlFor="visibleToClients" className="text-sm text-gray-700 cursor-pointer">
                Make this update visible to clients
              </label>
            </div>

            {!visibleToClients && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-xs text-yellow-800">
                  This update will only be visible to staff members, not clients.
                </p>
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !title.trim() || !message.trim() || uploadingImages}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting || uploadingImages ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {uploadingImages ? "Uploading images..." : "Sending..."}
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send Update
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

