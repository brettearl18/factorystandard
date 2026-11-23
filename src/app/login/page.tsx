"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useBranding } from "@/hooks/useBranding";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Guitar, Mail, Lock, ArrowRight, AlertCircle, CheckCircle, User, Shield, ArrowLeft } from "lucide-react";
import Link from "next/link";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [loginType, setLoginType] = useState<"client" | "admin" | null>(null);
  const { signIn, currentUser, userRole, loading: authLoading } = useAuth();
  const branding = useBranding();
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirectTo = searchParams.get("redirect");
  const isCustomShop = redirectTo === "/custom-shop";

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
      const redirectTo = searchParams.get("redirect");
      const allowedRedirect = redirectTo?.startsWith("/") && !redirectTo.startsWith("//") ? redirectTo : null;
      setTimeout(() => {
        router.push(allowedRedirect || "/");
      }, 300);
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
    <div className="flex items-center justify-center min-h-screen bg-bg px-4 py-10">
      <div className="bg-surface p-8 w-full max-w-md border border-border shadow-modal">
        {/* Header */}
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-text-muted hover:text-text mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to home
          </Link>
          <div className="flex flex-col items-center mb-4">
            {branding && branding.companyLogo ? (
              <>
                <img
                  src={branding.companyLogo}
                  alt={branding.companyName || "Australian Production"}
                  className="h-16 w-auto object-contain mb-3"
                />
                <h2 className="font-display text-lg font-bold uppercase tracking-wide text-text mb-2">
                  Ormsby Guitars CustomShop &amp; Australian Production
                </h2>
              </>
            ) : (
              <div
                className={`p-3 border ${
                  loginType === "admin"
                    ? "bg-sidebar border-sidebar"
                    : "bg-accent/20 border-accent"
                }`}
              >
                {loginType === "admin" ? (
                  <Shield className="w-8 h-8 text-accent" />
                ) : (
                  <Guitar className="w-8 h-8 text-sidebar" />
                )}
              </div>
            )}
          </div>
          <h1 className="wo-heading text-[32px] leading-none mb-2 normal-case">
            {isCustomShop
              ? `Welcome to the ${branding?.companyName || "Ormsby"} CustomShop`
              : "Welcome Back"}
          </h1>
          <p className="text-text-muted text-sm">
            {isCustomShop
              ? "Sign in to your account or create one to submit your custom guitar idea."
              : loginType === "admin"
                ? "Sign in to manage production and track builds"
                : "Sign in to view your guitar build updates"
            }
          </p>
          {isCustomShop && (
            <div className="inline-flex items-center gap-2 mt-3 wo-badge-accent">
              <Guitar className="w-3 h-3" />
              Custom Shop
            </div>
          )}
          {!isCustomShop && loginType && (
            <div
              className={`inline-flex items-center gap-2 mt-3 ${
                loginType === "admin" ? "wo-badge-dark" : "wo-badge-accent"
              }`}
            >
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
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">Error</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-teal/10 border border-teal/30 text-teal px-4 py-3 rounded-xl mb-4 flex items-start gap-2">
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
                <label className="wo-label mb-2 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="wo-input"
                  placeholder="your.email@example.com"
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <label className="wo-label mb-2 flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="wo-input"
                  placeholder="Enter your password"
                  required
                  disabled={loading}
                />
              </div>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm font-semibold text-sidebar hover:underline transition-colors"
                  disabled={loading}
                >
                  Forgot password?
                </button>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="wo-btn-primary w-full"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-accent-foreground border-t-transparent animate-spin" />
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

            {/* Sign in / Sign up options */}
            <div className="mt-6 pt-6 border-t border-slate-200">
              {isCustomShop ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-slate-700 text-center">New to Custom Shop?</p>
                  <Link
                    href={`/signup?redirect=${encodeURIComponent("/custom-shop")}`}
                    className="block w-full h-11 leading-[2.75rem] px-4 rounded-2xl border border-accent text-accent font-medium text-center hover:bg-accent/5 transition-colors"
                  >
                    Create account — Sign up
                  </Link>
                  <p className="text-xs text-slate-500 text-center">
                    Already have an account? Use the form above to sign in.
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-sm text-slate-600">
                    Don&apos;t have an account?{" "}
                    <Link
                      href={redirectTo?.startsWith("/") && !redirectTo.startsWith("//")
                        ? `/signup?redirect=${encodeURIComponent(redirectTo)}`
                        : "/signup"}
                      className="text-accent hover:text-accent-light font-medium transition-colors"
                    >
                      Sign up
                    </Link>
                  </p>
                </div>
              )}
            </div>
            {/* Help Text */}
            <div className="mt-4 pt-4 border-t border-slate-200">
              <p className="text-xs text-slate-500 text-center">
                Need help? Contact your factory representative or check your email for account setup instructions.
              </p>
            </div>
          </>
        ) : (
          <>
            {/* Forgot Password Form */}
            <form onSubmit={handleForgotPassword} className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 mb-2">Reset Password</h2>
                <p className="text-sm text-slate-500 mb-4">
                  Enter your email address and we'll send you a link to reset your password.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-11 px-3 border border-slate-200 rounded-2xl bg-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/40 transition-colors"
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
                  className="flex-1 h-11 rounded-2xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors font-medium"
                  disabled={resetLoading}
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="flex-1 h-11 bg-accent text-accent-foreground rounded-2xl hover:bg-accent-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
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

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-bg">
        <div className="text-lg text-slate-600">Loading...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}

