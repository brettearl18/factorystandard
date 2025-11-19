"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Guitar, Mail, Lock, ArrowRight, AlertCircle, CheckCircle, User, Shield, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [loginType, setLoginType] = useState<"client" | "admin" | null>(null);
  const { signIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const role = searchParams.get("role");
    if (role === "client" || role === "admin") {
      setLoginType(role);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      await signIn(email, password);
      // The home page will handle redirect based on role
      router.push("/");
    } catch (err: any) {
      // Provide user-friendly error messages
      let errorMessage = "Failed to sign in";
      
      if (err.code === "auth/user-not-found") {
        errorMessage = "No account found with this email address.";
      } else if (err.code === "auth/wrong-password") {
        errorMessage = "Incorrect password. Please try again or reset your password.";
      } else if (err.code === "auth/invalid-email") {
        errorMessage = "Invalid email address.";
      } else if (err.code === "auth/user-disabled") {
        errorMessage = "This account has been disabled. Please contact support.";
      } else if (err.code === "auth/too-many-requests") {
        errorMessage = "Too many failed attempts. Please try again later or reset your password.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    
    if (!email.trim()) {
      setError("Please enter your email address first.");
      return;
    }

    setResetLoading(true);

    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSuccess("Password reset email sent! Please check your inbox and follow the instructions to reset your password.");
      setShowForgotPassword(false);
    } catch (err: any) {
      let errorMessage = "Failed to send password reset email.";
      
      if (err.code === "auth/user-not-found") {
        errorMessage = "No account found with this email address.";
      } else if (err.code === "auth/invalid-email") {
        errorMessage = "Invalid email address.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md border border-gray-200">
        {/* Header */}
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to home
          </Link>
          <div className="flex justify-center mb-4">
            <div className={`p-3 rounded-full ${
              loginType === "admin" ? "bg-purple-100" : "bg-blue-100"
            }`}>
              {loginType === "admin" ? (
                <Shield className="w-8 h-8 text-purple-600" />
              ) : (
                <Guitar className="w-8 h-8 text-blue-600" />
              )}
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-gray-600 text-sm">
            {loginType === "admin" 
              ? "Sign in to manage production and track builds"
              : "Sign in to view your guitar build updates"
            }
          </p>
          {loginType && (
            <div className={`inline-flex items-center gap-2 mt-3 px-3 py-1 rounded-full text-xs font-medium ${
              loginType === "admin" 
                ? "bg-purple-100 text-purple-700" 
                : "bg-blue-100 text-blue-700"
            }`}>
              {loginType === "admin" ? (
                <>
                  <Shield className="w-3 h-3" />
                  Admin / Staff Login
                </>
              ) : (
                <>
                  <User className="w-3 h-3" />
                  Client Login
                </>
              )}
            </div>
          )}
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">Error</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 flex items-start gap-2">
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">Success</p>
              <p className="text-sm">{success}</p>
            </div>
          </div>
        )}

        {!showForgotPassword ? (
          <>
            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="your.email@example.com"
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Enter your password"
                  required
                  disabled={loading}
                />
              </div>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                  disabled={loading}
                >
                  Forgot password?
                </button>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Help Text */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center">
                Need help? Contact your factory representative or check your email for account setup instructions.
              </p>
            </div>
          </>
        ) : (
          <>
            {/* Forgot Password Form */}
            <form onSubmit={handleForgotPassword} className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Reset Password</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Enter your email address and we'll send you a link to reset your password.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="your.email@example.com"
                  required
                  disabled={resetLoading}
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setError("");
                    setSuccess("");
                  }}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  disabled={resetLoading}
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
                >
                  {resetLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

