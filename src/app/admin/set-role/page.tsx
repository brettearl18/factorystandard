"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getFunctions, httpsCallable } from "firebase/functions";
import { auth } from "@/lib/firebase";

export default function SetRolePage() {
  const { currentUser } = useAuth();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"staff" | "client" | "admin">("staff");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSetRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      // For now, we'll use a direct approach with Admin SDK via a script
      // This page is just for UI - actual role setting needs Admin SDK
      setMessage(
        "⚠️ Role setting requires Admin SDK. Use the script: npx ts-node scripts/set-user-role.ts [email] [role]"
      );
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
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

        <h2 className="text-xl font-semibold mb-4 mt-6">Quick Setup Instructions</h2>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm mb-2">
            To set your role, run this command in the terminal:
          </p>
          <code className="block bg-gray-800 text-green-400 p-3 rounded text-sm">
            npx ts-node scripts/set-user-role.ts {currentUser?.email || "[your-email]"} staff
          </code>
          <p className="text-xs text-gray-600 mt-2">
            Replace "staff" with "client" or "admin" as needed.
          </p>
          <p className="text-xs text-gray-600 mt-2">
            <strong>Important:</strong> You'll need to set the{" "}
            <code>GOOGLE_APPLICATION_CREDENTIALS</code> environment variable
            with your service account key first.
          </p>
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

