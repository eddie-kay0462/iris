/**
 * Pure discount maths — no Supabase, no Nest, no I/O.
 *
 * Everything here is a function of its arguments so the tier logic can be
 * unit-tested exhaustively. `DiscountEngineService` does the loading and the
 * persistence; this file decides what a cart is worth.
 */
import { round2 } from '../analytics/analytics.constants';

export type SalesChannel = 'online' | 'popup' | 'walkin';
export type DiscountSource = 'code' | 'pairing' | 'manual';
export type PairingBasis = 'units' | 'products';
export type PairingAppliesTo = 'anchor' | 'cart';
export type ValueType = 'percentage' | 'fixed';
export type PromoDiscountType =
  | 'fixed'
  | 'percentage'
  | 'free_shipping'
  | 'product'
  | 'pairing';

export interface EngineItem {
  productId: string;
  variantId?: string | null;
  unitPrice: number;
  quantity: number;
}

export interface PairingTier {
  id?: string;
  min_paired_count: number;
  value_type: ValueType;
  value: number;
  max_discount_amount: number | null;
}

export interface PromoRule {
  id: string;
  code: string | null;
  description: string | null;
  discount_type: PromoDiscountType;
  discount_value: number;
  applicable_product_ids: string[] | null;
  min_order_amount: number | null;
  max_discount_amount: number | null;
  max_uses: number | null;
  used_count: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  auto_apply: boolean;
  anchor_product_id: string | null;
  pairing_basis: PairingBasis | null;
  applies_to: PairingAppliesTo | null;
  channels: string[] | null;
  tiers?: PairingTier[];
}

export interface ManualOverride {
  type: ValueType;
  value: number;
  reason?: string | null;
}

export interface EvalContext {
  channel: SalesChannel;
  items: EngineItem[];
  subtotal: number;
  shippingCost: number;
  now?: Date;
}

export interface DiscountCandidate {
  source: DiscountSource;
  promoCodeId: string | null;
  code: string | null;
  label: string;
  discountType: PromoDiscountType | ValueType;
  amount: number;
  /** Pairing only — how the tier was reached, for the ledger. */
  pairing?: {
    anchorProductId: string;
    basis: PairingBasis;
    appliesTo: PairingAppliesTo;
    pairedCount: number;
    tier: PairingTier;
  };
  /** Manual only. */
  manual?: ManualOverride;
}

export interface RejectedRule {
  promoCodeId: string | null;
  code: string | null;
  label: string;
  reason: string;
}

// ─── Cart arithmetic ─────────────────────────────────────────────────────────

export const lineTotal = (item: EngineItem): number =>
  round2(item.unitPrice * item.quantity);

export const subtotalOf = (items: EngineItem[]): number =>
  round2(items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0));

export const anchorLineTotal = (
  items: EngineItem[],
  anchorProductId: string,
): number =>
  round2(
    items
      .filter((i) => i.productId === anchorProductId)
      .reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
  );

export const hasProduct = (items: EngineItem[], productId: string): boolean =>
  items.some((i) => i.productId === productId && i.quantity > 0);

/**
 * How many items are paired with the anchor.
 *
 * The anchor's own quantity never counts toward its tier — buying three of the
 * anchor and nothing else pairs it with nothing.
 */
export function countPaired(
  items: EngineItem[],
  anchorProductId: string,
  basis: PairingBasis,
): number {
  const others = items.filter(
    (i) => i.productId !== anchorProductId && i.quantity > 0,
  );
  if (basis === 'products') {
    return new Set(others.map((i) => i.productId)).size;
  }
  return others.reduce((sum, i) => sum + i.quantity, 0);
}

/** The highest tier the paired count satisfies, or null if it clears none. */
export function selectTier(
  tiers: PairingTier[],
  pairedCount: number,
): PairingTier | null {
  const eligible = tiers.filter((t) => pairedCount >= t.min_paired_count);
  if (eligible.length === 0) return null;
  return eligible.reduce((best, t) =>
    t.min_paired_count > best.min_paired_count ? t : best,
  );
}

/** Apply a tier's value to whichever base the rule targets. */
export function computePairingDiscount(
  rule: PromoRule,
  tier: PairingTier,
  items: EngineItem[],
  subtotal: number,
): number {
  const base =
    rule.applies_to === 'cart'
      ? subtotal
      : anchorLineTotal(items, rule.anchor_product_id!);

  const raw =
    tier.value_type === 'percentage' ? (base * tier.value) / 100 : tier.value;

  const capped =
    tier.max_discount_amount !== null && tier.max_discount_amount !== undefined
      ? Math.min(raw, tier.max_discount_amount)
      : raw;

  return round2(Math.max(0, Math.min(capped, base)));
}

/**
 * Code-based discounts. Behaviour is carried over unchanged from the original
 * PromosService.computeDiscount so existing codes keep valuing identically.
 */
