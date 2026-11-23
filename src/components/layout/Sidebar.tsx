"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useBranding } from "@/hooks/useBranding";
import { useUnreadGuitarNotifications } from "@/hooks/useUnreadGuitarNotifications";
import {
  LayoutDashboard,
  Package,
  Guitar,
  BarChart3,
  Menu,
  X,
  Settings,
  Users,
  DollarSign,
  UserPlus,
  Shield,
  FileText,
  SlidersHorizontal,
} from "lucide-react";
import { NavLink } from "./NavLink";
import { PublicLinksNav } from "./PublicLinksNav";

export function Sidebar() {
  const { currentUser, userRole } = useAuth();
  const branding = useBranding();
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { total: guitarUnreadCount } = useUnreadGuitarNotifications();
  const showGuitarBadge =
    (userRole === "staff" || userRole === "admin" || userRole === "accounting") &&
    guitarUnreadCount > 0;

  if (!currentUser) return null;

  const isActive = (path: string) => pathname === path || pathname?.startsWith(path + "/");
  const closeMobile = () => setIsMobileOpen(false);

  const homeHref =
    userRole === "client"
      ? "/my-guitars"
      : userRole === "factory"
        ? "/factory"
        : userRole === "accounting"
          ? "/accounting"
          : "/dashboard";

  const staffNavItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Runs", href: "/runs", icon: Package },
    { label: "Guitars", href: "/guitars", icon: Guitar },
    { label: "Clients", href: "/clients", icon: Users },
    { label: "Custom Shop requests", href: "/settings/custom-shop-requests", icon: FileText },
    { label: "Custom Shop specs", href: "/settings/custom-shop-specs", icon: SlidersHorizontal },
    { label: "Settings", href: "/settings", icon: Settings },
  ];

  const factoryNavItems = [{ label: "Factory Portal", href: "/factory", icon: Package }];

  const clientNavItems = [
    { label: "My Guitars", href: "/my-guitars", icon: Guitar },
    { label: "Custom Shop", href: "/custom-shop", icon: FileText },
    { label: "Settings", href: "/my/settings", icon: Settings },
  ];

  const accountingNavItems = [
    { label: "Accounting", href: "/accounting", icon: DollarSign },
    { label: "Run financial reports", href: "/runs", icon: BarChart3 },
    { label: "Guitars", href: "/guitars", icon: Guitar },
  ];

  const adminNavItems = [
    { label: "Create User", href: "/admin/create-user", icon: UserPlus },
    { label: "Set Role", href: "/admin/set-role", icon: Shield },
    { label: "Audit Logs", href: "/settings/audit-logs", icon: FileText },
  ];

  const navItems =
    userRole === "client"
      ? clientNavItems
      : userRole === "factory"
        ? factoryNavItems
        : userRole === "accounting"
          ? accountingNavItems
          : staffNavItems;

  const sidebarBody = (
    <>
      <div className="px-5 py-5 border-b border-white/10">
        <Link href={homeHref} onClick={closeMobile} className="flex items-center gap-3">
          {branding.companyLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={branding.companyLogo}
              alt={branding.companyName || "Australian Production"}
              className="h-10 w-auto object-contain"
            />
          ) : (
            <div className="h-10 w-10 bg-white/10 flex items-center justify-center shrink-0 border border-white/15">
              <Guitar className="h-5 w-5 text-accent" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="font-display text-base font-bold leading-none text-text-onDark truncate tracking-wide">
              {branding.companyName || "Australian Production"}
            </h1>
            <p className="font-mono text-[10px] uppercase tracking-wider text-text-onDark/55 mt-1.5">
              Factory Run
            </p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-0.5">
        <p className="px-3 pb-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-text-onDark/45">
          Menu
        </p>
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={isActive(item.href)}
            onNavigate={closeMobile}
            badge={item.href === "/guitars" && showGuitarBadge ? guitarUnreadCount : undefined}
          />
        ))}

        {userRole !== "client" && (
          <PublicLinksNav userRole={userRole} onNavigate={closeMobile} />
        )}

        {(userRole === "admin" || userRole === "staff") && (
          <div className="pt-4 mt-2">
            <div className="h-px bg-white/10 mb-3" />
            <p className="px-3 pb-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-red-300/80">
              Admin
            </p>
            {adminNavItems.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                active={isActive(item.href)}
                onNavigate={closeMobile}
              />
            ))}
          </div>
        )}
      </nav>

      <div className="px-4 py-4 border-t border-white/10">
        <div className="border border-white/15 bg-white/[0.07] px-3 py-3 text-xs">
          <p className="font-mono text-[10px] uppercase tracking-wider text-text-onDark/50 mb-1">
            Signed in
          </p>
          <p className="text-text-onDark/90 font-medium truncate">{currentUser.email}</p>
          <p className="text-text-onDark/60 capitalize mt-0.5 font-mono text-[11px]">
            {userRole || "User"}
          </p>
        </div>
      </div>
    </>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 bg-sidebar text-text-onDark border border-white/15 min-h-[44px] min-w-[44px]"
        aria-label={isMobileOpen ? "Close menu" : "Open menu"}
      >
        {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={closeMobile}
          aria-hidden
        />
      )}

      <aside
        className={`fixed left-0 top-0 bottom-0 z-40 w-[280px] lg:w-[260px] bg-sidebar flex flex-col transition-transform duration-300 ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        {sidebarBody}
      </aside>
    </>
  );
}
