"use client";

import { use } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getGuitar, subscribeGuitarNotes, getRun, subscribeRunStages } from "@/lib/firestore";
import { ArrowLeft, Camera, CheckCircle, Circle, TreePine, Zap, Music, Palette, Settings } from "lucide-react";
import type { GuitarBuild, GuitarNote, RunStage } from "@/types/guitars";

export default function DevGuitarDetailPage({
  params,
}: {
  params: Promise<{ guitarId: string }>;
}) {
  const { guitarId } = use(params);
  const [guitar, setGuitar] = useState<GuitarBuild | null>(null);
  const [notes, setNotes] = useState<GuitarNote[]>([]);
  const [stage, setStage] = useState<RunStage | null>(null);
  const [allStages, setAllStages] = useState<RunStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribeStages: (() => void) | null = null;
    let unsubscribeNotes: (() => void) | null = null;

    const loadGuitar = async () => {
      try {
        const guitarData = await getGuitar(guitarId);
        
        if (!guitarData) {
          setLoading(false);
          return;
        }

        setGuitar(guitarData);

        // Load run and stages
        const run = await getRun(guitarData.runId);
        if (run) {
          unsubscribeStages = subscribeRunStages(guitarData.runId, (stages) => {
            const sortedStages = [...stages].sort((a, b) => a.order - b.order);
            setAllStages(sortedStages);
            const currentStage = sortedStages.find((s) => s.id === guitarData.stageId);
            setStage(currentStage || null);
            setLoading(false);
          });

          // Load notes (only visible to client) - filter in query
          unsubscribeNotes = subscribeGuitarNotes(guitarId, (allNotes) => {
            // Notes are already filtered by visibleToClient in the query
            setNotes(allNotes);
          }, true); // clientOnly=true for dev client view
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error("Error loading guitar:", error);
        setLoading(false);
      }
    };

    loadGuitar();

    return () => {
      if (unsubscribeStages) unsubscribeStages();
      if (unsubscribeNotes) unsubscribeNotes();
    };
  }, [guitarId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!guitar) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Guitar not found</h2>
          <Link href="/dev/client-dashboard" className="text-blue-600 hover:underline">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const clientStatus = stage?.clientStatusLabel || "In Progress";
  
  // Collect all photos
  const allPhotos: string[] = [];
  if (guitar.referenceImages) {
    allPhotos.push(...guitar.referenceImages);
  }
  notes.forEach((note) => {
    if (note.photoUrls) {
      allPhotos.push(...note.photoUrls);
    }
  });
  if (guitar.coverPhotoUrl && !allPhotos.includes(guitar.coverPhotoUrl)) {
    allPhotos.unshift(guitar.coverPhotoUrl);
  }

  // Calculate progress
  const currentStageIndex = allStages.findIndex((s) => s.id === guitar.stageId);
  const progress = allStages.length > 0
    ? Math.round(((currentStageIndex + 1) / allStages.length) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Dev Banner */}
      <div className="bg-yellow-500 text-yellow-900 px-4 py-2 text-center text-sm font-semibold">
        🚧 DEV MODE - No Authentication Required 🚧
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Back Button */}
        <Link
          href="/dev/client-dashboard"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>

        {/* Hero Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cover Photo */}
            <div>
              {guitar.coverPhotoUrl ? (
                <img
                  src={guitar.coverPhotoUrl}
                  alt={guitar.model}
                  className="w-full h-64 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setSelectedImage(guitar.coverPhotoUrl || null)}
                />
              ) : (
                <div className="w-full h-64 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
                  <Camera className="w-16 h-16 text-gray-400" />
                </div>
              )}
            </div>

            {/* Info */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{guitar.model}</h1>
              <p className="text-xl text-gray-600 mb-4">{guitar.finish}</p>
              
              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Order Number</span>
                  <span className="font-semibold text-gray-900">{guitar.orderNumber}</span>
                </div>
                {guitar.serial && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Serial Number</span>
                    <span className="font-semibold text-gray-900">{guitar.serial}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Status</span>
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                    {clientStatus}
                  </span>
                </div>
              </div>

              {/* Progress */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Build Progress</span>
                  <span className="text-sm font-semibold text-blue-600">{progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Build Timeline */}
            {allStages.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Build Timeline</h2>
                  <div className="text-sm text-gray-500">
                    {currentStageIndex + 1} of {allStages.length}
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${((currentStageIndex + 1) / allStages.length) * 100}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                    <span>{Math.round(((currentStageIndex + 1) / allStages.length) * 100)}% Complete</span>
                    <span>{allStages.length - currentStageIndex - 1} stages remaining</span>
                  </div>
                </div>

                <div className="space-y-0">
                  {allStages.map((s, index) => {
                    const isCompleted = index < currentStageIndex;
                    const isCurrent = index === currentStageIndex;
                    const isFuture = currentStageIndex < index;
                    
                    return (
                      <div key={s.id} className="relative">
                        <div className="flex gap-4 pb-6 last:pb-0">
                          {/* Timeline Indicator */}
                          <div className="flex flex-col items-center flex-shrink-0">
                            {isCompleted ? (
                              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center shadow-sm">
                                <CheckCircle className="w-6 h-6 text-white" />
                              </div>
                            ) : isCurrent ? (
                              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center shadow-md ring-4 ring-blue-100">
                                <div className="w-3 h-3 rounded-full bg-white" />
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gray-100 border-2 border-gray-300 flex items-center justify-center">
                                <Circle className="w-5 h-5 text-gray-400" />
                              </div>
                            )}
                            {index < allStages.length - 1 && (
                              <div
                                className={`w-0.5 flex-1 mt-2 ${
                                  isCompleted ? "bg-green-500" : "bg-gray-200"
                                }`}
                                style={{ minHeight: '24px' }}
                              />
                            )}
                          </div>
                          
                          {/* Stage Content */}
                          <div className="flex-1 pt-1">
                            <div
                              className={`font-semibold text-base ${
                                isCurrent
                                  ? "text-blue-600"
                                  : isCompleted
                                  ? "text-green-700"
                                  : "text-gray-400"
                              }`}
                            >
                              {s.clientStatusLabel || s.label}
                            </div>
                            {isCurrent && (
                              <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                Current Stage
                              </div>
                            )}
                            {isCompleted && (
                              <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium">
                                <CheckCircle className="w-3 h-3" />
                                Completed
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Updates Timeline */}
            {notes.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Updates</h2>
                <div className="space-y-6">
                  {notes.map((note) => (
                    <div key={note.id} className="border-l-2 border-blue-500 pl-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-semibold text-gray-900">{note.authorName}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(note.createdAt).toLocaleDateString()} at{" "}
                          {new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-gray-700 mb-3">{note.message}</p>
                      {note.photoUrls && note.photoUrls.length > 0 && (
                        <div className="grid grid-cols-3 gap-2 mt-3">
                          {note.photoUrls.map((url, idx) => (
                            <img
                              key={idx}
                              src={url}
                              alt={`Update ${idx + 1}`}
                              className="w-full h-24 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => setSelectedImage(url)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Reference Images */}
            {guitar.referenceImages && guitar.referenceImages.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold mb-4">Reference Images</h3>
                <div className="grid grid-cols-2 gap-3">
                  {guitar.referenceImages.map((url, idx) => (
                    <img
                      key={idx}
                      src={url}
                      alt={`Reference ${idx + 1}`}
                      className="w-full h-24 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setSelectedImage(url)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Build Specifications */}
            {guitar.specs && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold mb-4">Build Specifications</h3>
                <div className="space-y-3 text-sm">
                  {guitar.specs.bodyWood && (
                    <div className="flex items-center gap-2">
                      <TreePine className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">Body:</span>
                      <span className="font-semibold text-gray-900">{guitar.specs.bodyWood}</span>
                    </div>
                  )}
                  {guitar.specs.topWood && (
                    <div className="flex items-center gap-2">
                      <TreePine className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">Top:</span>
                      <span className="font-semibold text-gray-900">{guitar.specs.topWood}</span>
                    </div>
                  )}
                  {guitar.specs.pickups && (
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">Pickups:</span>
                      <span className="font-semibold text-gray-900">{guitar.specs.pickups}</span>
                    </div>
                  )}
                  {guitar.specs.finishColor && (
                    <div className="flex items-center gap-2">
                      <Palette className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">Color:</span>
                      <span className="font-semibold text-gray-900">{guitar.specs.finishColor}</span>
                    </div>
                  )}
                  {/* Add more specs as needed */}
                </div>
              </div>
            )}

            {/* Photo Gallery */}
            {allPhotos.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold mb-4">Photo Gallery</h3>
                <div className="grid grid-cols-2 gap-3">
                  {allPhotos.map((url, idx) => (
                    <img
                      key={idx}
                      src={url}
                      alt={`Photo ${idx + 1}`}
                      className="w-full h-24 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setSelectedImage(url)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <img
            src={selectedImage}
            alt="Full size"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

