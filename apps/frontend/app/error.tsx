"use client";

import Link from "next/link";
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center dark:bg-[#0a0a0a]">
      <p className="select-none text-[96px] font-semibold leading-none tracking-tight text-gray-100 dark:text-neutral-800 sm:text-[140px]">
        500
      </p>
      <p className="mt-6 text-[13px] uppercase tracking-[0.2em] text-[#59626E] dark:text-neutral-300">
        Something came apart at the seams.
      </p>
      <p className="mt-2 max-w-xs text-[12px] leading-relaxed tracking-[0.04em] text-gray-400 dark:text-neutral-600">
        An unexpected error stitched itself into the page. Give it another go -
        it&apos;s usually a one-off.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={reset}
          className="border border-black px-8 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-black transition hover:bg-black hover:text-white dark:border-white dark:text-white dark:hover:bg-white dark:hover:text-black"
        >
          Try again
        </button>
        <Link
          href="/"
          className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#59626E] underline underline-offset-4 transition hover:text-black dark:text-neutral-400 dark:hover:text-white"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
