import { describe, it, expect } from 'vitest';
import {
  bundleHeadline,
  isAdvertisable,
  EngineItem,
  EvalContext,
  PairingTier,
  PromoRule,
  bestAlternative,
  computeManualDiscount,
  computeCodeDiscount,
  computePairingDiscount,
  computeVolumeDiscount,
  countPaired,
  countUnits,
  evaluatePairingRule,
  evaluateVolumeRule,
  pickWinner,
  selectTier,
  subtotalOf,
} from './discount-engine.rules';

const ANCHOR = '11111111-1111-1111-1111-111111111111';
const HOODIE = '22222222-2222-2222-2222-222222222222';
const CAP = '33333333-3333-3333-3333-333333333333';

const item = (productId: string, unitPrice: number, quantity: number): EngineItem => ({
  productId,
  unitPrice,
  quantity,
});

const tiers = (...specs: [number, 'percentage' | 'fixed', number][]): PairingTier[] =>
  specs.map(([min_paired_count, value_type, value]) => ({
    min_paired_count,
    value_type,
    value,
    max_discount_amount: null,
  }));

const rule = (over: Partial<PromoRule> = {}): PromoRule => ({
  id: 'rule-1',
  code: null,
  description: 'Signature Tee bundle',
  discount_type: 'pairing',
  discount_value: 0,
  applicable_product_ids: null,
  min_order_amount: null,
  max_discount_amount: null,
  max_uses: null,
  used_count: 0,
  starts_at: null,
  expires_at: null,
  is_active: true,
  auto_apply: true,
  anchor_product_id: ANCHOR,
  pairing_basis: 'units',
  applies_to: 'anchor',
  channels: ['online', 'popup', 'walkin'],
  tiers: tiers([1, 'percentage', 10], [2, 'percentage', 20], [3, 'percentage', 30]),
  ...over,
});

const ctxOf = (items: EngineItem[], over: Partial<EvalContext> = {}): EvalContext => ({
  channel: 'online',
  items,
  subtotal: subtotalOf(items),
  shippingCost: 0,
  ...over,
});

describe('countPaired', () => {
  it('counts nothing when the anchor is alone', () => {
    expect(countPaired([item(ANCHOR, 200, 1)], ANCHOR, 'units')).toBe(0);
  });

  it('does not let the anchor pair with itself', () => {
    expect(countPaired([item(ANCHOR, 200, 5)], ANCHOR, 'units')).toBe(0);
    expect(countPaired([item(ANCHOR, 200, 5)], ANCHOR, 'products')).toBe(0);
  });

  it('units sums the quantity of every other line', () => {
    const cart = [item(ANCHOR, 200, 1), item(HOODIE, 300, 2)];
    expect(countPaired(cart, ANCHOR, 'units')).toBe(2);
  });

  it('products counts distinct other products, ignoring quantity', () => {
    const cart = [item(ANCHOR, 200, 1), item(HOODIE, 300, 2)];
    expect(countPaired(cart, ANCHOR, 'products')).toBe(1);
  });

  it('the two bases diverge exactly where the plan says they do', () => {
    const cart = [item(ANCHOR, 200, 1), item(HOODIE, 300, 2), item(CAP, 50, 3)];
    expect(countPaired(cart, ANCHOR, 'units')).toBe(5);
    expect(countPaired(cart, ANCHOR, 'products')).toBe(2);
  });

  it('ignores zero-quantity lines', () => {
    const cart = [item(ANCHOR, 200, 1), item(HOODIE, 300, 0)];
    expect(countPaired(cart, ANCHOR, 'units')).toBe(0);
    expect(countPaired(cart, ANCHOR, 'products')).toBe(0);
  });
});

describe('selectTier', () => {
  const t = tiers([1, 'percentage', 10], [2, 'percentage', 20], [3, 'percentage', 30]);

  it('clears no tier at zero paired items', () => {
    expect(selectTier(t, 0)).toBeNull();
  });

  it('picks the exact tier at each threshold', () => {
    expect(selectTier(t, 1)?.value).toBe(10);
    expect(selectTier(t, 2)?.value).toBe(20);
    expect(selectTier(t, 3)?.value).toBe(30);
  });

  it('picks the highest satisfied tier when the count overshoots', () => {
    expect(selectTier(t, 5)?.value).toBe(30);
  });

  it('handles sparse and out-of-order thresholds', () => {
    const sparse = tiers([5, 'percentage', 50], [2, 'percentage', 20]);
    expect(selectTier(sparse, 4)?.value).toBe(20);
    expect(selectTier(sparse, 5)?.value).toBe(50);
    expect(selectTier(sparse, 1)).toBeNull();
  });
});

