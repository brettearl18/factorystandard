"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  Package,
  Guitar,
  Plus,
  Menu,
  X,
  LogOut,
  Settings,
} from "lucide-react";

export function Sidebar() {
  const { currentUser, userRole, signOut } = useAuth();
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  if (!currentUser) return null;

  const isActive = (path: string) => pathname === path || pathname?.startsWith(path + "/");

  // Staff/Admin navigation
  const staffNavItems = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      label: "Runs",
      href: "/runs",
      icon: Package,
    },
    {
      label: "Create Run",
      href: "/runs/new",
      icon: Plus,
    },
    {
      label: "Settings",
      href: "/settings",
      icon: Settings,
    },
  ];

  // Client navigation
  const clientNavItems = [
    {
      label: "My Guitars",
      href: "/my-guitars",
      icon: Guitar,
    },
    {
      label: "Settings",
      href: "/my/settings",
      icon: Settings,
    },
  ];

  const navItems = userRole === "client" ? clientNavItems : staffNavItems;

  const SidebarContent = () => (
    <>
      {/* Logo/Brand */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <Link href={userRole === "client" ? "/my-guitars" : "/dashboard"} className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Guitar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900">Factory Standards</h1>
              <p className="text-xs text-gray-500">Perth Guitar Runs</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsMobileOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                active
                  ? "bg-blue-50 text-blue-700 font-semibold"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Info & Sign Out */}
      <div className="p-4 border-t border-gray-200">
        <div className="mb-3 px-4 py-2 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">Signed in as</p>
          <p className="text-sm font-medium text-gray-900 truncate">
            {currentUser.email}
          </p>
          <p className="text-xs text-gray-500 mt-1 capitalize">
            {userRole || "No role"}
          </p>
        </div>
        <button
          onClick={async () => {
            await signOut();
            window.location.href = "/login";
          }}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Sign Out</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md border border-gray-200"
      >
        {isMobileOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <Menu className="w-6 h-6" />
        )}
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 z-40 flex flex-col transition-transform duration-300 ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <SidebarContent />
      </aside>

      {/* Spacer for desktop */}
      <div className="hidden lg:block w-64 flex-shrink-0" />
    </>
  );
}