export function computeCodeDiscount(
  rule: PromoRule,
  ctx: EvalContext,
): number {
  switch (rule.discount_type) {
    case 'fixed':
      return round2(Math.min(rule.discount_value, ctx.subtotal));

    case 'percentage': {
      const raw = ctx.subtotal * (rule.discount_value / 100);
      return round2(
        rule.max_discount_amount !== null
          ? Math.min(raw, rule.max_discount_amount)
          : raw,
      );
    }

    case 'free_shipping':
      return round2(ctx.shippingCost);

    case 'product': {
      if (!rule.applicable_product_ids?.length || !ctx.items.length) return 0;
      const eligibleSubtotal = ctx.items
        .filter((i) => rule.applicable_product_ids!.includes(i.productId))
        .reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
      return round2(Math.min(rule.discount_value, eligibleSubtotal));
    }

    default:
      return 0;
  }
}

export function computeManualDiscount(
  override: ManualOverride,
  subtotal: number,
): number {
  const raw =
    override.type === 'percentage'
      ? (subtotal * override.value) / 100
      : override.value;
  return round2(Math.max(0, Math.min(raw, subtotal)));
}

// ─── Eligibility ─────────────────────────────────────────────────────────────

/**
 * Returns a human-readable reason the rule cannot apply, or null if it can.
 *
 * A rejected *typed code* is surfaced to the customer as an error; a rejected
 * *auto rule* just stays quiet and lands in the ledger's `rejected[]`. Same
 * gates either way, so the two paths can never drift.
 */
export function checkEligibility(
  rule: PromoRule,
  ctx: EvalContext,
): string | null {
  const now = ctx.now ?? new Date();

  if (!rule.is_active) return 'This promo code is no longer active';
  if (rule.starts_at && new Date(rule.starts_at) > now)
    return 'This promo code is not yet valid';
  if (rule.expires_at && new Date(rule.expires_at) < now)
    return 'This promo code has expired';
  if (rule.max_uses !== null && rule.used_count >= rule.max_uses)
    return 'This promo code has reached its usage limit';
  if (rule.min_order_amount !== null && ctx.subtotal < rule.min_order_amount)
    return `Minimum order amount for this code is GH₵ ${Number(rule.min_order_amount).toLocaleString()}`;
  if (rule.channels?.length && !rule.channels.includes(ctx.channel))
    return `This promo code is not valid for ${ctx.channel} sales`;

  return null;
}

export const ruleLabel = (rule: PromoRule): string =>
  rule.code || rule.description || `Pairing rule ${rule.id.slice(0, 8)}`;

// ─── Candidate building ──────────────────────────────────────────────────────

/**
 * Evaluate one pairing rule against the cart. Returns the candidate it would
 * contribute, or a rejection explaining why it stayed quiet.
 */
export function evaluatePairingRule(
  rule: PromoRule,
  ctx: EvalContext,
): { candidate?: DiscountCandidate; rejected?: RejectedRule } {
  const reject = (reason: string) => ({
    rejected: {
      promoCodeId: rule.id,
      code: rule.code,
      label: ruleLabel(rule),
      reason,
    },
  });

  if (!rule.anchor_product_id) return reject('Rule has no anchor product');
  if (!hasProduct(ctx.items, rule.anchor_product_id))
    return reject('Anchor product not in cart');

  const eligibility = checkEligibility(rule, ctx);
  if (eligibility) return reject(eligibility);

  const tiers = rule.tiers ?? [];
  if (tiers.length === 0) return reject('Rule has no tiers configured');

  const basis: PairingBasis = rule.pairing_basis ?? 'units';
  const pairedCount = countPaired(ctx.items, rule.anchor_product_id, basis);
  const tier = selectTier(tiers, pairedCount);

  if (!tier) {
    const lowest = Math.min(...tiers.map((t) => t.min_paired_count));
    return reject(
      `Needs ${lowest} paired ${basis === 'products' ? 'product' : 'item'}(s), cart has ${pairedCount}`,
    );
  }

  const amount = computePairingDiscount(rule, tier, ctx.items, ctx.subtotal);
  if (amount <= 0) return reject('Tier resolved to a zero discount');

  return {
    candidate: {
      source: 'pairing',
      promoCodeId: rule.id,
      code: rule.code,
      label: ruleLabel(rule),
      discountType: 'pairing',
      amount,
      pairing: {
        anchorProductId: rule.anchor_product_id,
        basis,
        appliesTo: rule.applies_to ?? 'anchor',
        pairedCount,
        tier,
      },
    },
  };
}

/**
 * Best-wins, no stacking.
 *
 * A staff manual override short-circuits everything — it is a deliberate act at
 * the counter, not a candidate to be out-bid. Otherwise the largest discount
 * wins, and a tie goes to the typed code because the customer asked for it by
 * name.
 */
export function pickWinner(
  candidates: DiscountCandidate[],
  manualOverride?: DiscountCandidate | null,
): DiscountCandidate | null {
  if (manualOverride && manualOverride.amount > 0) return manualOverride;

  const usable = candidates.filter((c) => c.amount > 0);
  if (usable.length === 0) return null;

  return usable.reduce((best, c) => {
    if (c.amount > best.amount) return c;
    if (c.amount === best.amount && c.source === 'code' && best.source !== 'code')
      return c;
    return best;
  });
}

/** How much the winner left on the table, for the "you could have had" warning. */
export function bestAlternative(
  candidates: DiscountCandidate[],
  winner: DiscountCandidate | null,
): DiscountCandidate | null {
  const others = candidates.filter((c) => c !== winner && c.amount > 0);
  if (others.length === 0) return null;
  return others.reduce((best, c) => (c.amount > best.amount ? c : best));
}