describe('computePairingDiscount', () => {
  const cart = [item(ANCHOR, 200, 1), item(HOODIE, 300, 1)];
  const subtotal = subtotalOf(cart); // 500

  it('applies_to anchor discounts only the anchor line', () => {
    const r = rule({ applies_to: 'anchor' });
    const tier = r.tiers![1]; // 20%
    expect(computePairingDiscount(r, tier, cart, subtotal)).toBe(40);
  });

  it('applies_to cart discounts the whole subtotal', () => {
    const r = rule({ applies_to: 'cart' });
    const tier = r.tiers![1]; // 20%
    expect(computePairingDiscount(r, tier, cart, subtotal)).toBe(100);
  });

  it('multiplies the anchor line by its quantity', () => {
    const bulk = [item(ANCHOR, 200, 3), item(HOODIE, 300, 1)];
    const r = rule({ applies_to: 'anchor' });
    expect(computePairingDiscount(r, r.tiers![1], bulk, subtotalOf(bulk))).toBe(120);
  });

  it('caps a percentage tier at max_discount_amount', () => {
    const r = rule({ applies_to: 'cart' });
    const capped: PairingTier = {
      min_paired_count: 2,
      value_type: 'percentage',
      value: 20,
      max_discount_amount: 60,
    };
    expect(computePairingDiscount(r, capped, cart, subtotal)).toBe(60);
  });

  it('clamps a fixed tier to the base it targets', () => {
    const r = rule({ applies_to: 'anchor' });
    const fixed: PairingTier = {
      min_paired_count: 1,
      value_type: 'fixed',
      value: 9999,
      max_discount_amount: null,
    };
    // Anchor line is 200, so a GH₵9999 tier cannot discount more than that.
    expect(computePairingDiscount(r, fixed, cart, subtotal)).toBe(200);
  });
});

describe('evaluatePairingRule', () => {
  it('stays quiet when the anchor is not in the cart', () => {
    const result = evaluatePairingRule(rule(), ctxOf([item(HOODIE, 300, 1)]));
    expect(result.candidate).toBeUndefined();
    expect(result.rejected?.reason).toBe('Anchor product not in cart');
  });

  it('explains itself when the cart clears no tier', () => {
    const result = evaluatePairingRule(rule(), ctxOf([item(ANCHOR, 200, 1)]));
    expect(result.candidate).toBeUndefined();
    expect(result.rejected?.reason).toContain('Needs 1 paired');
  });

  it('fires with the matched tier and paired count recorded', () => {
    const cart = [item(ANCHOR, 200, 1), item(HOODIE, 300, 2)];
    const result = evaluatePairingRule(rule(), ctxOf(cart));
    expect(result.candidate?.amount).toBe(40); // 20% of the 200 anchor line
    expect(result.candidate?.pairing?.pairedCount).toBe(2);
    expect(result.candidate?.pairing?.tier.min_paired_count).toBe(2);
  });

  it('respects the channel whitelist', () => {
    const cart = [item(ANCHOR, 200, 1), item(HOODIE, 300, 1)];
    const online = rule({ channels: ['online'] });
    expect(evaluatePairingRule(online, ctxOf(cart, { channel: 'walkin' })).rejected?.reason)
      .toContain('not valid for walkin');
    expect(evaluatePairingRule(online, ctxOf(cart, { channel: 'online' })).candidate)
      .toBeDefined();
  });

  it('respects min_order_amount, expiry and the usage cap', () => {
    const cart = [item(ANCHOR, 200, 1), item(HOODIE, 300, 1)];
    const ctx = ctxOf(cart); // subtotal 500

    expect(evaluatePairingRule(rule({ min_order_amount: 900 }), ctx).rejected?.reason)
      .toContain('Minimum order amount');
    expect(evaluatePairingRule(rule({ expires_at: '2020-01-01T00:00:00Z' }), ctx).rejected?.reason)
      .toBe('This promo code has expired');
    expect(evaluatePairingRule(rule({ max_uses: 5, used_count: 5 }), ctx).rejected?.reason)
      .toBe('This promo code has reached its usage limit');
    expect(evaluatePairingRule(rule({ is_active: false }), ctx).rejected?.reason)
      .toBe('This promo code is no longer active');
  });

  it('rejects a rule with no tiers rather than silently discounting nothing', () => {
    const cart = [item(ANCHOR, 200, 1), item(HOODIE, 300, 1)];
    expect(evaluatePairingRule(rule({ tiers: [] }), ctxOf(cart)).rejected?.reason)
      .toBe('Rule has no tiers configured');
  });
});

