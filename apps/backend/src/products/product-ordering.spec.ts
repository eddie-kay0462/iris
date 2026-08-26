import { describe, it, expect } from 'vitest';
import { splitPageWindow } from './product-ordering';

/**
 * The catalog is served as [anchors..., everything else...]. These cases walk a
 * 16-per-page grid across the seam and assert that every index of the combined
 * list is served exactly once — no gaps, no duplicates.
 */
describe('splitPageWindow', () => {
  const page = (n: number, limit = 16) => ({
    from: (n - 1) * limit,
    to: n * limit - 1,
  });

  it('fills page 1 with the anchors then tops up from the tail', () => {
    const { from, to } = page(1);
    const w = splitPageWindow(from, to, 2);
    expect(w.anchors).toEqual([0, 2]); // both anchors
    expect(w.rest).toEqual({ from: 0, to: 13 }); // 14 more to make 16
  });

  it('continues the tail on page 2 with no gap and no overlap', () => {
    const w1 = splitPageWindow(page(1).from, page(1).to, 2);
    const w2 = splitPageWindow(page(2).from, page(2).to, 2);
    expect(w1.rest!.to + 1).toBe(w2.rest!.from);
    expect(w2.anchors).toEqual([2, 2]); // anchors exhausted — empty slice
    expect(w2.rest).toEqual({ from: 14, to: 29 });
  });

  it('serves a page that sits entirely inside the anchor block', () => {
    // 20 anchors, 16 per page: page 1 is all anchors and never touches the tail.
    const w = splitPageWindow(page(1).from, page(1).to, 20);
    expect(w.anchors).toEqual([0, 16]);
    expect(w.rest).toBeNull();
  });

  it('straddles the seam when the anchors run out mid-page', () => {
    // 20 anchors: page 2 takes the last 4, then 12 from the tail.
    const w = splitPageWindow(page(2).from, page(2).to, 20);
    expect(w.anchors).toEqual([16, 20]);
    expect(w.rest).toEqual({ from: 0, to: 11 });
  });

  it('behaves exactly like an unhoisted list when there are no anchors', () => {
    const w = splitPageWindow(page(3).from, page(3).to, 0);
    expect(w.anchors).toEqual([0, 0]);
    expect(w.rest).toEqual({ from: 32, to: 47 });
  });

  it('never asks for a negative tail index', () => {
    const w = splitPageWindow(0, 15, 5);
    expect(w.rest!.from).toBeGreaterThanOrEqual(0);
  });

  it('covers every index exactly once across many pages', () => {
    const anchorTotal = 3;
    const limit = 16;
    const seen: string[] = [];

    for (let p = 1; p <= 5; p++) {
      const { from, to } = page(p, limit);
      const w = splitPageWindow(from, to, anchorTotal);
      for (let i = w.anchors[0]; i < w.anchors[1]; i++) seen.push(`A${i}`);
      if (w.rest) {
        for (let i = w.rest.from; i <= w.rest.to; i++) seen.push(`B${i}`);
      }
    }

    // 5 pages × 16 slots, and nothing served twice.
    expect(seen).toHaveLength(80);
    expect(new Set(seen).size).toBe(80);
    // The anchors lead, then the tail runs unbroken from its own index 0.
    expect(seen.slice(0, 4)).toEqual(['A0', 'A1', 'A2', 'B0']);
  });
});
