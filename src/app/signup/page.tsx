"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useBranding } from "@/hooks/useBranding";
import { Guitar, Mail, Lock, ArrowRight, AlertCircle, User, ArrowLeft } from "lucide-react";
import Link from "next/link";

function SignupForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signUp, signInWithGoogle, currentUser, userRole, loading: authLoading } = useAuth();
  const branding = useBranding();
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirectTo = (() => {
    const r = searchParams.get("redirect");
    return r?.startsWith("/") && !r.startsWith("//") ? r : null;
  })();
  const isCustomShop = redirectTo === "/custom-shop";

  useEffect(() => {
    if (!authLoading && currentUser) {
      if (redirectTo) {
        router.push(redirectTo);
      } else if (userRole === "client") {
        router.push("/my-guitars");
      } else {
        router.push("/");
      }
    }
  }, [currentUser, userRole, authLoading, router, redirectTo]);

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!displayName.trim()) {
      setError("Please enter your full name");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    try {
      await signUp(email.trim(), password, displayName.trim());
      await new Promise(resolve => setTimeout(resolve, 1000));
      router.push(redirectTo || "/my-guitars");
    } catch (err: any) {
      let errorMessage = "Failed to create account";
      
      if (err.code === "auth/email-already-in-use") {
        errorMessage = "An account with this email already exists. Please sign in instead.";
      } else if (err.code === "auth/invalid-email") {
        errorMessage = "Invalid email address.";
      } else if (err.code === "auth/weak-password") {
        errorMessage = "Password is too weak. Please choose a stronger password.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setError("");
    setLoading(true);

    try {
      await signInWithGoogle();
      await new Promise(resolve => setTimeout(resolve, 1000));
      router.push(redirectTo || "/my-guitars");
    } catch (err: any) {
      let errorMessage = "Failed to sign up with Google";
      
      if (err.code === "auth/popup-closed-by-user") {
        errorMessage = "Sign up cancelled. Please try again.";
      } else if (err.code === "auth/account-exists-with-different-credential") {
        errorMessage = "An account with this email already exists. Please sign in instead.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg">
        <div className="text-lg text-slate-600">Loading...</div>
      </div>
    );
  }

  const inputClass =
    "w-full h-11 px-3 border border-slate-200 rounded-2xl bg-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/40 transition-colors";

  return (
    <div className="flex items-center justify-center min-h-screen bg-bg px-4 py-10">
      <div className="bg-white p-8 rounded-2xl shadow-sm w-full max-w-md border border-slate-200">
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-slate-500 hover:text-slate-900 mb-4 transition-colors"
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
                {(branding.companyName || isCustomShop) && (
                  <h2 className="text-xl font-semibold text-slate-700 mb-2">
                    {isCustomShop ? "CustomShop" : branding.companyName}
                  </h2>
                )}
              </>
            ) : (
              <div
                className="p-3 rounded-2xl bg-accent/10"
                style={branding?.primaryColor ? { backgroundColor: `${branding.primaryColor}20` } : {}}
              >
                <Guitar
                  className="w-8 h-8 text-accent"
                  style={branding?.primaryColor ? { color: branding.primaryColor } : undefined}
                />
              </div>
            )}
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 mb-2">
            {isCustomShop ? `Welcome to the ${branding?.companyName || "Ormsby"} CustomShop` : "Create Your Account"}
          </h1>
          <p className="text-slate-500 text-sm">
            {isCustomShop
              ? "Create an account to submit your custom guitar idea."
              : "Sign up to submit your guitar specifications"}
          </p>
          {isCustomShop && (
            <div className="inline-flex items-center gap-2 mt-3 px-3 py-1 rounded-xl text-xs font-medium bg-accent/10 text-accent">
              <Guitar className="w-3 h-3" />
              Custom Shop
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">Error</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleEmailSignup} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
              <User className="w-4 h-4" />
              Full Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className={inputClass}
              placeholder="John Doe"
              required
              disabled={loading}
            />
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
              className={inputClass}
              placeholder="your.email@example.com"
              required
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${inputClass} pr-10`}
                placeholder="At least 6 characters"
                required
                disabled={loading}
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                disabled={loading}
              >
                {showPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-accent text-accent-foreground rounded-2xl hover:bg-accent-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Creating account...
              </>
            ) : (
              <>
                Sign Up
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="my-6 flex items-center">
          <div className="flex-1 border-t border-slate-200" />
          <span className="px-4 text-sm text-slate-500">or</span>
          <div className="flex-1 border-t border-slate-200" />
        </div>

        <button
          onClick={handleGoogleSignup}
          disabled={loading}
          className="w-full h-11 bg-white border border-slate-200 text-slate-700 rounded-2xl hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Sign up with Google
        </button>

        <div className="mt-6 pt-6 border-t border-slate-200">
          <p className="text-sm text-slate-600 text-center">
            Already have an account?{" "}
            <Link
              href={redirectTo ? `/login?redirect=${encodeURIComponent(redirectTo)}` : "/login"}
              className="text-accent hover:text-accent-light font-medium transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-bg">
        <div className="text-lg text-slate-600">Loading...</div>
      </div>
    }>
      <SignupForm />
    </Suspense>
  );
}
