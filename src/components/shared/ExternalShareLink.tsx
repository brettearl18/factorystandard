"use client";

import { ExternalLink } from "lucide-react";
import { externalShareLinkLabel } from "@/lib/storage";

/**
 * Renders a Drive/Dropbox/etc. URL as a clickable chip — never as an image.
 */
export function ExternalShareLink({
  url,
  className = "",
  compact = false,
}: {
  url: string;
  className?: string;
  compact?: boolean;
}) {
  const label = externalShareLinkLabel(url);
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-2 ${compact ? "p-2" : "p-3"} bg-accent/10 border border-accent/20 rounded-2xl hover:bg-accent/15 transition-colors ${className}`}
    >
      <ExternalLink className={`${compact ? "w-4 h-4" : "w-4 h-4"} text-accent shrink-0`} />
      <span className={`${compact ? "text-xs" : "text-sm"} text-accent font-medium`}>
        {label}
      </span>
    </a>
  );
}
