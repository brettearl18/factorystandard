"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { getFunctions, httpsCallable } from "firebase/functions";
import { UserPlus, Mail, Lock, User, CheckCircle, X, Copy } from "lucide-react";
import { useRouter } from "next/navigation";

export default function CreateUserPage() {
  const { currentUser, userRole } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<"staff" | "client" | "admin" | "factory" | "accounting">("staff");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [createdUser, setCreatedUser] = useState<{
    email: string;
    password: string;
    role: string;
    resetLink?: string;
  } | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Redirect if not admin
  if (userRole !== "admin" && userRole !== "staff") {
    router.push("/");
    return null;
  }

  const generatePassword = () => {
    const length = 12;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    setPassword(password);
    setShowPassword(true);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setCreatedUser(null);

    try {
      const functions = getFunctions();
      const createUser = httpsCallable(functions, "createUser");
      const result = await createUser({
        email: email.trim(),
        password: password.trim() || undefined,
        displayName: displayName.trim() || undefined,
        role: role,
      });
      const data = result.data as any;

      if (data.success) {
        setCreatedUser({
          email: data.email,
          password: password || "Password reset link generated",
          role: data.role,
          resetLink: data.resetLink || undefined,
        });
        setMessage(`✅ User created successfully!`);
        // Reset form
        setEmail("");
        setPassword("");
        setDisplayName("");
        setShowPassword(false);
      } else {
        throw new Error(data.message || "Failed to create user");
      }
    } catch (error: any) {
      console.error("Error creating user:", error);
      const errorMessage = error.message || error.code || "Failed to create user. Make sure you're logged in as an admin or staff.";
      setMessage(`❌ ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <UserPlus className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Create New User</h1>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Mail className="w-4 h-4 inline mr-1" />
                Email Address *
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
                <User className="w-4 h-4 inline mr-1" />
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Optional - will use email if not provided</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Lock className="w-4 h-4 inline mr-1" />
                Password
              </label>
              <div className="flex gap-2">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Leave empty to generate reset link"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={generatePassword}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                >
                  Generate
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Leave empty to generate a password reset link (user will set their own password)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role *
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as typeof role)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
                <option value="factory">Factory Worker</option>
                <option value="accounting">Accounting</option>
                <option value="client">Client</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {role === "admin" && "Full access to all features and settings"}
                {role === "staff" && "Can manage runs, guitars, and clients"}
                {role === "factory" && "Mobile portal for factory workers to update stages"}
                {role === "accounting" && "Access to invoices, payments, and financial reports"}
                {role === "client" && "Can view their own guitars and updates"}
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating User...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Create User
                </>
              )}
            </button>
          </form>

          {message && (
            <div
              className={`mt-4 p-3 rounded ${
                message.includes("Error") || message.includes("❌")
                  ? "bg-red-50 text-red-800"
                  : "bg-green-50 text-green-800"
              }`}
            >
              {message}
            </div>
          )}

          {createdUser && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h3 className="font-semibold text-blue-900">User Created Successfully!</h3>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Email:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-gray-900">{createdUser.email}</span>
                    <button
                      onClick={() => copyToClipboard(createdUser.email)}
                      className="p-1 hover:bg-blue-100 rounded"
                      title="Copy email"
                    >
                      <Copy className="w-3 h-3 text-blue-600" />
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Role:</span>
                  <span className="font-semibold text-gray-900 capitalize">{createdUser.role}</span>
                </div>
                
                {createdUser.password && createdUser.password !== "Password reset link generated" && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Password:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-gray-900">{createdUser.password}</span>
                      <button
                        onClick={() => copyToClipboard(createdUser.password!)}
                        className="p-1 hover:bg-blue-100 rounded"
                        title="Copy password"
                      >
                        <Copy className="w-3 h-3 text-blue-600" />
                      </button>
                    </div>
                  </div>
                )}
                
                {createdUser.resetLink && (
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <p className="text-xs text-gray-600 mb-2">Password Reset Link:</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={createdUser.resetLink}
                        readOnly
                        className="flex-1 px-2 py-1 text-xs bg-white border border-blue-200 rounded font-mono"
                      />
                      <button
                        onClick={() => copyToClipboard(createdUser.resetLink!)}
                        className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        Copy
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Send this link to the user so they can set their password
                    </p>
                  </div>
                )}
              </div>
              
              <div className="mt-4 pt-4 border-t border-blue-200">
                <p className="text-xs text-blue-700">
                  ⚠️ Share these credentials securely with the user. They should sign in and may need to change their password.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Quick Actions</h3>
          <div className="space-y-2 text-sm">
            <button
              onClick={() => router.push("/admin/set-role")}
              className="text-blue-600 hover:text-blue-700 hover:underline"
            >
              → Set role for existing user
            </button>
            <br />
            <button
              onClick={() => router.push("/dashboard")}
              className="text-blue-600 hover:text-blue-700 hover:underline"
            >
              → Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}







