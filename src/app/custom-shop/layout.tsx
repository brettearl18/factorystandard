"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { Guitar, LogOut } from "lucide-react";

export default function CustomShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentUser, loading, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.replace("/login?redirect=/custom-shop");
  };

  useEffect(() => {
    if (loading) return;
    if (!currentUser) {
      router.replace("/login?redirect=/custom-shop");
      return;
    }
  }, [currentUser, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="text-slate-600">Redirecting to login...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/custom-shop"
            className="flex items-center gap-2 text-slate-900 font-semibold hover:text-accent transition-colors"
          >
            <Guitar className="w-6 h-6 text-accent" />
            Custom Shop
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500 hidden sm:inline">{currentUser.email}</span>
            <button
              type="button"
              onClick={handleSignOut}
              className="text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
