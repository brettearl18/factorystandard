// Mobile Guitar Details Component
import { useEffect, useState } from "react";
import { ArrowLeft, Camera, Info, FileText, TreePine, Zap, Settings, Palette, Clock, ChevronRight } from "lucide-react";
import { subscribeGuitarNotes } from "@/lib/firestore";
import { getNoteTypeLabel, getNoteTypeIcon, getNoteTypeColor } from "@/utils/noteTypes";
import type { GuitarBuild, GuitarNote, RunStage } from "@/types/guitars";

interface MobileGuitarDetailsViewProps {
  guitar: GuitarBuild;
  stages: RunStage[];
  onClose: () => void;
  onUpdate: () => void;
}

export function MobileGuitarDetailsView({ guitar, stages, onClose, onUpdate }: MobileGuitarDetailsViewProps) {
  const [notes, setNotes] = useState<GuitarNote[]>([]);
  const [loading, setLoading] = useState(true);
  const currentStage = stages.find(s => s.id === guitar.stageId);

  useEffect(() => {
    const unsubscribe = subscribeGuitarNotes(guitar.id, (loadedNotes) => {
      setNotes(loadedNotes.sort((a, b) => b.createdAt - a.createdAt));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [guitar.id]);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-4 flex items-center gap-3">
          <button onClick={onClose} className="p-2 -ml-2">
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900 truncate">{guitar.model}</h1>
            <p className="text-sm text-gray-500">{guitar.finish}</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-4">
        {/* Current Stage */}
        {currentStage && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-600 font-medium mb-1">Current Stage</p>
                <p className="text-lg font-semibold text-blue-900">{currentStage.label}</p>
              </div>
              <div className="bg-blue-100 rounded-full p-3">
                <Info className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
        )}

        {/* Order Info */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Order Information
          </h3>
          <div className="space-y-2 text-sm">
            {guitar.orderNumber && (
              <div className="flex justify-between">
                <span className="text-gray-600">Order Number:</span>
                <span className="font-medium text-gray-900">{guitar.orderNumber}</span>
              </div>
            )}
            {guitar.customerName && (
              <div className="flex justify-between">
                <span className="text-gray-600">Customer:</span>
                <span className="font-medium text-gray-900">{guitar.customerName}</span>
              </div>
            )}
            {guitar.customerEmail && (
              <div className="flex justify-between">
                <span className="text-gray-600">Email:</span>
                <span className="font-medium text-gray-900 text-xs">{guitar.customerEmail}</span>
              </div>
            )}
          </div>
        </div>

        {/* Build Specifications */}
        {guitar.specs && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Build Specifications
            </h3>
            <div className="space-y-3 text-sm">
              {/* Timber & Wood */}
              {(guitar.specs.bodyWood || guitar.specs.neckWood || guitar.specs.fretboardWood || guitar.specs.topWood) && (
                <div>
                  <div className="flex items-center gap-2 text-gray-700 font-medium mb-2">
                    <TreePine className="w-4 h-4" />
                    Timber & Wood
                  </div>
                  <div className="space-y-1 pl-6">
                    {guitar.specs.bodyWood && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Body:</span>
                        <span className="text-gray-900 font-medium">{guitar.specs.bodyWood}</span>
                      </div>
                    )}
                    {guitar.specs.topWood && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Top:</span>
                        <span className="text-gray-900 font-medium">{guitar.specs.topWood}</span>
                      </div>
                    )}
                    {guitar.specs.neckWood && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Neck:</span>
                        <span className="text-gray-900 font-medium">{guitar.specs.neckWood}</span>
                      </div>
                    )}
                    {guitar.specs.fretboardWood && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Fretboard:</span>
                        <span className="text-gray-900 font-medium">{guitar.specs.fretboardWood}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Electronics */}
              {(guitar.specs.pickups || guitar.specs.pickupNeck || guitar.specs.pickupBridge || guitar.specs.controls) && (
                <div>
                  <div className="flex items-center gap-2 text-gray-700 font-medium mb-2">
                    <Zap className="w-4 h-4" />
                    Electronics
                  </div>
                  <div className="space-y-1 pl-6">
                    {guitar.specs.pickups && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Pickups:</span>
                        <span className="text-gray-900 font-medium">{guitar.specs.pickups}</span>
                      </div>
                    )}
                    {guitar.specs.pickupNeck && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Neck Pickup:</span>
                        <span className="text-gray-900 font-medium">{guitar.specs.pickupNeck}</span>
                      </div>
                    )}
                    {guitar.specs.pickupBridge && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Bridge Pickup:</span>
                        <span className="text-gray-900 font-medium">{guitar.specs.pickupBridge}</span>
                      </div>
                    )}
                    {guitar.specs.controls && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Controls:</span>
                        <span className="text-gray-900 font-medium">{guitar.specs.controls}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Hardware */}
              {(guitar.specs.bridge || guitar.specs.tuners || guitar.specs.nut) && (
                <div>
                  <div className="flex items-center gap-2 text-gray-700 font-medium mb-2">
                    <Settings className="w-4 h-4" />
                    Hardware
                  </div>
                  <div className="space-y-1 pl-6">
                    {guitar.specs.bridge && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Bridge:</span>
                        <span className="text-gray-900 font-medium">{guitar.specs.bridge}</span>
                      </div>
                    )}
                    {guitar.specs.tuners && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Tuners:</span>
                        <span className="text-gray-900 font-medium">{guitar.specs.tuners}</span>
                      </div>
                    )}
                    {guitar.specs.nut && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Nut:</span>
                        <span className="text-gray-900 font-medium">{guitar.specs.nut}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Finish */}
              {(guitar.specs.finishColor || guitar.specs.finishType) && (
                <div>
                  <div className="flex items-center gap-2 text-gray-700 font-medium mb-2">
                    <Palette className="w-4 h-4" />
                    Finish
                  </div>
                  <div className="space-y-1 pl-6">
                    {guitar.specs.finishColor && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Color:</span>
                        <span className="text-gray-900 font-medium">{guitar.specs.finishColor}</span>
                      </div>
                    )}
                    {guitar.specs.finishType && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Type:</span>
                        <span className="text-gray-900 font-medium">{guitar.specs.finishType}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Custom Notes */}
              {guitar.specs.customNotes && (
                <div className="pt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">Custom Notes:</p>
                  <p className="text-sm text-gray-900">{guitar.specs.customNotes}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reference Images */}
        {guitar.referenceImages && guitar.referenceImages.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Reference Images
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {guitar.referenceImages.slice(0, 4).map((img, idx) => (
                <div key={idx} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                  <img
                    src={img}
                    alt={`Reference ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes History */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Notes & Updates
          </h3>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading notes...</div>
          ) : notes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No notes yet</div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {notes.map((note) => {
                const NoteIcon = getNoteTypeIcon(note.type);
                const noteColor = getNoteTypeColor(note.type);
                const noteStage = stages.find(s => s.id === note.stageId);

                return (
                  <div key={note.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-start gap-2 mb-2">
                      <div className={`p-1.5 rounded ${noteColor}`}>
                        <NoteIcon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded ${noteColor}`}>
                            {getNoteTypeLabel(note.type)}
                          </span>
                          {noteStage && (
                            <span className="text-xs text-gray-500">• {noteStage.label}</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-900">{note.message}</p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          <span>{formatDate(note.createdAt)}</span>
                          {note.authorName && (
                            <>
                              <span>•</span>
                              <span>{note.authorName}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    {note.photoUrls && note.photoUrls.length > 0 && (
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {note.photoUrls.map((photoUrl, idx) => (
                          <div key={idx} className="relative aspect-square rounded overflow-hidden bg-gray-100">
                            <img
                              src={photoUrl}
                              alt={`Note photo ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Update Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-20">
        <button
          onClick={onUpdate}
          className="w-full py-4 bg-blue-600 text-white rounded-lg font-semibold text-lg flex items-center justify-center gap-2"
        >
          <Camera className="w-5 h-5" />
          Update with Photo
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

