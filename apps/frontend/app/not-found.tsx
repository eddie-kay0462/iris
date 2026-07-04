import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center dark:bg-[#0a0a0a]">
      <p className="select-none text-[96px] font-semibold leading-none tracking-tight text-gray-100 dark:text-neutral-800 sm:text-[140px]">
        404
      </p>
      <p className="mt-6 text-[13px] uppercase tracking-[0.2em] text-[#59626E] dark:text-neutral-300">
        This page went off-grid.
      </p>
      <p className="mt-2 max-w-xs text-[12px] leading-relaxed tracking-[0.04em] text-gray-400 dark:text-neutral-600">
        The link is broken or the page never existed. No drama - let&apos;s get
        you back to the good stuff.
      </p>
      <Link
        href="/"
        className="mt-8 border border-black px-8 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-black transition hover:bg-black hover:text-white dark:border-white dark:text-white dark:hover:bg-white dark:hover:text-black"
      >
        Back to home
      </Link>
    </div>
  );
}
