"use client";

import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { Guitar, FileText, ArrowRight, ExternalLink, AlertTriangle } from "lucide-react";

export default function CustomShopLandingPage() {
  const { currentUser } = useAuth();

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Custom Shop</h1>
        <p className="text-gray-600">
          Submit your dream guitar idea. Our team will review it and get in touch.
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-amber-900">Build timeline</p>
          <p className="text-sm text-amber-800">
            Your Custom Shop build may start anywhere from <strong>6 to 18 months</strong> after acceptance and deposit is paid. Build duration varies depending on the instrument. Our team will keep you updated.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">How it works</h2>
        <ul className="space-y-4">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-medium">1</span>
            <div>
              <span className="font-medium text-gray-900">Describe your guitar</span>
              <p className="text-sm text-gray-600">Body, neck, pickups, finish, and any special details.</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-medium">2</span>
            <div>
              <span className="font-medium text-gray-900">Add inspiration images</span>
              <p className="text-sm text-gray-600">Upload reference photos (we’ll compress them to save space).</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-medium">3</span>
            <div>
              <span className="font-medium text-gray-900">Agree to deposit</span>
              <p className="text-sm text-gray-600">A $1,000 AUD deposit is required to proceed once approved.</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-medium">4</span>
            <div>
              <span className="font-medium text-gray-900">We’ll review and respond</span>
              <p className="text-sm text-gray-600">Staff will approve or reject and can convert your request into a build.</p>
            </div>
          </li>
        </ul>
      </div>

      <a
        href="https://ormsbyguitars.com/pages/custom-shop"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-2 text-amber-700 hover:text-amber-800 font-medium py-2 px-4 rounded-lg hover:bg-amber-50 transition-colors"
      >
        <ExternalLink className="w-4 h-4" />
        View Custom Shop gallery & past builds
      </a>

      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          href="/custom-shop/submit"
          className="flex-1 inline-flex items-center justify-center gap-2 bg-amber-600 text-white py-3 px-6 rounded-xl font-medium hover:bg-amber-700 transition-colors"
        >
          <FileText className="w-5 h-5" />
          Submit a request
        </Link>
        <Link
          href="/custom-shop/requests"
          className="flex-1 inline-flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 py-3 px-6 rounded-xl font-medium hover:bg-gray-50 transition-colors"
        >
          View my requests
          <ArrowRight className="w-5 h-5" />
        </Link>
      </div>

      {currentUser && (
        <p className="text-center text-sm text-gray-500">
          Signed in as {currentUser.email}
        </p>
      )}
    </div>
  );
}
