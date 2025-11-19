"use client";

import { useEffect, useState } from "react";
import { useRunStages } from "@/hooks/useRunStages";
import { useRunGuitars } from "@/hooks/useRunGuitars";
import { useRunBoardStore } from "@/store/runBoardStore";
import { updateGuitarStage } from "@/lib/firestore";
import { getRun } from "@/lib/firestore";
import { GuitarCard } from "./GuitarCard";
import { GuitarNoteDrawer } from "@/components/guitars/GuitarNoteDrawer";
import { GuitarDetailModal } from "@/components/guitars/GuitarDetailModal";
import { AddGuitarModal } from "@/components/guitars/AddGuitarModal";
import { ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";
import type { GuitarBuild, RunStage, Run } from "@/types/guitars";

interface RunBoardProps {
  runId: string;
}

export function RunBoard({ runId }: RunBoardProps) {
  const stages = useRunStages(runId);
  const guitars = useRunGuitars(runId);
  const { setStages, setGuitars, moveGuitar } = useRunBoardStore();
  const [draggedGuitar, setDraggedGuitar] = useState<GuitarBuild | null>(null);
  const [targetStage, setTargetStage] = useState<RunStage | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedGuitar, setSelectedGuitar] = useState<GuitarBuild | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAddGuitarModalOpen, setIsAddGuitarModalOpen] = useState(false);
  const [run, setRun] = useState<Run | null>(null);

  useEffect(() => {
    getRun(runId).then(setRun);
  }, [runId]);

  useEffect(() => {
    setStages(stages);
  }, [stages, setStages]);

  useEffect(() => {
    setGuitars(guitars);
  }, [guitars, setGuitars]);

  const handleDragStart = (guitar: GuitarBuild) => {
    setDraggedGuitar(guitar);
  };

  const handleDragOver = (e: React.DragEvent, stage: RunStage) => {
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    target.classList.add("ring-2", "ring-blue-400", "ring-offset-2");
    target.style.backgroundColor = "#eff6ff";
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.classList.remove("ring-2", "ring-blue-400", "ring-offset-2");
    target.style.backgroundColor = "";
  };

  const handleDrop = async (e: React.DragEvent, stage: RunStage) => {
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    target.classList.remove("ring-2", "ring-blue-400", "ring-offset-2");
    target.style.backgroundColor = "";

    if (!draggedGuitar || draggedGuitar.stageId === stage.id) {
      setDraggedGuitar(null);
      return;
    }

    // Optimistic update
    moveGuitar(draggedGuitar.id, stage.id);

    // Check if we need to prompt for note/photo
    if (stage.requiresNote || stage.requiresPhoto) {
      setTargetStage(stage);
      setIsDrawerOpen(true);
    } else {
      // Update Firestore
      await updateGuitarStage(draggedGuitar.id, stage.id);
    }

    setDraggedGuitar(null);
  };

  const handleDrawerClose = async (noteAdded: boolean) => {
    if (draggedGuitar && targetStage && !noteAdded) {
      // If drawer was closed without adding note, still update the stage
      await updateGuitarStage(draggedGuitar.id, targetStage.id);
    }
    setIsDrawerOpen(false);
    setTargetStage(null);
    setDraggedGuitar(null);
  };

  const getGuitarsForStage = (stageId: string): GuitarBuild[] => {
    return guitars.filter((guitar) => guitar.stageId === stageId);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/runs"
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {run?.name || "Loading..."}
              </h1>
              <p className="text-sm text-gray-500">
                {guitars.length} guitar{guitars.length !== 1 ? "s" : ""} in this run
              </p>
            </div>
            <button
              onClick={() => setIsAddGuitarModalOpen(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Guitar
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {run && (
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                run.isActive
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {run.isActive ? "Active" : "Inactive"}
            </span>
          )}
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full p-6 overflow-x-auto">
          <div className="flex gap-4 h-full pb-4">
            {stages.map((stage) => {
              const stageGuitars = getGuitarsForStage(stage.id);
              return (
                <div
                  key={stage.id}
                  className="flex-shrink-0 w-80 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col transition-all duration-200"
                  onDragOver={(e) => handleDragOver(e, stage)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, stage)}
                >
                  {/* Column Header */}
                  <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-base text-gray-900">
                        {stage.label}
                      </h3>
                      {stage.internalOnly && (
                        <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">
                          Internal
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                        {stageGuitars.length}
                      </span>
                      <span className="text-xs text-gray-500">
                        guitar{stageGuitars.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>

                  {/* Cards Container */}
                  <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0 board-scroll">
                    {stageGuitars.length === 0 ? (
                      <div className="text-center py-8 text-gray-400 text-sm">
                        Drop guitars here
                      </div>
                    ) : (
                      stageGuitars.map((guitar) => (
                        <GuitarCard
                          key={guitar.id}
                          guitar={guitar}
                          onDragStart={() => handleDragStart(guitar)}
                          onClick={() => {
                            setSelectedGuitar(guitar);
                            setIsDetailModalOpen(true);
                          }}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {isDrawerOpen && draggedGuitar && targetStage && (
        <GuitarNoteDrawer
          guitar={draggedGuitar}
          stage={targetStage}
          isOpen={isDrawerOpen}
          onClose={handleDrawerClose}
        />
      )}

      {isDetailModalOpen && selectedGuitar && (
        <GuitarDetailModal
          guitar={selectedGuitar}
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedGuitar(null);
          }}
        />
      )}

      {isAddGuitarModalOpen && (
        <AddGuitarModal
          runId={runId}
          isOpen={isAddGuitarModalOpen}
          onClose={() => setIsAddGuitarModalOpen(false)}
          onSuccess={() => {
            // Guitar will appear automatically via subscription
          }}
        />
      )}
    </div>
  );
}

