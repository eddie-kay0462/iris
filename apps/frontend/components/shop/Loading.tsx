/* Storefront loading cues. One visual language everywhere: a 2px indeterminate
   hairline plus tracked uppercase caps — no round spinners. Every cue fades in
   after a short hold (`animate-gallery-loading`, globals.css) so fast loads
   never flash it. Animations respect prefers-reduced-motion. */

/** Indeterminate 2px hairline. Position it with `className` (e.g. `absolute inset-x-0 bottom-0`). */
export function LoadingBar({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`block h-[2px] overflow-hidden bg-invert-bg/15 ${className}`}
    >
      <span className="animate-gallery-progress block h-full w-2/5 bg-invert-bg" />
    </span>
  );
}

/** Caps label over a short hairline — the inline "something is loading" cue. */
export function LoadingStatus({
  label = "Loading",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`animate-gallery-loading flex flex-col items-center gap-3 ${className}`}
    >
      <span className="text-[10px] uppercase tracking-[0.22em] text-text-muted">{label}</span>
      <LoadingBar className="w-24" />
    </div>
  );
}

/** Full-area placeholder for a page or section that has nothing to show yet. */
export function PageLoading({
  label = "Loading",
  className = "min-h-[60vh]",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-center px-4 ${className}`}>
      <LoadingStatus label={label} />
    </div>
  );
}
