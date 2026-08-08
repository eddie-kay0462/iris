/**
 * Shared button class strings.
 *
 * This app has no cva/clsx/tailwind-merge, so styles are plain constants —
 * the same convention as `inputClass` in the account tabs. Sizing is left to
 * the caller; only the colour treatment is fixed here, so every one of these
 * buttons tracks the theme tokens together.
 */

/** Outlined button that fills in on hover. The storefront's default CTA. */
export const outlineButton =
  "border border-invert-bg text-[11px] font-semibold uppercase tracking-[0.2em] " +
  "text-text transition hover:bg-invert-bg hover:text-invert-fg";

/** Solid button using the inverted pair — black on light, white on dark. */
export const solidButton =
  "bg-invert-bg text-invert-fg text-[11px] font-semibold uppercase tracking-[0.2em] " +
  "transition hover:opacity-90 disabled:opacity-40";
