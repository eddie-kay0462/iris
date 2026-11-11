/* Section eyebrows for the storefront editorial pages (About, Returns, home).
   The dot count encodes the section number; "Ch. 0N" text is gone, so the
   number is announced through an aria-label instead. */

export const EYEBROW_CLASS =
  "flex items-center gap-3 text-[13px] sm:text-[15px] font-normal uppercase tracking-[0.26em] text-neutral-600 dark:text-neutral-300 font-mono";

export function EyebrowDots({ n }: { n: number }) {
  return (
    <span className="flex items-center gap-1.5" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className="h-1 w-1 rounded-full bg-neutral-500 dark:bg-neutral-400" />
      ))}
    </span>
  );
}

/* Side-column variant (the lg:grid-cols-[200px_1fr] sections): dots on their
   own line, title below. */
export function SideEyebrow({ n, title }: { n: number; title: React.ReactNode }) {
  return (
    <div aria-label={`Section ${n}: ${typeof title === "string" ? title : ""}`.trim()}>
      <EyebrowDots n={n} />
      <div className="mt-3 text-sm uppercase tracking-[0.18em] text-text">{title}</div>
    </div>
  );
}
