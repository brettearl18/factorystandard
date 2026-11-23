"use client";

import { useAuth } from "@/contexts/AuthContext";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { LogOut } from "lucide-react";

export function Topbar() {
  const { currentUser, userRole, signOut } = useAuth();

  if (!currentUser) return null;

  return (
    <header className="sticky top-0 z-40 flex items-center justify-end gap-2 sm:gap-3 px-4 sm:px-6 py-3 bg-topbar border-b border-border">
      <NotificationBell />
      <div className="hidden sm:block text-right min-w-0 max-w-[200px]">
        <p className="text-sm font-medium text-text truncate">{currentUser.email}</p>
        <p className="font-mono text-[10px] uppercase tracking-wider text-text-muted capitalize">
          {userRole || "User"}
        </p>
      </div>
      <button
        type="button"
        onClick={async () => {
          await signOut();
          window.location.href = "/login";
        }}
        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-text-muted border border-transparent hover:border-border hover:bg-surface transition-colors min-h-[40px]"
        title="Sign out"
      >
        <LogOut className="h-4 w-4" />
        <span className="hidden md:inline">Sign out</span>
      </button>
    </header>
  );
}
