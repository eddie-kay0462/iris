"use client";

import Link from "next/link";
import { outlineButton } from "@/components/ui";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-6 text-center">
      <p className="select-none text-[96px] font-semibold leading-none tracking-tight text-fill sm:text-[140px]">
        500
      </p>
      <p className="mt-6 text-[13px] uppercase tracking-[0.2em] text-text-secondary">
        Something came apart at the seams.
      </p>
      <p className="mt-2 max-w-xs text-[12px] leading-relaxed tracking-[0.04em] text-text-placeholder">
        An unexpected error stitched itself into the page. Give it another go -
        it&apos;s usually a one-off.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={reset}
          className={`px-8 py-3 ${outlineButton}`}
        >
          Try again
        </button>
        <Link
          href="/"
          className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-text-secondary underline underline-offset-4 transition hover:text-text"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
