"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[App Error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center bg-base px-4 text-center">
      {/* Error icon */}
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red/10">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-10 w-10 text-red"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
          />
        </svg>
      </div>

      {/* Heading */}
      <h1 className="font-heading text-2xl font-bold text-text sm:text-3xl">
        Something went wrong
      </h1>

      {/* Error message in code block */}
      <div className="mt-5 w-full max-w-lg rounded-lg bg-surface-alt px-5 py-4">
        <p className="font-mono text-sm text-text-muted break-all">
          {error.message || "An unexpected error occurred."}
        </p>
      </div>

      {/* Actions */}
      <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row">
        {/* Try Again - Primary */}
        <button
          onClick={reset}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-cyan to-[#00C8D4] px-8 py-3 text-[13px] font-semibold uppercase tracking-wider text-base transition-all duration-300 hover:-translate-y-0.5 hover:from-[#33F3FF] hover:to-cyan hover:shadow-[0_4px_20px_rgba(0,240,255,0.3)] active:translate-y-0"
        >
          Try Again
        </button>

        {/* Back to Home - Secondary */}
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-cyan/40 bg-transparent px-8 py-3 text-[13px] font-semibold uppercase tracking-wider text-cyan transition-all duration-300 hover:-translate-y-0.5 hover:bg-cyan/5 active:translate-y-0"
        >
          Back to Home
        </Link>
      </div>

      {/* Decorative dot grid */}
      <div className="pointer-events-none absolute inset-0 dot-grid opacity-20" />
    </div>
  );
}
