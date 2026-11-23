"use client";

import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { Guitar, FileText, ArrowRight, ExternalLink, AlertTriangle } from "lucide-react";

export default function CustomShopLandingPage() {
  const { currentUser } = useAuth();

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">Custom Shop</h1>
        <p className="text-sm text-slate-500">
          Submit your dream guitar idea. Our team will review it and get in touch.
        </p>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-amber-900">Build timeline</p>
          <p className="text-sm text-amber-800">
            Your Custom Shop build may start anywhere from <strong>6 to 18 months</strong> after acceptance and deposit is paid. Build duration varies depending on the instrument. Our team will keep you updated.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">How it works</h2>
        <ul className="space-y-4">
          {[
            { n: 1, title: "Configure your specs", desc: "Step through woods, hardware, electronics, finish — and see an indicative price." },
            { n: 2, title: "Tell your story", desc: "Describe the dream in your words and add optional inspiration photos." },
            { n: 3, title: "Agree to deposit", desc: "A $1,000 AUD deposit is required to proceed once approved." },
            { n: 4, title: "We'll review and respond", desc: "Staff will approve or reject and can convert your request into a build." },
          ].map((step) => (
            <li key={step.n} className="flex gap-3">
              <span className="flex-shrink-0 w-8 h-8 rounded-2xl bg-accent/10 text-accent flex items-center justify-center font-medium text-sm">
                {step.n}
              </span>
              <div>
                <span className="font-medium text-slate-900">{step.title}</span>
                <p className="text-sm text-slate-500">{step.desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <a
        href="https://ormsbyguitars.com/pages/custom-shop"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-2 text-accent hover:text-accent-light font-medium py-2 px-4 rounded-2xl hover:bg-accent/5 transition-colors"
      >
        <ExternalLink className="w-4 h-4" />
        View Custom Shop gallery & past builds
      </a>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/custom-shop/submit"
          className="flex-1 inline-flex items-center justify-center gap-2 h-11 bg-accent text-accent-foreground rounded-2xl font-medium hover:bg-accent-light transition-colors"
        >
          <FileText className="w-5 h-5" />
          Submit a request
        </Link>
        <Link
          href="/custom-shop/requests"
          className="flex-1 inline-flex items-center justify-center gap-2 h-11 rounded-2xl border border-slate-200 bg-white text-slate-700 font-medium hover:bg-slate-50 transition-colors"
        >
          View my requests
          <ArrowRight className="w-5 h-5" />
        </Link>
      </div>

      {currentUser && (
        <p className="text-center text-sm text-slate-500">
          Signed in as {currentUser.email}
        </p>
      )}
    </div>
  );
}
