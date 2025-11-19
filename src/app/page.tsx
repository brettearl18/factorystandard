"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Guitar, User, Shield, ArrowRight, Factory } from "lucide-react";

export default function Home() {
  const { currentUser, userRole, loading, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    // If user is logged in, redirect based on role
    if (currentUser) {
      if (userRole === "staff" || userRole === "admin") {
        router.push("/dashboard");
        return;
      }

      if (userRole === "client") {
        router.push("/my-guitars");
        return;
      }
    }
  }, [currentUser, userRole, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // If user is logged in but has no role, show helpful message
  if (currentUser && !userRole) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md">
          <h1 className="text-2xl font-bold mb-4">Welcome!</h1>
          <p className="text-gray-600 mb-4">
            You're signed in as <strong>{currentUser.email}</strong>, but you
            don't have a role assigned yet.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            A role (staff, client, or admin) needs to be set using Firebase
            Admin SDK. See the{" "}
            <a
              href="/admin/set-role"
              className="text-blue-600 hover:underline"
            >
              role setup page
            </a>{" "}
            for instructions.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-4">
            <p className="text-sm font-semibold text-blue-900 mb-2">
              Quick Setup:
            </p>
            <code className="block text-xs bg-blue-100 p-2 rounded mb-2">
              npx ts-node scripts/set-user-role.ts {currentUser.email} staff
            </code>
            <p className="text-xs text-blue-700">
              Then sign out and sign back in for the role to take effect.
            </p>
          </div>
          <button
            onClick={async () => {
              await signOut();
              router.push("/");
            }}
            className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // Landing page for unauthenticated users
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <div className="bg-blue-600 p-4 rounded-2xl shadow-lg">
              <Guitar className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Ormsby Factory Standards
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Track your guitar build progress and stay updated on every stage of production
          </p>
        </div>

        {/* Login Options */}
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8 mb-16">
          {/* Client Login */}
          <Link
            href="/login?role=client"
            className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-8 border-2 border-transparent hover:border-blue-500"
          >
            <div className="flex items-center justify-center mb-6">
              <div className="bg-blue-100 group-hover:bg-blue-200 p-4 rounded-full transition-colors">
                <User className="w-10 h-10 text-blue-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3 text-center">
              Client Login
            </h2>
            <p className="text-gray-600 mb-6 text-center">
              Access your guitar build updates, view progress, and see photos from the factory
            </p>
            <div className="flex items-center justify-center text-blue-600 font-medium group-hover:text-blue-700">
              <span>Sign in as Client</span>
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Admin/Staff Login */}
          <Link
            href="/login?role=admin"
            className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-8 border-2 border-transparent hover:border-purple-500"
          >
            <div className="flex items-center justify-center mb-6">
              <div className="bg-purple-100 group-hover:bg-purple-200 p-4 rounded-full transition-colors">
                <Shield className="w-10 h-10 text-purple-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3 text-center">
              Admin / Staff Login
            </h2>
            <p className="text-gray-600 mb-6 text-center">
              Manage production runs, track guitars, and update build progress
            </p>
            <div className="flex items-center justify-center text-purple-600 font-medium group-hover:text-purple-700">
              <span>Sign in as Admin</span>
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>

        {/* Features Section */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-md p-8 border border-gray-200">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              Features
            </h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Factory className="w-6 h-6 text-blue-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Real-time Updates</h4>
                <p className="text-sm text-gray-600">
                  Get instant notifications when your guitar moves through production stages
                </p>
              </div>
              <div className="text-center">
                <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Guitar className="w-6 h-6 text-blue-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Build Tracking</h4>
                <p className="text-sm text-gray-600">
                  Follow your guitar's journey from wood selection to final assembly
                </p>
              </div>
              <div className="text-center">
                <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Photo Gallery</h4>
                <p className="text-sm text-gray-600">
                  View progress photos and updates from the factory floor
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