describe('pickWinner — best-wins, no stacking', () => {
  const code = (amount: number) => ({
    source: 'code' as const,
    promoCodeId: 'c1',
    code: 'SAVE',
    label: 'SAVE',
    discountType: 'fixed' as const,
    amount,
  });
  const pairing = (amount: number) => ({
    source: 'pairing' as const,
    promoCodeId: 'p1',
    code: null,
    label: 'Bundle',
    discountType: 'pairing' as const,
    amount,
  });
  const manual = (amount: number) => ({
    source: 'manual' as const,
    promoCodeId: null,
    code: null,
    label: 'Staff discount',
    discountType: 'fixed' as const,
    amount,
  });

  it('the larger discount wins', () => {
    expect(pickWinner([code(50), pairing(40)])?.source).toBe('code');
    expect(pickWinner([code(20), pairing(40)])?.source).toBe('pairing');
  });

  it('a tie goes to the typed code', () => {
    expect(pickWinner([pairing(40), code(40)])?.source).toBe('code');
  });

  it('a manual override short-circuits both, even when it is worth less', () => {
    expect(pickWinner([code(50), pairing(40)], manual(5))?.source).toBe('manual');
  });

  it('a zero-value manual override does not suppress the rules', () => {
    expect(pickWinner([code(50)], manual(0))?.source).toBe('code');
  });

  it('returns null when nothing applies', () => {
    expect(pickWinner([])).toBeNull();
    expect(pickWinner([code(0), pairing(0)])).toBeNull();
  });

  it('bestAlternative reports what the winner beat', () => {
    const candidates = [code(50), pairing(40)];
    const winner = pickWinner(candidates)!;
    expect(bestAlternative(candidates, winner)?.amount).toBe(40);
    // With a manual override in play, everything on the table was passed over.
    expect(bestAlternative(candidates, null)?.amount).toBe(50);
  });
});

describe('computeManualDiscount', () => {
  it('resolves a percentage against the subtotal', () => {
    expect(computeManualDiscount({ type: 'percentage', value: 10 }, 500)).toBe(50);
  });

  it('clamps a fixed override to the subtotal — no negative totals', () => {
    expect(computeManualDiscount({ type: 'fixed', value: 9999 }, 500)).toBe(500);
  });

  it('rounds to the pesewa', () => {
    expect(computeManualDiscount({ type: 'percentage', value: 33.333 }, 99.99)).toBe(33.33);
  });
});

describe('isAdvertisable — what earns a storefront badge', () => {
  it('advertises a live rule with an anchor and tiers', () => {
    expect(isAdvertisable(rule(), 'online')).toBe(true);
  });

  it('will not advertise an inactive, expired, or exhausted rule', () => {
    expect(isAdvertisable(rule({ is_active: false }), 'online')).toBe(false);
    expect(isAdvertisable(rule({ expires_at: '2020-01-01T00:00:00Z' }), 'online')).toBe(false);
    expect(isAdvertisable(rule({ max_uses: 3, used_count: 3 }), 'online')).toBe(false);
  });

  it('will not advertise a rule that has not started yet', () => {
    expect(isAdvertisable(rule({ starts_at: '2099-01-01T00:00:00Z' }), 'online')).toBe(false);
  });

  it('respects the channel whitelist', () => {
    const popupOnly = rule({ channels: ['popup'] });
    expect(isAdvertisable(popupOnly, 'online')).toBe(false);
    expect(isAdvertisable(popupOnly, 'popup')).toBe(true);
  });

  it('will not advertise a rule with no anchor or no tiers', () => {
    expect(isAdvertisable(rule({ anchor_product_id: null }), 'online')).toBe(false);
    expect(isAdvertisable(rule({ tiers: [] }), 'online')).toBe(false);
  });

  it('ignores min_order_amount — a badge cannot know the basket yet', () => {
    // checkEligibility would reject this against an empty cart; a product badge
    // must not blink out just because nothing has been added.
    expect(isAdvertisable(rule({ min_order_amount: 5000 }), 'online')).toBe(true);
  });
});

