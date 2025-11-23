"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getFunctions, httpsCallable } from "firebase/functions";
import { auth } from "@/lib/firebase";

export default function SetRolePage() {
  const { currentUser } = useAuth();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"staff" | "client" | "admin" | "factory" | "accounting">("staff");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSetRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const functions = getFunctions();
      const setUserRole = httpsCallable(functions, "setUserRole");
      const result = await setUserRole({ email, role });
      const data = result.data as any;

      if (data.success) {
        setMessage(`✅ ${data.message}\n\n⚠️ User must sign out and sign back in for the role to take effect.`);
        setEmail("");
      } else {
        throw new Error(data.message || "Failed to set role");
      }
    } catch (error: any) {
      console.error("Error setting role:", error);
      const errorMessage = error.message || error.code || "Failed to set role. Make sure you're logged in as an admin.";
      setMessage(`❌ ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Set User Role</h1>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-yellow-800">
          <strong>Note:</strong> Setting user roles requires Firebase Admin SDK
          privileges. Use one of these methods:
        </p>
        <ol className="list-decimal list-inside mt-2 space-y-1 text-sm text-yellow-800">
          <li>
            Use the script:{" "}
            <code className="bg-yellow-100 px-1 rounded">
              npx ts-node scripts/set-user-role.ts [email] [role]
            </code>
          </li>
          <li>Deploy the Cloud Function and call it (requires admin role first)</li>
          <li>Use Firebase Console with Admin SDK in a Node.js script</li>
        </ol>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">Current User</h2>
        {currentUser && (
          <div className="mb-4">
            <p>
              <strong>Email:</strong> {currentUser.email}
            </p>
            <p>
              <strong>UID:</strong> {currentUser.uid}
            </p>
          </div>
        )}

        <h2 className="text-xl font-semibold mb-4 mt-6">Set User Role</h2>
        <form onSubmit={handleSetRole} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              User Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as typeof role)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="staff">Staff</option>
              <option value="client">Client</option>
              <option value="admin">Admin</option>
              <option value="factory">Factory</option>
              <option value="accounting">Accounting</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Setting Role..." : "Set Role"}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Alternative: Use Script</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-xs text-gray-600 mb-2">
              Or use the command line script:
            </p>
            <code className="block bg-gray-800 text-green-400 p-3 rounded text-sm">
              npx ts-node scripts/set-user-role.ts [email] [role]
            </code>
            <p className="text-xs text-gray-600 mt-2">
              Roles: staff, client, admin, factory, accounting
            </p>
          </div>
        </div>

        {message && (
          <div
            className={`mt-4 p-3 rounded ${
              message.includes("Error")
                ? "bg-red-50 text-red-800"
                : "bg-blue-50 text-blue-800"
            }`}
          >
            {message}
          </div>
        )}
      </div>
    </div>
  );
}

