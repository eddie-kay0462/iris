import Link from "next/link";
import { outlineButton } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-6 text-center">
      <p className="select-none text-[96px] font-semibold leading-none tracking-tight text-fill sm:text-[140px]">
        404
      </p>
      <p className="mt-6 text-[13px] uppercase tracking-[0.2em] text-text-secondary">
        This page went off-grid.
      </p>
      <p className="mt-2 max-w-xs text-[12px] leading-relaxed tracking-[0.04em] text-text-placeholder">
        The link is broken or the page never existed. No drama - let&apos;s get
        you back to the good stuff.
      </p>
      <Link
        href="/"
        className={`mt-8 px-8 py-3 ${outlineButton}`}
      >
        Back to home
      </Link>
    </div>
  );
}
