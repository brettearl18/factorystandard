"use client";

import { useEffect, useState } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    console.error("Application error:", error);
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
        <h1 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h1>
        <p className="text-gray-600 text-sm mb-4">
          The app hit an error. This can happen on some mobile browsers. Try reloading the page.
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
        <button
          type="button"
          onClick={() => reset()}
          className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 active:bg-blue-800"
        >
          Reload page
        </button>
        <p className="text-gray-400 text-xs mt-4">
          If it keeps happening, try opening the site in a different browser or in desktop mode.
        </p>
      </div>
    </div>
  );
}
