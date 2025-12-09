"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useBranding } from "@/hooks/useBranding";
import { Guitar, Mail, Lock, ArrowRight, AlertCircle, CheckCircle, User, ArrowLeft } from "lucide-react";
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

  // Redirect if already signed in
  useEffect(() => {
    if (!authLoading && currentUser) {
      if (userRole === "client") {
        router.push("/onboard");
      } else {
        router.push("/");
      }
    }
  }, [currentUser, userRole, authLoading, router]);

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
      // Wait a moment for role to be set, then redirect
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Redirect to onboard page
      router.push("/onboard");
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
      // Wait a moment for role to be set, then redirect
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Redirect to onboard page
      router.push("/onboard");
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

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
          <div className="flex flex-col items-center mb-4">
            {branding && branding.companyLogo ? (
              <>
                <img
                  src={branding.companyLogo}
                  alt={branding.companyName || "Factory Standards"}
                  className="h-16 w-auto object-contain mb-3"
                />
                {branding.companyName && (
                  <h2 className="text-xl font-semibold text-gray-700 mb-2">{branding.companyName}</h2>
                )}
              </>
            ) : (
              <div 
                className="p-3 rounded-full bg-blue-100"
                style={branding?.primaryColor ? { backgroundColor: `${branding.primaryColor}20` } : {}}
              >
                <Guitar 
                  className="w-8 h-8" 
                  style={branding?.primaryColor ? { color: branding.primaryColor } : { color: "#3B82F6" }}
                />
              </div>
            )}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Your Account</h1>
          <p className="text-gray-600 text-sm">
            Sign up to submit your guitar specifications
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">Error</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Signup Form */}
        <form onSubmit={handleEmailSignup} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <User className="w-4 h-4" />
              Full Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="John Doe"
              required
              disabled={loading}
            />
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
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors pr-10"
                placeholder="At least 6 characters"
                required
                disabled={loading}
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                disabled={loading}
              >
                {showPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
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

        {/* Divider */}
        <div className="my-6 flex items-center">
          <div className="flex-1 border-t border-gray-300"></div>
          <span className="px-4 text-sm text-gray-500">or</span>
          <div className="flex-1 border-t border-gray-300"></div>
        </div>

        {/* Google Sign Up */}
        <button
          onClick={handleGoogleSignup}
          disabled={loading}
          className="w-full bg-white border-2 border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
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

        {/* Sign In Link */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600 text-center">
            Already have an account?{" "}
            <Link href="/login" className="text-blue-600 hover:text-blue-700 hover:underline font-medium">
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    }>
      <SignupForm />
    </Suspense>
  );
}

