"use client";

import { Camera } from "lucide-react";
import type { GuitarBuild } from "@/types/guitars";

interface GuitarCardProps {
  guitar: GuitarBuild;
  onDragStart: () => void;
  onClick?: () => void;
}

export function GuitarCard({ guitar, onDragStart, onClick }: GuitarCardProps) {
  const handleClick = (e: React.MouseEvent) => {
    // Don't open modal if dragging
    if (e.defaultPrevented) return;
    onClick?.();
  };

  return (
    <div
      draggable
      onDragStart={(e) => {
        onDragStart();
        // Prevent click when dragging
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={handleClick}
      className="group bg-white rounded-lg shadow-sm p-4 cursor-pointer hover:shadow-lg transition-all duration-200 border border-gray-200 hover:border-blue-300 hover:-translate-y-0.5"
    >
      {/* Header with Image */}
      <div className="flex items-start gap-3 mb-3">
        {guitar.coverPhotoUrl ? (
          <img
            src={guitar.coverPhotoUrl}
            alt={guitar.model}
            className="w-16 h-16 object-cover rounded-lg flex-shrink-0 border border-gray-200"
          />
        ) : (
          <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex-shrink-0 flex items-center justify-center">
            <span className="text-2xl">🎸</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-sm text-gray-900 mb-0.5 truncate">
            {guitar.model}
          </h4>
          <p className="text-xs text-gray-600 font-medium">{guitar.finish}</p>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2 border-t border-gray-100 pt-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Order</span>
          <span className="font-semibold text-gray-900">{guitar.orderNumber}</span>
        </div>
        <div className="flex flex-col gap-0.5 text-xs">
          <span className="text-gray-500">Client</span>
          <span className="font-semibold text-gray-900 truncate" title={guitar.customerName || undefined}>
            {guitar.customerName || "No client assigned"}
          </span>
        </div>
        {guitar.serial && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Serial</span>
            <span className="font-mono text-gray-700">{guitar.serial}</span>
          </div>
        )}
      </div>

      {/* Photo Count Badge */}
      {guitar.photoCount && guitar.photoCount > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-1.5 text-xs text-blue-600">
          <Camera className="w-3.5 h-3.5" />
          <span className="font-medium">
            {guitar.photoCount} photo{guitar.photoCount !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Drag Indicator */}
      <div className="mt-3 pt-3 border-t border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-xs text-gray-400 text-center">Drag to move</p>
      </div>
    </div>
  );
}

