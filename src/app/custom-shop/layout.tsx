"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { Guitar, ArrowLeft } from "lucide-react";

export default function CustomShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    // Custom Shop requires sign-in; redirect to login if not authenticated
    if (!currentUser) {
      router.replace("/login?redirect=/custom-shop");
      return;
    }
  }, [currentUser, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Redirecting to login...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/custom-shop"
            className="flex items-center gap-2 text-gray-800 font-semibold"
          >
            <Guitar className="w-6 h-6 text-amber-600" />
            Custom Shop
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">{currentUser.email}</span>
            <Link
              href="/"
              className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to site
            </Link>
          </div>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
