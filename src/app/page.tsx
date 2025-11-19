"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function Home() {
  const { currentUser, userRole, loading, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!currentUser) {
      router.push("/login");
      return;
    }

    if (userRole === "staff" || userRole === "admin") {
      router.push("/dashboard");
      return;
    }

    if (userRole === "client") {
      router.push("/my-guitars");
      return;
    }
  }, [currentUser, userRole, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
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
              router.push("/login");
            }}
            className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-lg">Welcome</div>
    </div>
  );
}

