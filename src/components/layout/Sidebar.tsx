"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useBranding } from "@/hooks/useBranding";
import {
  LayoutDashboard,
  Package,
  Guitar,
  Plus,
  Menu,
  X,
  LogOut,
  Settings,
  Users,
  DollarSign,
  UserPlus,
  Shield,
  FileText,
} from "lucide-react";

export function Sidebar() {
  const { currentUser, userRole, signOut } = useAuth();
  const branding = useBranding();
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
      label: "Guitars",
      href: "/guitars",
      icon: Guitar,
    },
    {
      label: "Clients",
      href: "/clients",
      icon: Users,
    },
    {
      label: "Settings",
      href: "/settings",
      icon: Settings,
    },
  ];

  // Factory worker navigation (simplified mobile portal)
  const factoryNavItems = [
    {
      label: "Factory Portal",
      href: "/factory",
      icon: Package,
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

  // Accounting navigation
  const accountingNavItems = [
    {
      label: "Accounting",
      href: "/accounting",
      icon: DollarSign,
    },
    {
      label: "Guitars",
      href: "/guitars",
      icon: Guitar,
    },
  ];

  const navItems = userRole === "client" 
    ? clientNavItems 
    : userRole === "factory"
    ? factoryNavItems
    : userRole === "accounting"
    ? accountingNavItems
    : staffNavItems;

  const SidebarContent = () => (
    <>
      {/* Logo/Brand */}
      <div className="p-6 border-b border-slate bg-card">
        <Link
          href={
            userRole === "client" 
              ? "/my-guitars" 
              : userRole === "factory"
              ? "/factory"
              : userRole === "accounting"
              ? "/accounting"
              : "/dashboard"
          }
          className="flex items-center gap-3"
        >
          {branding.companyLogo ? (
            <img
              src={branding.companyLogo}
              alt={branding.companyName || "Factory Standards"}
              className="h-10 w-auto object-contain"
            />
          ) : (
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-soft"
              style={{ backgroundColor: branding.primaryColor || "#F97316" }}
            >
              <Guitar className="w-5 h-5" />
            </div>
          )}
          <div>
            <h1 className="font-display text-lg">{branding.companyName || "Factory Standards"}</h1>
            <p className="text-[11px] text-textMuted/80">Perth Custom Runs</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 bg-card overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsMobileOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all border ${
                active
                  ? "bg-primary/10 text-primary border-primary/20"
                  : "text-textMuted hover:bg-slate/40 border-transparent"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}

        {/* Admin Section - Only for Admin/Staff */}
        {(userRole === "admin" || userRole === "staff") && (
          <div className="mt-4 pt-4 border-t border-slate">
            <p className="text-xs text-textMuted uppercase tracking-[0.2em] mb-2 px-4">Admin</p>
            <Link
              href="/admin/create-user"
              onClick={() => setIsMobileOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all border ${
                isActive("/admin/create-user")
                  ? "bg-primary/10 text-primary border-primary/20"
                  : "text-textMuted hover:bg-slate/40 border-transparent"
              }`}
            >
              <UserPlus className="w-5 h-5" />
              <span>Create User</span>
            </Link>
            <Link
              href="/admin/set-role"
              onClick={() => setIsMobileOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all border ${
                isActive("/admin/set-role")
                  ? "bg-primary/10 text-primary border-primary/20"
                  : "text-textMuted hover:bg-slate/40 border-transparent"
              }`}
            >
              <Shield className="w-5 h-5" />
              <span>Set Role</span>
            </Link>
            <Link
              href="/settings/audit-logs"
              onClick={() => setIsMobileOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all border ${
                isActive("/settings/audit-logs")
                  ? "bg-primary/10 text-primary border-primary/20"
                  : "text-textMuted hover:bg-slate/40 border-transparent"
              }`}
            >
              <FileText className="w-5 h-5" />
              <span>Audit Logs</span>
            </Link>
          </div>
        )}
      </nav>

      {/* User Info & Sign Out */}
      <div className="p-4 border-t border-slate bg-card">
        <div className="mb-3 px-4 py-3 bg-shell rounded-xl border border-slate">
          <p className="text-xs text-textMuted uppercase tracking-[0.2em] mb-1">Signed in</p>
          <p className="text-sm font-semibold truncate">
            {currentUser.email}
          </p>
          <p className="text-xs text-textMuted mt-1 capitalize">
            {userRole || "No role"}
          </p>
        </div>
        <button
          onClick={async () => {
            await signOut();
            window.location.href = "/login";
          }}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-textMuted hover:bg-shell border border-slate transition-colors"
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
        className={`fixed left-0 top-0 h-full w-64 bg-card border-r border-slate z-40 flex flex-col transition-transform duration-300 ${
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

