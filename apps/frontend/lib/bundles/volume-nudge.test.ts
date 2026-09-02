import { describe, it, expect } from "vitest";
import { bestVolumeNudge, countQualifying, nextTier, nudgeMessage } from "./volume-nudge";
import type { VolumeOffer, VolumeTier } from "@/lib/api/promos";
import type { CartItem } from "@/lib/cart";

const HOODIE = "hoodie-id";
const CAP = "cap-id";

const line = (productId: string, quantity: number): CartItem => ({
  variantId: `${productId}-v`,
  productId,
  productTitle: productId,
  variantTitle: null,
  price: 100,
  image: null,
  quantity,
});

const tier = (minCount: number, value = 10, valueType: VolumeTier["valueType"] = "percentage"): VolumeTier => ({
  minCount,
  valueType,
  value,
});

const offer = (over: Partial<VolumeOffer> = {}): VolumeOffer => ({
  promoCodeId: "volume-1",
  label: "Buy more, save more",
  productIds: null,
  tiers: [tier(3, 10), tier(5, 15)],
  ...over,
});

const money = (ghs: number) => `GH₵ ${ghs}`;

describe("countQualifying", () => {
  it("counts repeats of the same product", () => {
    expect(countQualifying([line(HOODIE, 3)], null)).toBe(3);
  });

  it("counts everything when unrestricted", () => {
    expect(countQualifying([line(HOODIE, 2), line(CAP, 1)], null)).toBe(3);
    expect(countQualifying([line(HOODIE, 2), line(CAP, 1)], [])).toBe(3);
  });

  it("counts only the listed products when restricted", () => {
    const cart = [line(HOODIE, 2), line(CAP, 4)];
    expect(countQualifying(cart, [HOODIE])).toBe(2);
    expect(countQualifying(cart, ["nothing-in-cart"])).toBe(0);
  });
});

describe("nextTier", () => {
  it("points at the first threshold from below", () => {
    expect(nextTier(offer(), 1)).toEqual({ needed: 2, tier: tier(3, 10) });
  });

  it("points at the next one up from between tiers", () => {
    expect(nextTier(offer(), 3)).toEqual({ needed: 2, tier: tier(5, 15) });
  });

  it("has nothing left to chase at or past the top tier", () => {
    expect(nextTier(offer(), 5)).toBeNull();
    expect(nextTier(offer(), 9)).toBeNull();
  });
});

describe("bestVolumeNudge", () => {
  it("returns nothing without offers or a cart", () => {
    expect(bestVolumeNudge([], [line(HOODIE, 2)])).toBeNull();
    expect(bestVolumeNudge([offer()], [])).toBeNull();
  });

  it("returns nothing once the top tier is cleared", () => {
    expect(bestVolumeNudge([offer()], [line(HOODIE, 5)])).toBeNull();
  });

  it("ignores a scoped rule the cart holds nothing for", () => {
    const scoped = offer({ productIds: [CAP] });
    expect(bestVolumeNudge([scoped], [line(HOODIE, 2)])).toBeNull();
  });

  it("prefers the threshold that is closest", () => {
    const far = offer({ promoCodeId: "far", tiers: [tier(8, 40)] });
    const near = offer({ promoCodeId: "near", tiers: [tier(3, 10)] });
    const best = bestVolumeNudge([far, near], [line(HOODIE, 2)]);
    expect(best?.offer.promoCodeId).toBe("near");
    expect(best?.needed).toBe(1);
  });

  it("breaks a tie on the bigger saving", () => {
    const small = offer({ promoCodeId: "small", tiers: [tier(3, 10)] });
    const big = offer({ promoCodeId: "big", tiers: [tier(3, 25)] });
    expect(bestVolumeNudge([small, big], [line(HOODIE, 2)])?.offer.promoCodeId).toBe("big");
  });

  it("marks a restricted rule as scoped", () => {
    const scoped = offer({ productIds: [HOODIE] });
    expect(bestVolumeNudge([scoped], [line(HOODIE, 2)])?.scoped).toBe(true);
    expect(bestVolumeNudge([offer()], [line(HOODIE, 2)])?.scoped).toBe(false);
  });
});

describe("nudgeMessage", () => {
  it("is singular one item away and plural beyond", () => {
    const one = bestVolumeNudge([offer()], [line(HOODIE, 2)])!;
    expect(nudgeMessage(one, money)).toBe("Add 1 more item to save 10%");

    const two = bestVolumeNudge([offer()], [line(HOODIE, 1)])!;
    expect(nudgeMessage(two, money)).toBe("Add 2 more items to save 10%");
  });

  it("formats a fixed tier through the locale formatter", () => {
    const fixed = offer({ tiers: [tier(3, 50, "fixed")] });
    const nudge = bestVolumeNudge([fixed], [line(HOODIE, 2)])!;
    expect(nudgeMessage(nudge, money)).toBe("Add 1 more item to save GH₵ 50");
  });

  it("says qualifying when only some products count", () => {
    const scoped = offer({ productIds: [HOODIE] });
    const nudge = bestVolumeNudge([scoped], [line(HOODIE, 2)])!;
    expect(nudgeMessage(nudge, money)).toBe("Add 1 more qualifying item to save 10%");
  });
});
