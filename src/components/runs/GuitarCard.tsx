"use client";

import { Camera } from "lucide-react";
import type { GuitarBuild } from "@/types/guitars";
import { GuitarPhoto } from "@/components/shared/GuitarPhoto";

interface GuitarCardProps {
  guitar: GuitarBuild;
  onDragStart: () => void;
  onClick?: () => void;
}

export function GuitarCard({ guitar, onDragStart, onClick }: GuitarCardProps) {
  const handleClick = (e: React.MouseEvent) => {
    if (e.defaultPrevented) return;
    onClick?.();
  };

  return (
    <div
      draggable
      onDragStart={(e) => {
        onDragStart();
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = "move";
        }
      }}
      onClick={handleClick}
      className="group border border-border bg-surface cursor-pointer transition-colors hover:border-sidebar"
    >
      <GuitarPhoto
        src={guitar.coverPhotoUrl}
        alt={guitar.model}
        size="board"
        fit="contain"
        className="border-0 border-b border-border"
      />

      <div className="p-3 space-y-2">
        <div className="min-w-0">
          <h4 className="font-display text-base font-bold uppercase tracking-wide text-text truncate leading-tight">
            {guitar.model}
          </h4>
          <p className="text-xs text-text-muted truncate mt-0.5">{guitar.finish}</p>
        </div>

        <div className="space-y-1.5 border-t border-border-soft pt-2">
          <div className="flex items-center justify-between text-xs gap-2">
            <span className="wo-label">Order</span>
            <span className="font-mono font-semibold text-text tabular-nums">
              {guitar.orderNumber}
            </span>
          </div>
          <div className="flex flex-col gap-0.5 text-xs">
            <span className="wo-label">Client</span>
            <span
              className="font-medium text-text truncate"
              title={guitar.customerName || undefined}
            >
              {guitar.customerName || "No client assigned"}
            </span>
          </div>
          {guitar.serial && (
            <div className="flex items-center justify-between text-xs gap-2">
              <span className="wo-label">Serial</span>
              <span className="font-mono text-text">{guitar.serial}</span>
            </div>
          )}
        </div>

        {guitar.photoCount && guitar.photoCount > 0 && (
          <div className="pt-2 border-t border-border-soft flex items-center gap-1.5 text-xs text-teal">
            <Camera className="w-3.5 h-3.5" />
            <span className="font-mono font-medium">
              {guitar.photoCount} photo{guitar.photoCount !== 1 ? "s" : ""}
            </span>
          </div>
        )}

        <div className="pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <p className="font-mono text-[10px] uppercase tracking-wider text-text-muted text-center">
            Drag to move
          </p>
        </div>
      </div>
    </div>
  );
}
