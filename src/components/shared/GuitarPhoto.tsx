"use client";

import { useState } from "react";
import { Guitar } from "lucide-react";

type GuitarPhotoSize = "thumb" | "card" | "hero" | "board";

const SIZE_CLASSES: Record<GuitarPhotoSize, string> = {
  thumb: "w-12 h-16",
  card: "w-full h-44",
  board: "w-full h-[160px]",
  hero: "w-full h-64 sm:h-80",
};

interface GuitarPhotoProps {
  src?: string | null;
  alt: string;
  size?: GuitarPhotoSize;
  className?: string;
  /** Prefer contain for whole-guitar packshots (default). Cover for tight crops. */
  fit?: "contain" | "cover";
  priority?: boolean;
}

/**
 * Renders a guitar record photo from existing media fields (typically coverPhotoUrl).
 * Falls back to a labelled neutral placeholder — never invents or hotlinks demo images.
 */
export function GuitarPhoto({
  src,
  alt,
  size = "thumb",
  className = "",
  fit = "contain",
  priority = false,
}: GuitarPhotoProps) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src?.trim()) && !failed;

  return (
    <div
      className={`relative overflow-hidden border border-border bg-surface-alt ${SIZE_CLASSES[size]} ${className}`}
      style={{ borderRadius: 2 }}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src!}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onError={() => setFailed(true)}
          className={`absolute inset-0 h-full w-full ${
            fit === "cover" ? "object-cover" : "object-contain"
          }`}
        />
      ) : (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-2 text-center"
          role="img"
          aria-label="No guitar photo yet"
        >
          <Guitar className="h-6 w-6 text-text-muted/60" aria-hidden />
          <span className="font-mono text-[9px] uppercase tracking-wider text-text-muted">
            No guitar photo yet
          </span>
        </div>
      )}
    </div>
  );
}
