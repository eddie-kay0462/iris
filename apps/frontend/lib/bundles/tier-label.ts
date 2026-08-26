import type { BundleTier } from "@/lib/api/promos";

/**
 * How many paired items a tier actually covers.
 *
 * A tier is only in force until the next one takes over: with tiers at 1, 2 and
 * 3, adding two items earns the *second* tier's rate, not the first's. So only
 * the final tier is open-ended — describing every tier as "N or more" would
 * promise the wrong rate at every level but the last.
 */
export function tierRange(
  tiers: BundleTier[],
  index: number,
): { from: number; to: number | null } {
  const sorted = [...tiers].sort((a, b) => a.minPairedCount - b.minPairedCount);
  const from = sorted[index].minPairedCount;
  const next = sorted[index + 1];
  return { from, to: next ? next.minPairedCount - 1 : null };
}

/**
 * The customer-facing phrase for a tier's range, e.g. "1 other item",
 * "2-4 other items", "5 or more other items".
 */
export function tierRangeLabel(
  tiers: BundleTier[],
  index: number,
  basis: "units" | "products",
): string {
  const { from, to } = tierRange(tiers, index);
  const noun = basis === "products" ? "other product" : "other item";

  // Open-ended: the last tier, and any single-tier deal.
  if (to === null) {
    return `${from} or more ${noun}${from === 1 ? "" : "s"}`;
  }

  // A tier the next one immediately supersedes covers exactly one count.
  if (to === from) {
    return `${from} ${noun}${from === 1 ? "" : "s"}`;
  }

  return `${from}-${to} ${noun}s`;
}

/**
 * Tiers in order, each paired with the phrase describing the range it covers.
 *
 * Callers should render from this rather than pairing their own array index
 * against `tierRangeLabel` — the label depends on the tier *after* it, so an
 * unsorted array would silently mislabel every row.
 */
export function describeTiers(
  tiers: BundleTier[],
  basis: "units" | "products",
): { tier: BundleTier; rangeLabel: string }[] {
  const sorted = [...tiers].sort((a, b) => a.minPairedCount - b.minPairedCount);
  return sorted.map((tier, i) => ({
    tier,
    rangeLabel: tierRangeLabel(sorted, i, basis),
  }));
}