describe('bundleHeadline', () => {
  it('quotes the best percentage tier', () => {
    expect(bundleHeadline(tiers([1, 'percentage', 10], [3, 'percentage', 30])))
      .toBe('Up to 30% off');
  });

  it('quotes the best fixed tier in cedis', () => {
    expect(bundleHeadline(tiers([1, 'fixed', 20], [2, 'fixed', 55])))
      .toBe('Up to GH₵55 off');
  });

  it('falls back to a neutral label when tiers mix types', () => {
    // Percentages and cedi amounts cannot be ranked without a basket, so
    // claiming a "best" would risk overstating the offer.
    expect(bundleHeadline(tiers([1, 'percentage', 10], [2, 'fixed', 50])))
      .toBe('Bundle deal');
  });

  it('falls back when there are no tiers or every tier is zero', () => {
    expect(bundleHeadline([])).toBe('Bundle deal');
    expect(bundleHeadline(tiers([1, 'percentage', 0]))).toBe('Bundle deal');
  });

  it('trims trailing zeros off decimal values', () => {
    expect(bundleHeadline(tiers([1, 'percentage', 12.5]))).toBe('Up to 12.5% off');
  });
});

// ─── Volume rules ────────────────────────────────────────────────────────────

const volumeRule = (over: Partial<PromoRule> = {}): PromoRule =>
  rule({
    discount_type: 'volume',
    description: 'Buy more, save more',
    anchor_product_id: null,
    pairing_basis: null,
    applies_to: null,
    tiers: tiers([3, 'percentage', 10], [5, 'percentage', 15]),
    ...over,
  });

describe('countUnits', () => {
  it('counts repeats of the same product', () => {
    expect(countUnits([item(HOODIE, 300, 3)], null)).toBe(3);
  });

  it('sums every line when there is no restriction', () => {
    const cart = [item(ANCHOR, 200, 1), item(HOODIE, 300, 2)];
    expect(countUnits(cart, null)).toBe(3);
    expect(countUnits(cart, [])).toBe(3);
  });

  it('counts only the listed products when restricted', () => {
    const cart = [item(ANCHOR, 200, 4), item(HOODIE, 300, 2)];
    expect(countUnits(cart, [HOODIE])).toBe(2);
    expect(countUnits(cart, [CAP])).toBe(0);
  });

  it('ignores zero-quantity lines', () => {
    expect(countUnits([item(HOODIE, 300, 0), item(CAP, 100, 2)], null)).toBe(2);
  });
});

describe('computeVolumeDiscount', () => {
  it('takes a percentage off the whole subtotal', () => {
    expect(computeVolumeDiscount(tiers([3, 'percentage', 10])[0], 900)).toBe(90);
  });

  it('takes a fixed amount off', () => {
    expect(computeVolumeDiscount(tiers([3, 'fixed', 50])[0], 900)).toBe(50);
  });

  it('honours the tier cap', () => {
    const tier = { ...tiers([3, 'percentage', 50])[0], max_discount_amount: 100 };
    expect(computeVolumeDiscount(tier, 900)).toBe(100);
  });

  it('never exceeds the subtotal', () => {
    expect(computeVolumeDiscount(tiers([3, 'fixed', 500])[0], 120)).toBe(120);
  });

  it('never goes negative', () => {
    expect(computeVolumeDiscount(tiers([3, 'fixed', 0])[0], 120)).toBe(0);
  });
});

