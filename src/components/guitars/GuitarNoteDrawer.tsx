"use client";

import { useState } from "react";
import { X, ExternalLink, CheckCircle, AlertCircle, Flag, TrendingUp, Info } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { addGuitarNote, updateGuitarPhotoInfo } from "@/lib/firestore";
import { uploadGuitarPhoto, isGoogleDriveLink } from "@/lib/storage";
import { updateGuitarStage } from "@/lib/firestore";
import type { GuitarBuild, RunStage, NoteType } from "@/types/guitars";

interface GuitarNoteDrawerProps {
  guitar: GuitarBuild;
  stage: RunStage;
  isOpen: boolean;
  onClose: (noteAdded: boolean) => void;
  skipStageUpdate?: boolean; // If true, don't update the stage, just add note
}

export function GuitarNoteDrawer({
  guitar,
  stage,
  isOpen,
  onClose,
  skipStageUpdate = false,
}: GuitarNoteDrawerProps) {
  const { currentUser } = useAuth();
  const [message, setMessage] = useState("");
  const [noteType, setNoteType] = useState<NoteType>("update");
  const [visibleToClient, setVisibleToClient] = useState(true);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]); // For Google Drive links
  const [driveLinkInput, setDriveLinkInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setPhotos(Array.from(e.target.files));
    }
  };

  const handleAddDriveLink = () => {
    if (!driveLinkInput.trim()) return;
    
    // Store Google Drive links as-is (no conversion needed for folder links)
    setPhotoUrls((prev) => [...prev, driveLinkInput.trim()]);
    setDriveLinkInput("");
  };

  const removePhotoUrl = (index: number) => {
    setPhotoUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    // Validation: Check if note is required
    if (!skipStageUpdate) {
      if (stage.requiresNote && !message.trim()) {
        alert("A note is required for this stage.");
        return;
      }
    }

    // Photos are always optional - allow submission with just a message
    if (!message.trim() && photos.length === 0 && photoUrls.length === 0) {
      alert("Please add a message or at least one photo.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload photos first, then combine with Google Drive links
      const uploadedUrls: string[] = [];
      for (const photo of photos) {
        const url = await uploadGuitarPhoto(guitar.id, stage.id, photo);
        uploadedUrls.push(url);
      }
      // Combine uploaded URLs with Google Drive links
      const allPhotoUrls = [...uploadedUrls, ...photoUrls];

      // Update guitar stage only if not skipping stage update
      if (!skipStageUpdate) {
        // Update stage asynchronously - don't wait for it
        updateGuitarStage(guitar.id, stage.id, currentUser?.uid).catch((error) => {
          console.error("Error updating stage:", error);
        });
      }

      // Add note - message is required, photos are optional
      await addGuitarNote(guitar.id, {
        guitarId: guitar.id,
        stageId: stage.id,
        authorUid: currentUser.uid,
        authorName: currentUser.displayName || currentUser.email || "Staff",
        message: message.trim() || "Update added",
        type: noteType,
        visibleToClient,
        photoUrls: allPhotoUrls.length > 0 ? allPhotoUrls : undefined,
      });

      // Update guitar photo info only if photos were added
      if (allPhotoUrls.length > 0) {
        const coverPhotoUrl = guitar.coverPhotoUrl || allPhotoUrls[0];
        const currentPhotoCount = guitar.photoCount || 0;
        await updateGuitarPhotoInfo(
          guitar.id,
          coverPhotoUrl,
          currentPhotoCount + allPhotoUrls.length
        );
      }

      // Reset form
      setMessage("");
      setNoteType("update");
      setVisibleToClient(true);
      setPhotos([]);
      setPhotoUrls([]);
      setDriveLinkInput("");
      onClose(true);
    } catch (error: any) {
      console.error("Error saving note:", error);
      const errorMessage = error?.message || "Unknown error occurred";
      console.error("Error details:", {
        message: errorMessage,
        code: error?.code,
        stack: error?.stack,
      });
      alert(`Failed to save note: ${errorMessage}. Please check the console for details.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end justify-end">
      <div className="bg-white w-full max-w-md h-full shadow-xl flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Add Note & Photos</h2>
          <button
            onClick={() => onClose(false)}
            className="p-2 hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col p-4">
          <div className="mb-4">
            {skipStageUpdate ? (
              <p className="text-sm text-gray-600 mb-2">
                Adding update for <strong>{guitar.model}</strong> in <strong>{stage.label}</strong>
              </p>
            ) : (
              <>
                <p className="text-sm text-gray-600 mb-2">
                  Moving <strong>{guitar.model}</strong> to <strong>{stage.label}</strong>
                </p>
                {stage.requiresNote && (
                  <p className="text-xs text-orange-600 mb-2">
                    * A note is required for this stage
                  </p>
                )}
              </>
            )}
          </div>

          {/* Update Type */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Update Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: "update" as NoteType, label: "Update", icon: Info },
                { value: "milestone" as NoteType, label: "Milestone", icon: CheckCircle },
                { value: "quality_check" as NoteType, label: "Quality Check", icon: Flag },
                { value: "issue" as NoteType, label: "Issue", icon: AlertCircle },
                { value: "status_change" as NoteType, label: "Status", icon: TrendingUp },
                { value: "general" as NoteType, label: "General", icon: Info },
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setNoteType(value)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all ${
                    noteType === value
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-gray-200 hover:border-gray-300 text-gray-600"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-xs font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4 flex-1">
            <label className="block text-sm font-medium mb-2">
              Note {!skipStageUpdate && stage.requiresNote && <span className="text-red-500">*</span>}
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-2 border rounded-md resize-none h-32"
              placeholder={skipStageUpdate ? "Add an update or note..." : "Add a note about this stage change..."}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Photos <span className="text-xs text-gray-500 font-normal ml-2">(Optional)</span>
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="w-full p-2 border rounded-md mb-2"
            />
            {(photos.length > 0 || photoUrls.length > 0) && (
              <p className="text-xs text-gray-500 mt-1 mb-2">
                {photos.length + photoUrls.length} photo{(photos.length + photoUrls.length) !== 1 ? "s" : ""} selected
              </p>
            )}
            
            {/* Google Drive Link Input */}
            <div className="mt-2">
              <label className="block text-xs font-medium mb-1 text-gray-600">Or add Google Drive folder link</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={driveLinkInput}
                  onChange={(e) => setDriveLinkInput(e.target.value)}
                  placeholder="Paste Google Drive folder link..."
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
                  className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Preview Google Drive links */}
            {photoUrls.length > 0 && (
              <div className="mt-2 space-y-2">
                {photoUrls.map((url, index) => (
                  <div key={index} className="relative group">
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4 text-blue-600" />
                      <span className="text-sm text-blue-700 font-medium flex-1 truncate">
                        Google Drive Folder
                      </span>
                    </a>
                    <button
                      type="button"
                      onClick={() => removePhotoUrl(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={visibleToClient}
                onChange={(e) => setVisibleToClient(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm">Visible to client</span>
            </label>
          </div>

          <div className="flex gap-2 mt-auto">
            <button
              type="button"
              onClick={() => onClose(false)}
              className="flex-1 px-4 py-2 border rounded-md hover:bg-gray-50"
              disabled={isSubmitting}
            >
              Skip
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting || (!message.trim() && photos.length === 0 && photoUrls.length === 0)}
            >
              {isSubmitting ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

