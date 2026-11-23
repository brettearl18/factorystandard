"use client";

import { useState } from "react";
import { X, Send, Upload, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { addGuitarNote, updateGuitarPhotoInfo } from "@/lib/firestore";
import { uploadGuitarPhoto } from "@/lib/storage";
import { getNoteTypeLabel } from "@/utils/noteTypes";
import type { GuitarBuild, NoteType } from "@/types/guitars";

const NOTE_TYPES: NoteType[] = [
  "update",
  "milestone",
  "quality_check",
  "issue",
  "status_change",
  "general",
];

interface BulkGuitarUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  guitars: GuitarBuild[];
  onSuccess?: () => void;
}

export function BulkGuitarUpdateModal({
  isOpen,
  onClose,
  guitars,
  onSuccess,
}: BulkGuitarUpdateModalProps) {
  const { currentUser } = useAuth();
  const [message, setMessage] = useState("");
  const [noteType, setNoteType] = useState<NoteType>("update");
  const [visibleToClient, setVisibleToClient] = useState(true);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [shareLinks, setShareLinks] = useState<string[]>([]);
  const [shareLinkInput, setShareLinkInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetForm = () => {
    setMessage("");
    setNoteType("update");
    setVisibleToClient(true);
    setPhotos([]);
    setPhotoPreviews([]);
    setShareLinks([]);
    setShareLinkInput("");
    setProgress({ done: 0, total: 0 });
    setError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files).filter((f) => f.type.startsWith("image/"));
    setPhotos((prev) => [...prev, ...newFiles].slice(0, 10));
    newFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          setPhotoPreviews((prev) => [...prev, reader.result as string].slice(0, 10));
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const addShareLink = () => {
    const link = shareLinkInput.trim();
    if (!link) return;
    setShareLinks((prev) => [...prev, link]);
    setShareLinkInput("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || guitars.length === 0) return;
    if (!message.trim() && photos.length === 0 && shareLinks.length === 0) {
      setError("Add a message or at least one image / link.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setProgress({ done: 0, total: guitars.length });

    const authorName = currentUser.displayName || currentUser.email || "Staff";
    const failures: string[] = [];

    try {
      // Upload images once (to the first guitar path), then reuse URLs on every note
      const uploadedUrls: string[] = [];
      if (photos.length > 0) {
        const host = guitars[0];
        for (const photo of photos) {
          // Ensure a content type so Storage rules accept WhatsApp / untitled files
          const typed =
            photo.type && photo.type.startsWith("image/")
              ? photo
              : new File([photo], photo.name.replace(/\s+/g, "_"), {
                  type: "image/jpeg",
                  lastModified: photo.lastModified,
                });
          const url = await uploadGuitarPhoto(host.id, host.stageId, typed);
          uploadedUrls.push(url);
        }
      }
      const allPhotoUrls = [...uploadedUrls, ...shareLinks];

      for (let i = 0; i < guitars.length; i++) {
        const guitar = guitars[i];
        try {
          await addGuitarNote(guitar.id, {
            guitarId: guitar.id,
            stageId: guitar.stageId,
            authorUid: currentUser.uid,
            authorName,
            message: message.trim() || "Update added",
            type: noteType,
            visibleToClient,
            photoUrls: allPhotoUrls.length > 0 ? allPhotoUrls : undefined,
          });

          if (uploadedUrls.length > 0 && !guitar.coverPhotoUrl) {
            const currentPhotoCount = guitar.photoCount || 0;
            await updateGuitarPhotoInfo(
              guitar.id,
              uploadedUrls[0],
              currentPhotoCount + uploadedUrls.length
            ).catch(() => {});
          }
        } catch (err) {
          console.error(`Bulk update failed for ${guitar.id}:`, err);
          failures.push(guitar.model || guitar.orderNumber || guitar.id);
        }
        setProgress({ done: i + 1, total: guitars.length });
      }

      if (failures.length > 0) {
        setError(
          `Posted to ${guitars.length - failures.length}/${guitars.length}. Failed: ${failures.join(", ")}`
        );
        return;
      }

      resetForm();
      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error("Bulk update error:", err);
      setError(err?.message || "Failed to post bulk update.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-surface shadow-modal w-full max-w-xl max-h-[90vh] flex flex-col border border-border">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-sidebar text-text-onDark">
          <div>
            <h2 className="font-display text-xl font-bold uppercase tracking-wide">
              Bulk guitar update
            </h2>
            <p className="font-mono text-[11px] uppercase tracking-wider text-text-onDark/60 mt-1">
              Posts the same update to {guitars.length} selected guitar
              {guitars.length === 1 ? "" : "s"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!isSubmitting) {
                resetForm();
                onClose();
              }
            }}
            className="p-2 hover:bg-white/10 text-text-onDark"
            disabled={isSubmitting}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-900">
            This adds a note on each selected guitar (Notes & Updates). It is not a single
            run-wide announcement.
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Type</label>
            <div className="flex flex-wrap gap-1.5">
              {NOTE_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setNoteType(t)}
                  disabled={isSubmitting}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                    noteType === t
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {getNoteTypeLabel(t)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Message <span className="text-red-500">*</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              disabled={isSubmitting}
              placeholder="Update message for all selected guitars…"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/40 resize-y"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={visibleToClient}
              onChange={(e) => setVisibleToClient(e.target.checked)}
              disabled={isSubmitting}
              className="rounded border-slate-300 text-accent focus:ring-accent/30"
            />
            Visible to clients
          </label>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Images (optional — uploaded to each guitar)
            </label>
            {photoPreviews.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-2">
                {photoPreviews.map((preview, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-20 object-cover rounded-xl border border-slate-200"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      disabled={isSubmitting}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <label className="cursor-pointer block">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="hidden"
                disabled={isSubmitting || photos.length >= 10}
              />
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-3 text-center hover:border-accent/40 hover:bg-accent/5">
                <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                <p className="text-sm text-slate-600">Click to add images ({photos.length}/10)</p>
              </div>
            </label>
            <div className="mt-2 flex gap-2">
              <input
                type="url"
                value={shareLinkInput}
                onChange={(e) => setShareLinkInput(e.target.value)}
                placeholder="Or paste Drive / Dropbox link…"
                disabled={isSubmitting}
                className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl"
              />
              <button
                type="button"
                onClick={addShareLink}
                disabled={isSubmitting || !shareLinkInput.trim()}
                className="px-3 py-2 text-sm rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
              >
                Add link
              </button>
            </div>
            {shareLinks.length > 0 && (
              <ul className="mt-2 space-y-1">
                {shareLinks.map((link, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs text-slate-600">
                    <span className="truncate flex-1">{link}</span>
                    <button
                      type="button"
                      onClick={() => setShareLinks((prev) => prev.filter((_, idx) => idx !== i))}
                      disabled={isSubmitting}
                      className="text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {isSubmitting && (
            <p className="text-sm text-slate-600">
              Posting… {progress.done}/{progress.total}
            </p>
          )}
        </form>

        <div className="flex justify-end gap-3 px-5 py-4 border-t border-border bg-surface-alt">
          <button
            type="button"
            onClick={() => {
              resetForm();
              onClose();
            }}
            disabled={isSubmitting}
            className="wo-btn-outline"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              (!message.trim() && photos.length === 0 && shareLinks.length === 0)
            }
            className="wo-btn-primary"
          >
            <Send className="w-4 h-4" />
            {isSubmitting
              ? `Posting ${progress.done}/${progress.total}…`
              : `Post to ${guitars.length} guitar${guitars.length === 1 ? "" : "s"}`}
          </button>
        </div>
      </div>
    </div>
  );
}
