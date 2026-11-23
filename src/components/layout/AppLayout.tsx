"use client";

import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen bg-bg text-text">
      <Sidebar />
      <div className="flex-1 lg:ml-[260px] min-w-0 flex flex-col">
        <Topbar />
        <main className="flex-1 px-4 sm:px-6 pb-8 pt-5">{children}</main>
      </div>
    </div>
  );
}
