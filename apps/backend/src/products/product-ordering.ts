/**
 * Page-window maths for the "bundle anchors first" catalog ordering.
 *
 * The catalog is served as two ordered blocks — anchors, then everything else —
 * so a requested page can straddle the seam between them. Pure and separate
 * from the service so the off-by-ones are testable: a mistake here silently
 * drops a product out of the catalog or shows it on two pages.
 */

export interface PageWindow {
  /** Slice bounds into the anchor block, as [start, endExclusive]. */
  anchors: [number, number];
  /** Range into the non-anchor block, or null when the window ends before it. */
  rest: { from: number; to: number } | null;
}

/**
 * @param from  first index of the requested page (inclusive)
 * @param to    last index of the requested page (inclusive)
 * @param anchorTotal  how many anchor products match the current filters
 */
export function splitPageWindow(
  from: number,
  to: number,
  anchorTotal: number,
): PageWindow {
  const anchorStart = Math.min(from, anchorTotal);
  const anchorEnd = Math.min(to + 1, anchorTotal);

  // The window ends before the anchors run out — nothing from the tail.
  if (to < anchorTotal) {
    return { anchors: [anchorStart, anchorEnd], rest: null };
  }

  return {
    anchors: [anchorStart, anchorEnd],
    rest: {
      from: Math.max(0, from - anchorTotal),
      to: to - anchorTotal,
    },
  };
}

/**
 * The tail range to fetch *before* the anchor count is known, so the anchor and
 * tail queries can run in parallel.
 *
 * Filters can hide anchors, so the real anchor total is anywhere from 0 to
 * `maxAnchors`, and `splitPageWindow`'s tail range shifts with it. This range
 * covers every possibility: at most `maxAnchors` extra rows, in exchange for a
 * database round trip. Cut the real window out with `sliceRest`.
 */
export function restFetchRange(
  from: number,
  to: number,
  maxAnchors: number,
): { from: number; to: number } {
  return { from: Math.max(0, from - maxAnchors), to };
}

/** Cut `window.rest` out of rows fetched over `restFetchRange`. */
export function sliceRest<T>(
  fetched: T[],
  fetchedFrom: number,
  rest: PageWindow['rest'],
): T[] {
  if (!rest) return [];
  return fetched.slice(rest.from - fetchedFrom, rest.to - fetchedFrom + 1);
}
