"use client";

import { Sidebar } from "./Sidebar";
import { NotificationBell } from "@/components/notifications/NotificationBell";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen bg-paper text-textPrimary">
      <Sidebar />
      <main className="flex-1 lg:ml-0 relative">
        <div className="flex justify-end px-4 lg:px-8 py-4 sticky top-0 z-40 bg-card/95 backdrop-blur border-b border-slate shadow-soft">
          <NotificationBell />
        </div>
        <div className="px-4 lg:px-10 py-6">{children}</div>
      </main>
    </div>
  );
}

