import type { CartItem } from "@/lib/cart";
import type { VolumeOffer, VolumeTier } from "@/lib/api/promos";

/**
 * "Add one more item and you'll save 15%".
 *
 * The cart never calls /promos/resolve — that starts at checkout — so the nudge
 * is worked out client-side from the cart-independent offer feed. It is
 * decoration only: what a basket is actually worth is still decided by the
 * server's discount engine at checkout, so nothing here can affect a price.
 */
export interface VolumeNudge {
  offer: VolumeOffer;
  /** How many more qualifying items are needed to reach `tier`. */
  needed: number;
  tier: VolumeTier;
  /** True when only some products count toward the threshold. */
  scoped: boolean;
}

/**
 * How many qualifying units the cart holds — the client mirror of the engine's
 * `countUnits`. Quantity is all that matters, so three of the same product
 * counts as three. A null or empty restriction counts the whole cart.
 */
export function countQualifying(
  items: CartItem[],
  productIds: string[] | null,
): number {
  const scoped = productIds?.length
    ? items.filter((i) => productIds.includes(i.productId))
    : items;
  return scoped.reduce((sum, i) => sum + Math.max(0, i.quantity), 0);
}

/**
 * The lowest tier still out of reach, and how far away it is.
 *
 * Null once the cart has cleared the top tier — there is nothing left to nudge
 * toward, and the discount itself shows up at checkout.
 */
export function nextTier(
  offer: VolumeOffer,
  count: number,
): { needed: number; tier: VolumeTier } | null {
  const ahead = offer.tiers
    .filter((t) => t.minCount > count)
    .sort((a, b) => a.minCount - b.minCount);
  if (!ahead.length) return null;
  return { needed: ahead[0].minCount - count, tier: ahead[0] };
}

/**
 * The single nudge worth showing.
 *
 * Closest first — a threshold one item away is the one a shopper will actually
 * act on — and the bigger saving breaks a tie.
 */
export function bestVolumeNudge(
  offers: VolumeOffer[],
  items: CartItem[],
): VolumeNudge | null {
  if (!offers?.length || !items.length) return null;

  const nudges: VolumeNudge[] = [];

  for (const offer of offers) {
    if (!offer.tiers?.length) continue;
    const count = countQualifying(items, offer.productIds);
    // A scoped rule the cart holds nothing for isn't a deal, it's an advert.
    if (count === 0) continue;

    const next = nextTier(offer, count);
    if (!next) continue;

    nudges.push({
      offer,
      needed: next.needed,
      tier: next.tier,
      scoped: !!offer.productIds?.length,
    });
  }

  if (!nudges.length) return null;

  return nudges.reduce((best, n) => {
    if (n.needed !== best.needed) return n.needed < best.needed ? n : best;
    return n.tier.value > best.tier.value ? n : best;
  });
}

/**
 * The nudge as a sentence. `formatPrice` comes from the locale provider, so a
 * fixed-amount tier is quoted in whatever currency the shopper is browsing in.
 */
export function nudgeMessage(
  nudge: VolumeNudge,
  formatPrice: (ghs: number) => string,
): string {
  const saving =
    nudge.tier.valueType === "percentage"
      ? `${Number(nudge.tier.value)}%`
      : formatPrice(nudge.tier.value);

  const what = nudge.scoped
    ? `${nudge.needed === 1 ? "1 more qualifying item" : `${nudge.needed} more qualifying items`}`
    : `${nudge.needed === 1 ? "1 more item" : `${nudge.needed} more items`}`;

  return `Add ${what} to save ${saving}`;
}
