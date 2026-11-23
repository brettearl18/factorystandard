"use client";

import { useEffect, useState, useMemo } from "react";
import { useRunStages } from "@/hooks/useRunStages";
import { useRunGuitars } from "@/hooks/useRunGuitars";
import { useClientDisplayNames } from "@/hooks/useClientDisplayNames";
import { useRunBoardStore } from "@/store/runBoardStore";
import { useAuth } from "@/contexts/AuthContext";
import { updateGuitarStage } from "@/lib/firestore";
import { getRun } from "@/lib/firestore";
import { GuitarCard } from "./GuitarCard";
import { GuitarNoteDrawer } from "@/components/guitars/GuitarNoteDrawer";
import { GuitarDetailModal } from "@/components/guitars/GuitarDetailModal";
import { AddGuitarModal } from "@/components/guitars/AddGuitarModal";
import { RunUpdateModal } from "./RunUpdateModal";
import { ArrowLeft, Plus, DollarSign, MessageSquare } from "lucide-react";
import Link from "next/link";
import type { GuitarBuild, RunStage, Run } from "@/types/guitars";

interface RunBoardProps {
  runId: string;
}

export function RunBoard({ runId }: RunBoardProps) {
  const { currentUser } = useAuth();
  const stages = useRunStages(runId);
  const guitars = useRunGuitars(runId);
  const clientUidsNeedingNames = useMemo(
    () => guitars.filter((g) => g.clientUid && !g.customerName?.trim()).map((g) => g.clientUid!),
    [guitars]
  );
  const clientDisplayNames = useClientDisplayNames(clientUidsNeedingNames);
  const guitarsWithClientNames = useMemo(
    () =>
      guitars.map((g) =>
        g.clientUid && !g.customerName?.trim() && clientDisplayNames[g.clientUid]
          ? { ...g, customerName: clientDisplayNames[g.clientUid] }
          : g
      ),
    [guitars, clientDisplayNames]
  );
  const { setStages, setGuitars, moveGuitar } = useRunBoardStore();
  const [draggedGuitar, setDraggedGuitar] = useState<GuitarBuild | null>(null);
  const [targetStage, setTargetStage] = useState<RunStage | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedGuitar, setSelectedGuitar] = useState<GuitarBuild | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAddGuitarModalOpen, setIsAddGuitarModalOpen] = useState(false);
  const [isRunUpdateModalOpen, setIsRunUpdateModalOpen] = useState(false);
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

  const guitarsForBoard = guitarsWithClientNames;

  const handleDragStart = (guitar: GuitarBuild) => {
    setDraggedGuitar(guitar);
  };

  const handleDragOver = (e: React.DragEvent, stage: RunStage) => {
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    target.classList.add("ring-2", "ring-accent", "ring-offset-1");
    target.style.backgroundColor = "rgba(242, 194, 48, 0.12)";
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.classList.remove("ring-2", "ring-accent", "ring-offset-1");
    target.style.backgroundColor = "";
  };

  const handleDrop = async (e: React.DragEvent, stage: RunStage) => {
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    target.classList.remove("ring-2", "ring-accent", "ring-offset-1");
    target.style.backgroundColor = "";

    if (!draggedGuitar || draggedGuitar.stageId === stage.id) {
      setDraggedGuitar(null);
      return;
    }

    // Store the dragged guitar and target stage
    setTargetStage(stage);
    setIsDrawerOpen(true);
    // Don't clear draggedGuitar yet - we need it for the drawer

    // Optimistic update happens in the drawer when saved
  };

  const handleDrawerClose = async (noteAdded: boolean) => {
    if (draggedGuitar && targetStage) {
      if (noteAdded) {
        // Optimistic update - stage was already updated in the drawer
        moveGuitar(draggedGuitar.id, targetStage.id);
      } else {
        // User skipped - update stage without note
        moveGuitar(draggedGuitar.id, targetStage.id);
        updateGuitarStage(draggedGuitar.id, targetStage.id, currentUser?.uid).catch((error) => {
          console.error("Error updating stage:", error);
        });
      }
    }
    setIsDrawerOpen(false);
    setTargetStage(null);
    setDraggedGuitar(null);
  };

  const getGuitarsForStage = (stageId: string): GuitarBuild[] => {
    return guitarsForBoard.filter((guitar) => guitar.stageId === stageId);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <Link
            href="/runs"
            className="mt-1 p-2 text-text-muted hover:bg-surface hover:text-text border border-transparent hover:border-border transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="wo-heading truncate text-[28px] sm:text-[36px] leading-none">
              {run?.name || "Loading…"}
            </h1>
            <p className="font-mono text-[11px] uppercase tracking-wider text-text-muted mt-1.5">
              {guitarsForBoard.length} guitar{guitarsForBoard.length !== 1 ? "s" : ""} in this run
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {run && (
            <span
              className={
                run.isActive ? "wo-badge-accent" : "wo-badge-muted"
              }
            >
              {run.isActive ? "Active" : "Inactive"}
            </span>
          )}
          <Link
            href={`/runs/${runId}/financials`}
            className="wo-btn-outline text-teal border-teal/40"
            title="Financial report for this run"
          >
            <DollarSign className="w-4 h-4" />
            Financial report
          </Link>
          <button
            type="button"
            onClick={() => setIsRunUpdateModalOpen(true)}
            className="wo-btn-outline"
            title="Send update to all clients in this run"
          >
            <MessageSquare className="w-4 h-4" />
            Run update
          </button>
          <button
            type="button"
            onClick={() => setIsAddGuitarModalOpen(true)}
            className="wo-btn-primary"
          >
            <Plus className="w-4 h-4" />
            Add guitar
          </button>
        </div>
      </div>

      <div className="overflow-x-auto pb-2 -mx-2 px-2 sm:mx-0 sm:px-0">
        <div className="flex gap-3 min-h-[calc(100vh-14rem)] pb-4">
            {stages.map((stage) => {
              const stageGuitars = getGuitarsForStage(stage.id);
              return (
                <div
                  key={stage.id}
                  className="flex-shrink-0 w-72 sm:w-80 border border-border bg-surface-alt flex flex-col"
                  onDragOver={(e) => handleDragOver(e, stage)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, stage)}
                >
                  <div className="px-3 py-3 border-b border-border bg-sidebar text-text-onDark">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-display text-sm font-bold uppercase tracking-wide leading-snug">
                        {stage.label}
                      </h3>
                      <div className="flex flex-wrap items-center justify-end gap-1">
                        {stage.invoiceSchedule?.enabled && (
                          <span
                            className="inline-flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 bg-teal/25 text-text-onDark border border-teal/40 font-medium"
                            title={`Invoice: ${stage.invoiceSchedule.currency || "AUD"} ${stage.invoiceSchedule.amount}`}
                          >
                            <DollarSign className="w-3 h-3" />
                            {stage.invoiceSchedule.currency || "AUD"} {stage.invoiceSchedule.amount}
                          </span>
                        )}
                        {stage.internalOnly && (
                          <span className="font-mono text-[10px] px-1.5 py-0.5 bg-accent text-accent-foreground font-semibold uppercase">
                            Internal
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="inline-flex items-center justify-center min-w-[1.75rem] h-6 px-1.5 bg-accent text-accent-foreground font-display text-sm font-bold tabular-nums">
                        {stageGuitars.length}
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-text-onDark/60">
                        guitar{stageGuitars.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto px-2.5 py-2.5 space-y-2.5 min-h-[120px] board-scroll">
                    {stageGuitars.length === 0 ? (
                      <div className="text-center py-8 text-text-muted text-sm border border-dashed border-border">
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

      {isRunUpdateModalOpen && run && (
        <RunUpdateModal
          isOpen={isRunUpdateModalOpen}
          onClose={() => setIsRunUpdateModalOpen(false)}
          run={run}
          clientCount={new Set(guitarsForBoard.map((g) => g.clientUid).filter((uid): uid is string => !!uid)).size}
        />
      )}
    </div>
  );
}