describe('evaluateVolumeRule', () => {
  it('fires on three of the same product', () => {
    const cart = [item(HOODIE, 300, 3)];
    const { candidate } = evaluateVolumeRule(volumeRule(), ctxOf(cart));
    expect(candidate?.source).toBe('volume');
    expect(candidate?.volume?.count).toBe(3);
    expect(candidate?.amount).toBe(90); // 10% of 900
  });

  it('rejects a cart short of the lowest threshold', () => {
    const { candidate, rejected } = evaluateVolumeRule(
      volumeRule(),
      ctxOf([item(HOODIE, 300, 2)]),
    );
    expect(candidate).toBeUndefined();
    expect(rejected?.reason).toBe('Needs 3 item(s), cart has 2');
  });

  it('takes the highest satisfied tier on overshoot', () => {
    const cart = [item(HOODIE, 100, 9)];
    const { candidate } = evaluateVolumeRule(volumeRule(), ctxOf(cart));
    expect(candidate?.volume?.tier.min_paired_count).toBe(5);
    expect(candidate?.amount).toBe(135); // 15% of 900
  });

  it('counts only the restricted products', () => {
    const cart = [item(ANCHOR, 100, 4), item(HOODIE, 100, 2)];
    const restricted = volumeRule({ applicable_product_ids: [HOODIE] });
    const { candidate, rejected } = evaluateVolumeRule(restricted, ctxOf(cart));
    expect(candidate).toBeUndefined();
    expect(rejected?.reason).toBe('Needs 3 item(s), cart has 2');
  });

  it('still discounts the whole basket when restricted', () => {
    const cart = [item(ANCHOR, 100, 2), item(HOODIE, 100, 3)];
    const restricted = volumeRule({ applicable_product_ids: [HOODIE] });
    const { candidate } = evaluateVolumeRule(restricted, ctxOf(cart));
    expect(candidate?.volume?.countedProductIds).toEqual([HOODIE]);
    expect(candidate?.amount).toBe(50); // 10% of the full 500 subtotal
  });

  it('passes eligibility rejections straight through', () => {
    const cart = [item(HOODIE, 300, 3)];
    expect(
      evaluateVolumeRule(volumeRule({ is_active: false }), ctxOf(cart)).rejected?.reason,
    ).toBe('This promo code is no longer active');
    expect(
      evaluateVolumeRule(volumeRule(), ctxOf(cart, { channel: 'walkin' })).rejected,
    ).toBeUndefined();
    expect(
      evaluateVolumeRule(volumeRule({ channels: ['online'] }), ctxOf(cart, { channel: 'walkin' }))
        .rejected?.reason,
    ).toBe('This promo code is not valid for walkin sales');
    expect(
      evaluateVolumeRule(volumeRule({ min_order_amount: 1000 }), ctxOf(cart)).rejected?.reason,
    ).toContain('Minimum order amount');
  });

  it('rejects a rule with no tiers', () => {
    const { rejected } = evaluateVolumeRule(
      volumeRule({ tiers: [] }),
      ctxOf([item(HOODIE, 300, 3)]),
    );
    expect(rejected?.reason).toBe('Rule has no tiers configured');
  });
});

describe('computeCodeDiscount — volume', () => {
  it('values a code-gated volume rule off its tier', () => {
    const cart = [item(HOODIE, 300, 3)];
    const typed = volumeRule({ auto_apply: false, code: 'BULK' });
    expect(computeCodeDiscount(typed, ctxOf(cart))).toBe(90);
  });

  it('is worth nothing when no tier clears', () => {
    const cart = [item(HOODIE, 300, 2)];
    const typed = volumeRule({ auto_apply: false, code: 'BULK' });
    expect(computeCodeDiscount(typed, ctxOf(cart))).toBe(0);
  });
});

describe('pickWinner — volume against the rest', () => {
  const volumeCandidate = (amount: number) => ({
    source: 'volume' as const,
    promoCodeId: 'volume-1',
    code: null,
    label: 'Buy more, save more',
    discountType: 'volume' as const,
    amount,
  });

  const codeCandidate = (amount: number) => ({
    source: 'code' as const,
    promoCodeId: 'code-1',
    code: 'SAVE20',
    label: 'SAVE20',
    discountType: 'percentage' as const,
    amount,
  });

  it('out-bids a smaller pairing candidate', () => {
    const pairing = { ...volumeCandidate(40), source: 'pairing' as const };
    expect(pickWinner([pairing, volumeCandidate(60)])?.source).toBe('volume');
  });

  it('loses a tie to the typed code', () => {
    expect(pickWinner([volumeCandidate(50), codeCandidate(50)])?.source).toBe('code');
  });

  it('still wins outright on amount', () => {
    expect(pickWinner([volumeCandidate(80), codeCandidate(50)])?.source).toBe('volume');
  });
});
