"use client";

import { useEffect, useState } from "react";
import { X, Camera, User, Mail, Package, Hash, Calendar, Settings, TreePine, Zap, Music, Palette, Plus, Edit, Image as ImageIcon, ExternalLink, Archive, ArchiveRestore } from "lucide-react";
import { subscribeGuitarNotes, getRun, subscribeRunStages, archiveGuitar, unarchiveGuitar } from "@/lib/firestore";
import { GuitarNoteDrawer } from "./GuitarNoteDrawer";
import { EditGuitarModal } from "./EditGuitarModal";
import { useAuth } from "@/contexts/AuthContext";
import { isGoogleDriveLink } from "@/lib/storage";
import type { GuitarBuild, GuitarNote, RunStage } from "@/types/guitars";

interface GuitarDetailModalProps {
  guitar: GuitarBuild;
  isOpen: boolean;
  onClose: () => void;
}

export function GuitarDetailModal({
  guitar,
  isOpen,
  onClose,
}: GuitarDetailModalProps) {
  const [notes, setNotes] = useState<GuitarNote[]>([]);
  const [stage, setStage] = useState<RunStage | null>(null);
  const [run, setRun] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isNoteDrawerOpen, setIsNoteDrawerOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const { userRole } = useAuth();

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    const unsubscribes: (() => void)[] = [];

    // Load notes (staff/admin see all notes, no filtering needed)
    const unsubscribeNotes = subscribeGuitarNotes(guitar.id, (allNotes) => {
      setNotes(allNotes);
    }, false); // clientOnly=false for staff/admin
    unsubscribes.push(unsubscribeNotes);

    // Load run and stage
    getRun(guitar.runId).then((runData) => {
      setRun(runData);
      if (runData) {
        const unsubscribeStages = subscribeRunStages(guitar.runId, (stages) => {
          const currentStage = stages.find((s) => s.id === guitar.stageId);
          setStage(currentStage || null);
          setLoading(false);
        });
        unsubscribes.push(unsubscribeStages);
      } else {
        setLoading(false);
      }
    });

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [isOpen, guitar.id, guitar.runId, guitar.stageId]);

  if (!isOpen) return null;

  // Collect all photos from notes and reference images
  const allPhotos: string[] = [];
  
  // Add reference images first
  if (guitar.referenceImages && guitar.referenceImages.length > 0) {
    allPhotos.push(...guitar.referenceImages);
  }
  
  // Add photos from notes
  notes.forEach((note) => {
    if (note.photoUrls) {
      allPhotos.push(...note.photoUrls);
    }
  });
  
  // Add cover photo if not already included
  if (guitar.coverPhotoUrl && !allPhotos.includes(guitar.coverPhotoUrl)) {
    allPhotos.unshift(guitar.coverPhotoUrl);
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{guitar.model}</h2>
            <p className="text-gray-600 mt-1">{guitar.finish}</p>
          </div>
          <div className="flex items-center gap-2">
            {(userRole === "staff" || userRole === "admin") && (
              <>
                <button
                  onClick={async () => {
                    if (isArchiving) return;
                    setIsArchiving(true);
                    try {
                      if (guitar.archived) {
                        await unarchiveGuitar(guitar.id);
                      } else {
                        if (confirm(`Are you sure you want to archive "${guitar.model}"? It will be hidden from active views.`)) {
                          await archiveGuitar(guitar.id);
                        }
                      }
                    } catch (error) {
                      console.error("Error archiving guitar:", error);
                      alert("Failed to archive guitar. Please try again.");
                    } finally {
                      setIsArchiving(false);
                    }
                  }}
                  disabled={isArchiving}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    guitar.archived
                      ? "bg-green-600 text-white hover:bg-green-700"
                      : "bg-gray-600 text-white hover:bg-gray-700"
                  } disabled:opacity-50`}
                >
                  {isArchiving ? (
                    "Processing..."
                  ) : guitar.archived ? (
                    <>
                      <ArchiveRestore className="w-4 h-4" />
                      Unarchive
                    </>
                  ) : (
                    <>
                      <Archive className="w-4 h-4" />
                      Archive
                    </>
                  )}
                </button>
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="text-gray-500">Loading details...</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Main Info */}
              <div className="space-y-6">
                {/* Cover Photo */}
                {guitar.coverPhotoUrl && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cover Photo
                    </label>
                    <img
                      src={guitar.coverPhotoUrl}
                      alt={guitar.model}
                      className="w-full h-64 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setSelectedImage(guitar.coverPhotoUrl || null)}
                    />
                  </div>
                )}

                {/* Guitar Details */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Guitar Details
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 flex items-center gap-2">
                        <Hash className="w-4 h-4" />
                        Order Number
                      </span>
                      <span className="font-semibold text-gray-900">
                        {guitar.orderNumber}
                      </span>
                    </div>
                    {guitar.serial && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 flex items-center gap-2">
                          <Hash className="w-4 h-4" />
                          Serial Number
                        </span>
                        <span className="font-mono text-gray-900">
                          {guitar.serial}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Created
                      </span>
                      <span className="text-gray-900">
                        {new Date(guitar.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Last Updated
                      </span>
                      <span className="text-gray-900">
                        {new Date(guitar.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                    {stage && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Current Stage</span>
                        <span className="font-semibold text-blue-600">
                          {stage.label}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Client Information */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Client Information
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Name
                      </span>
                      <span className="font-semibold text-gray-900">
                        {guitar.customerName || "No customer assigned"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Email
                      </span>
                      <a
                        href={guitar.customerEmail ? `mailto:${guitar.customerEmail}` : undefined}
                        className={guitar.customerEmail ? "text-blue-600 hover:text-blue-700 hover:underline" : "text-gray-400"}
                      >
                        {guitar.customerEmail || "No email assigned"}
                      </a>
                    </div>
                  </div>
                </div>

                {/* Build Specifications */}
                {guitar.specs && (
                  <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      Build Specifications
                    </h3>
                    
                    {/* Timber/Wood Section */}
                    {(guitar.specs.bodyWood || guitar.specs.neckWood || guitar.specs.fretboardWood || guitar.specs.topWood) && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                          <TreePine className="w-4 h-4" />
                          Timber & Wood
                        </h4>
                        <div className="space-y-1.5 text-sm">
                          {guitar.specs.bodyWood && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Body</span>
                              <span className="font-medium text-gray-900">{guitar.specs.bodyWood}</span>
                            </div>
                          )}
                          {guitar.specs.topWood && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Top</span>
                              <span className="font-medium text-gray-900">{guitar.specs.topWood}</span>
                            </div>
                          )}
                          {guitar.specs.neckWood && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Neck</span>
                              <span className="font-medium text-gray-900">{guitar.specs.neckWood}</span>
                            </div>
                          )}
                          {guitar.specs.fretboardWood && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Fretboard</span>
                              <span className="font-medium text-gray-900">{guitar.specs.fretboardWood}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Electronics Section */}
                    {(guitar.specs.pickupNeck || guitar.specs.pickupBridge || guitar.specs.pickups || guitar.specs.pickupConfiguration || guitar.specs.controls || guitar.specs.switch) && (
                      <div className="pt-3 border-t border-gray-200">
                        <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                          <Zap className="w-4 h-4" />
                          Electronics
                        </h4>
                        <div className="space-y-1.5 text-sm">
                          {(guitar.specs.pickupNeck || guitar.specs.pickupBridge || guitar.specs.pickups) && (
                            <>
                              {guitar.specs.pickupNeck && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Neck Pickup</span>
                                  <span className="font-medium text-gray-900">{guitar.specs.pickupNeck}</span>
                                </div>
                              )}
                              {guitar.specs.pickupBridge && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Bridge Pickup</span>
                                  <span className="font-medium text-gray-900">{guitar.specs.pickupBridge}</span>
                                </div>
                              )}
                              {/* Legacy support - show old pickups field if new fields aren't set */}
                              {!guitar.specs.pickupNeck && !guitar.specs.pickupBridge && guitar.specs.pickups && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Pickups</span>
                                  <span className="font-medium text-gray-900">{guitar.specs.pickups}</span>
                                </div>
                              )}
                            </>
                          )}
                          {guitar.specs.pickupConfiguration && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Configuration</span>
                              <span className="font-medium text-gray-900">{guitar.specs.pickupConfiguration}</span>
                            </div>
                          )}
                          {guitar.specs.controls && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Controls</span>
                              <span className="font-medium text-gray-900">{guitar.specs.controls}</span>
                            </div>
                          )}
                          {guitar.specs.switch && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Switch</span>
                              <span className="font-medium text-gray-900">{guitar.specs.switch}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Hardware Section */}
                    {(guitar.specs.bridge || guitar.specs.tuners || guitar.specs.nut || guitar.specs.pickguard) && (
                      <div className="pt-3 border-t border-gray-200">
                        <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                          <Settings className="w-4 h-4" />
                          Hardware
                        </h4>
                        <div className="space-y-1.5 text-sm">
                          {guitar.specs.bridge && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Bridge</span>
                              <span className="font-medium text-gray-900">{guitar.specs.bridge}</span>
                            </div>
                          )}
                          {guitar.specs.tuners && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Tuners</span>
                              <span className="font-medium text-gray-900">{guitar.specs.tuners}</span>
                            </div>
                          )}
                          {guitar.specs.nut && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Nut</span>
                              <span className="font-medium text-gray-900">{guitar.specs.nut}</span>
                            </div>
                          )}
                          {guitar.specs.pickguard && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Pickguard</span>
                              <span className="font-medium text-gray-900">{guitar.specs.pickguard}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Strings & Setup Section */}
                    {(guitar.specs.strings || guitar.specs.stringGauge || guitar.specs.scaleLength || guitar.specs.action) && (
                      <div className="pt-3 border-t border-gray-200">
                        <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                          <Music className="w-4 h-4" />
                          Strings & Setup
                        </h4>
                        <div className="space-y-1.5 text-sm">
                          {guitar.specs.strings && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Strings</span>
                              <span className="font-medium text-gray-900">{guitar.specs.strings}</span>
                            </div>
                          )}
                          {guitar.specs.stringGauge && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Gauge</span>
                              <span className="font-medium text-gray-900">{guitar.specs.stringGauge}</span>
                            </div>
                          )}
                          {guitar.specs.scaleLength && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Scale Length</span>
                              <span className="font-medium text-gray-900">{guitar.specs.scaleLength}</span>
                            </div>
                          )}
                          {guitar.specs.action && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Action</span>
                              <span className="font-medium text-gray-900">{guitar.specs.action}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Finish & Appearance Section */}
                    {(guitar.specs.finishColor || guitar.specs.finishType || guitar.specs.binding || guitar.specs.inlays) && (
                      <div className="pt-3 border-t border-gray-200">
                        <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                          <Palette className="w-4 h-4" />
                          Finish & Appearance
                        </h4>
                        <div className="space-y-1.5 text-sm">
                          {guitar.specs.finishColor && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Color</span>
                              <span className="font-medium text-gray-900">{guitar.specs.finishColor}</span>
                            </div>
                          )}
                          {guitar.specs.finishType && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Finish Type</span>
                              <span className="font-medium text-gray-900">{guitar.specs.finishType}</span>
                            </div>
                          )}
                          {guitar.specs.binding && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Binding</span>
                              <span className="font-medium text-gray-900">{guitar.specs.binding}</span>
                            </div>
                          )}
                          {guitar.specs.inlays && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Inlays</span>
                              <span className="font-medium text-gray-900">{guitar.specs.inlays}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Neck Details Section */}
                    {(guitar.specs.frets || guitar.specs.neckProfile || guitar.specs.radius) && (
                      <div className="pt-3 border-t border-gray-200">
                        <h4 className="text-xs font-semibold text-gray-700 mb-2">Neck Details</h4>
                        <div className="space-y-1.5 text-sm">
                          {guitar.specs.frets && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Frets</span>
                              <span className="font-medium text-gray-900">{guitar.specs.frets}</span>
                            </div>
                          )}
                          {guitar.specs.neckProfile && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Profile</span>
                              <span className="font-medium text-gray-900">{guitar.specs.neckProfile}</span>
                            </div>
                          )}
                          {guitar.specs.radius && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Radius</span>
                              <span className="font-medium text-gray-900">{guitar.specs.radius}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Custom Notes */}
                    {guitar.specs.customNotes && (
                      <div className="pt-3 border-t border-gray-200">
                        <h4 className="text-xs font-semibold text-gray-700 mb-2">Custom Notes</h4>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{guitar.specs.customNotes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column - Photos & Notes */}
              <div className="space-y-6">
                {/* Reference Images */}
                {guitar.referenceImages && guitar.referenceImages.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                      <ImageIcon className="w-5 h-5" />
                      Reference Images ({guitar.referenceImages.length})
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      Initial reference images uploaded when creating this guitar
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {guitar.referenceImages.map((url, idx) => {
                        const isDriveLink = isGoogleDriveLink(url);
                        if (isDriveLink) {
                          return (
                            <a
                              key={idx}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                            >
                              <ExternalLink className="w-4 h-4 text-blue-600" />
                              <span className="text-sm text-blue-700 font-medium">
                                Google Drive Folder
                              </span>
                            </a>
                          );
                        }
                        return (
                          <img
                            key={idx}
                            src={url}
                            alt={`Reference ${idx + 1}`}
                            className="w-full h-32 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => setSelectedImage(url)}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* All Photos */}
                {allPhotos.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                      <Camera className="w-5 h-5" />
                      All Photos ({allPhotos.length})
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {allPhotos.map((url, idx) => {
                        const isDriveLink = isGoogleDriveLink(url);
                        if (isDriveLink) {
                          return (
                            <a
                              key={idx}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                            >
                              <ExternalLink className="w-4 h-4 text-blue-600" />
                              <span className="text-sm text-blue-700 font-medium">
                                Google Drive Folder
                              </span>
                            </a>
                          );
                        }
                        return (
                          <img
                            key={idx}
                            src={url}
                            alt={`Photo ${idx + 1}`}
                            className="w-full h-32 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => setSelectedImage(url)}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Notes Timeline */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Notes & Updates ({notes.length})
                    </label>
                    {stage && (
                      <button
                        onClick={() => setIsNoteDrawerOpen(true)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Add Update
                      </button>
                    )}
                  </div>
                  {notes.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm bg-gray-50 rounded-lg">
                      <p className="mb-3">No notes yet</p>
                      {stage && (
                        <button
                          onClick={() => setIsNoteDrawerOpen(true)}
                          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                        >
                          Add First Update
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {notes
                        .sort((a, b) => b.createdAt - a.createdAt)
                        .map((note) => (
                          <div
                            key={note.id}
                            className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-500"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <span className="font-semibold text-gray-900">
                                  {note.authorName}
                                </span>
                                {note.visibleToClient && (
                                  <span className="ml-2 text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded-full">
                                    Client Visible
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-gray-500">
                                {new Date(note.createdAt).toLocaleDateString()}{" "}
                                {new Date(note.createdAt).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 mb-2">
                              {note.message}
                            </p>
                            {note.photoUrls && note.photoUrls.length > 0 && (
                              <div className="grid grid-cols-3 gap-2 mt-3">
                                {note.photoUrls.map((url, idx) => {
                                  const isDriveLink = isGoogleDriveLink(url);
                                  if (isDriveLink) {
                                    return (
                                      <a
                                        key={idx}
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                                      >
                                        <ExternalLink className="w-4 h-4 text-blue-600" />
                                        <span className="text-xs text-blue-700 font-medium">
                                          Google Drive Folder
                                        </span>
                                      </a>
                                    );
                                  }
                                  return (
                                    <img
                                      key={idx}
                                      src={url}
                                      alt={`Note photo ${idx + 1}`}
                                      className="w-full h-20 object-cover rounded border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                                      onClick={() => setSelectedImage(url)}
                                    />
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Image Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-60 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 text-white hover:text-gray-300"
          >
            <X className="w-8 h-8" />
          </button>
          <img
            src={selectedImage}
            alt="Full size"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Note Drawer for adding updates in current stage */}
      {isNoteDrawerOpen && stage && (
        <GuitarNoteDrawer
          guitar={guitar}
          stage={stage}
          isOpen={isNoteDrawerOpen}
          onClose={(noteAdded) => {
            setIsNoteDrawerOpen(false);
            // Notes will automatically refresh via subscription
          }}
          skipStageUpdate={true}
        />
      )}

      {/* Edit Guitar Modal */}
      {isEditModalOpen && (
        <EditGuitarModal
          guitar={guitar}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={() => {
            // Guitar data will automatically refresh via subscription
            setIsEditModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

