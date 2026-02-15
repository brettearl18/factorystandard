"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function RunsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    console.error("Runs error:", error);
  }, [error]);

  const errorLog = [
    error.message,
    error.digest ? `Digest: ${error.digest}` : null,
    error.stack ? error.stack : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Problem loading Runs</h1>
        <p className="text-gray-600 text-sm mb-4">
          Something went wrong on this page. Try reloading or go back to the dashboard.
        </p>
        <div className="mb-4 text-left">
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            {showDetails ? "Hide" : "Show"} error log
          </button>
          {showDetails && (
            <pre className="mt-2 p-3 bg-gray-100 rounded-lg text-xs text-gray-800 overflow-x-auto overflow-y-auto max-h-40 font-mono whitespace-pre-wrap break-words">
              {errorLog}
            </pre>
          )}
        </div>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
          >
            Try again
          </button>
          <Link
            href="/dashboard"
            className="w-full py-3 px-4 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 block text-center"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
