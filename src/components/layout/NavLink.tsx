"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export function NavLink({
  href,
  label,
  icon: Icon,
  active,
  onNavigate,
  badge,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  onNavigate?: () => void;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`relative w-full flex items-center gap-3 px-3 py-2.5 transition border-l-4 ${
        active
          ? "border-accent bg-white/10 text-text-onDark"
          : "border-transparent hover:bg-white/5 text-text-onDark/80"
      }`}
    >
      <span className="relative shrink-0">
        <Icon className={`h-4 w-4 ${active ? "text-text-onDark" : "text-text-onDark/70"}`} />
        {badge != null && badge > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 flex items-center justify-center bg-accent text-accent-foreground text-[10px] font-bold font-mono">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </span>
      <span
        className={`text-sm flex-1 min-w-0 truncate ${
          active ? "text-text-onDark font-semibold" : "text-text-onDark/80"
        }`}
      >
        {label}
      </span>
    </Link>
  );
}
