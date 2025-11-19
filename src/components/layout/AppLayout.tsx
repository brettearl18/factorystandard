"use client";

import { Sidebar } from "./Sidebar";
import { NotificationBell } from "@/components/notifications/NotificationBell";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 lg:ml-0 relative">
        <div className="flex justify-end px-4 lg:px-6 py-4 sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-gray-100">
          <NotificationBell />
        </div>
        <div className="pt-2 lg:pt-4">{children}</div>
      </main>
    </div>
  );
}

