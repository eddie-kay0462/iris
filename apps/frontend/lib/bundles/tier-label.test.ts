import { describe, it, expect } from "vitest";
import { describeTiers, tierRange, tierRangeLabel } from "./tier-label";
import type { BundleTier } from "@/lib/api/promos";

const tiers = (...mins: number[]): BundleTier[] =>
  mins.map((minPairedCount) => ({
    minPairedCount,
    valueType: "percentage" as const,
    value: 10,
  }));

describe("tierRange", () => {
  it("closes every tier at the one above it", () => {
    const t = tiers(1, 2, 3);
    expect(tierRange(t, 0)).toEqual({ from: 1, to: 1 });
    expect(tierRange(t, 1)).toEqual({ from: 2, to: 2 });
    expect(tierRange(t, 2)).toEqual({ from: 3, to: null });
  });

  it("spans the gap when thresholds skip numbers", () => {
    const t = tiers(1, 3, 6);
    expect(tierRange(t, 0)).toEqual({ from: 1, to: 2 });
    expect(tierRange(t, 1)).toEqual({ from: 3, to: 5 });
    expect(tierRange(t, 2)).toEqual({ from: 6, to: null });
  });

  it("leaves a lone tier open-ended", () => {
    expect(tierRange(tiers(2), 0)).toEqual({ from: 2, to: null });
  });

  it("sorts before reading, so unordered tiers still work", () => {
    const t = tiers(3, 1, 2);
    expect(tierRange(t, 0)).toEqual({ from: 1, to: 1 });
    expect(tierRange(t, 2)).toEqual({ from: 3, to: null });
  });
});

describe("tierRangeLabel", () => {
  it("does not say 'or more' when a higher tier follows", () => {
    const t = tiers(1, 2, 3);
    // This is the bug being fixed: at 2 items you get tier 2, not tier 1.
    expect(tierRangeLabel(t, 0, "units")).toBe("1 other item");
    expect(tierRangeLabel(t, 1, "units")).toBe("2 other items");
    expect(tierRangeLabel(t, 2, "units")).toBe("3 or more other items");
  });

  it("writes a span when thresholds skip numbers", () => {
    const t = tiers(1, 3);
    expect(tierRangeLabel(t, 0, "units")).toBe("1-2 other items");
    expect(tierRangeLabel(t, 1, "units")).toBe("3 or more other items");
  });

  it("keeps 'or more' for a single-tier deal", () => {
    expect(tierRangeLabel(tiers(1), 0, "units")).toBe("1 or more other item");
    expect(tierRangeLabel(tiers(2), 0, "units")).toBe("2 or more other items");
  });

  it("uses the right noun for each counting basis", () => {
    const t = tiers(1, 2, 3);
    expect(tierRangeLabel(t, 0, "products")).toBe("1 other product");
    expect(tierRangeLabel(t, 1, "products")).toBe("2 other products");
    expect(tierRangeLabel(t, 2, "products")).toBe("3 or more other products");
  });

  it("pluralises on the number actually shown", () => {
    const t = tiers(1, 2);
    expect(tierRangeLabel(t, 0, "units")).toBe("1 other item");
    expect(tierRangeLabel(tiers(1), 0, "units")).toContain("other item");
  });
});

describe("describeTiers", () => {
  it("returns tiers in order with the right phrase on each", () => {
    const out = describeTiers(tiers(3, 1, 2), "units");
    expect(out.map((d) => d.tier.minPairedCount)).toEqual([1, 2, 3]);
    expect(out.map((d) => d.rangeLabel)).toEqual([
      "1 other item",
      "2 other items",
      "3 or more other items",
    ]);
  });

  it("labels correctly even when handed an unsorted array", () => {
    // The whole point: a caller mapping its own index over an unsorted array
    // would put the "or more" phrase on the wrong row.
    const out = describeTiers(tiers(6, 1, 3), "units");
    expect(out.map((d) => d.rangeLabel)).toEqual([
      "1-2 other items",
      "3-5 other items",
      "6 or more other items",
    ]);
  });
});
