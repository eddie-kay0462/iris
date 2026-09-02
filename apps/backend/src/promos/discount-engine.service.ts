import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';
import { round2 } from '../analytics/analytics.constants';
import {
  DiscountCandidate,
  DiscountSource,
  EngineItem,
  EvalContext,
  ManualOverride,
  PairingTier,
  PromoDiscountType,
  PromoRule,
  RejectedRule,
  SalesChannel,
  bestAlternative,
  bundleHeadline,
  checkEligibility,
  isAdvertisable,
  isLive,
  computeCodeDiscount,
  computeManualDiscount,
  evaluatePairingRule,
  evaluateVolumeRule,
  PairingBasis,
  PairingAppliesTo,
  pickWinner,
  ruleLabel,
  subtotalOf,
} from './discount-engine.rules';

export interface ResolveInput {
  channel: SalesChannel;
  items: EngineItem[];
  shippingCost?: number;
  /** A code typed by the customer or by staff at the counter. */
  code?: string | null;
  /** A free-form staff discount. Overrides rule-based discounts outright. */
  manualOverride?: ManualOverride | null;
}

export interface DiscountBreakdown {
  codeCandidate: DiscountCandidate | null;
  pairingCandidates: DiscountCandidate[];
  volumeCandidates: DiscountCandidate[];
  manualCandidate: DiscountCandidate | null;
  rejected: RejectedRule[];
  winner: DiscountSource | null;
  /** Set when a manual override was applied for less than an available rule. */
  overriddenBy: { label: string; amount: number } | null;
}

export interface DiscountResolution {
  subtotal: number;
  discountAmount: number;
  source: DiscountSource | null;
  promoCodeId: string | null;
  code: string | null;
  label: string | null;
  discountType: PromoDiscountType | 'percentage' | 'fixed' | 'none';
  /** Persisted verbatim into promo_redemptions.discount_type. */
  channelDiscountType:
    | 'none'
    | 'percentage'
    | 'fixed'
    | 'code'
    | 'pairing'
    | 'volume';
  breakdown: DiscountBreakdown;
  message: string;
}

export interface ReserveInput {
  resolution: DiscountResolution;
  channel: SalesChannel;
  orderTable: 'orders' | 'popup_orders' | 'walkin_orders';
  orderId: string;
  orderNumber?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  customerProfileId?: string | null;
  /** Staff member ringing up the sale. Null for storefront self-service. */
  appliedBy?: string | null;
  /** Cash sales are money-in-hand — reserve straight to confirmed. */
  confirmImmediately?: boolean;
}


export interface BundleOffer {
  promoCodeId: string;
  anchorProductId: string;
  label: string;
  headline: string;
  basis: PairingBasis;
  appliesTo: PairingAppliesTo;
  tiers: { minPairedCount: number; valueType: string; value: number }[];
}

/** A live volume rule, for the cart's "add one more" nudge. */
export interface VolumeOffer {
  promoCodeId: string;
  label: string;
  /** Null when every line in the cart counts. */
  productIds: string[] | null;
  tiers: { minCount: number; valueType: string; value: number }[];
}

const PROMO_SELECT = `
  id, code, description, discount_type, discount_value, applicable_product_ids,
  min_order_amount, max_discount_amount, max_uses, used_count, starts_at,
  expires_at, is_active, auto_apply, anchor_product_id, pairing_basis,
  applies_to, channels
`;

/**
 * The single discount authority for every sales channel.
 *
 * Storefront, walk-in and pop-up all route through `resolve()`, so a code is
 * worth the same everywhere and no channel is trusted to compute its own
 * amount — subtotals are derived from line items server-side.
 *
 * Redemption is two-phase: `reserve()` takes a usage seat when the order is
 * created, `confirm()` cashes it in on payment, `revert()` hands it back on
 * cancellation. That closes the max_uses race the old post-payment increment had.
 */
@Injectable()
export class DiscountEngineService {
  private readonly logger = new Logger(DiscountEngineService.name);

  constructor(private supabase: SupabaseService) {}

  // ─── Resolution ────────────────────────────────────────────────────────────

  async resolve(input: ResolveInput): Promise<DiscountResolution> {
    const items = (input.items ?? []).filter((i) => i.quantity > 0);
    const subtotal = subtotalOf(items);
    const shippingCost = round2(input.shippingCost ?? 0);

    const ctx: EvalContext = {
      channel: input.channel,
      items,
      subtotal,
      shippingCost,
    };

    const rejected: RejectedRule[] = [];

    const codeCandidate = await this.buildCodeCandidate(input.code, ctx);
    const { candidates: pairingCandidates, rejected: pairingRejects } =
      await this.buildPairingCandidates(ctx);
    rejected.push(...pairingRejects);

    const { candidates: volumeCandidates, rejected: volumeRejects } =
      await this.buildVolumeCandidates(ctx);
    rejected.push(...volumeRejects);

    const manualCandidate = this.buildManualCandidate(
      input.manualOverride,
      subtotal,
    );

    // A single cart applies at most one pairing rule, so overlapping anchors
    // cannot compound. The best one competes against the typed code.
    const bestPairing = pairingCandidates.length
      ? pairingCandidates.reduce((b, c) => (c.amount > b.amount ? c : b))
      : null;

    // Same one-rule-per-cart ceiling for volume rules.
    const bestVolume = volumeCandidates.length
      ? volumeCandidates.reduce((b, c) => (c.amount > b.amount ? c : b))
      : null;

    const contenders = [codeCandidate, bestPairing, bestVolume].filter(
      (c): c is DiscountCandidate => c !== null,
    );

    const winner = pickWinner(contenders, manualCandidate);

    // What the manual override cost the customer, so the POS can warn about it.
    const passedOver = manualCandidate
      ? bestAlternative(contenders, null)
      : null;

    const breakdown: DiscountBreakdown = {
      codeCandidate,
      pairingCandidates,
      volumeCandidates,
      manualCandidate,
      rejected,
      winner: winner?.source ?? null,
      overriddenBy:
        manualCandidate && passedOver && passedOver.amount > manualCandidate.amount
          ? { label: passedOver.label, amount: passedOver.amount }
          : null,
    };

    if (!winner) {
      return {
        subtotal,
        discountAmount: 0,
        source: null,
        promoCodeId: null,
        code: null,
        label: null,
        discountType: 'none',
        channelDiscountType: 'none',
        breakdown,
        message: 'No discount applied',
      };
    }

    return {
      subtotal,
      discountAmount: winner.amount,
      source: winner.source,
      promoCodeId: winner.promoCodeId,
      code: winner.code,
      label: winner.label,
      discountType: winner.discountType,
      channelDiscountType: this.channelDiscountType(winner),
      breakdown,
      message: this.messageFor(winner),
    };
  }

  private channelDiscountType(
    winner: DiscountCandidate,
  ): 'none' | 'percentage' | 'fixed' | 'code' | 'pairing' | 'volume' {
    if (winner.source === 'code') return 'code';
    if (winner.source === 'pairing') return 'pairing';
    if (winner.source === 'volume') return 'volume';
    return winner.manual?.type === 'percentage' ? 'percentage' : 'fixed';
  }

  private messageFor(winner: DiscountCandidate): string {
    switch (winner.source) {
      case 'code':
        return 'Promo code applied';
      case 'pairing': {
        const n = winner.pairing?.pairedCount ?? 0;
        return `Bundle deal applied — ${n} paired item${n === 1 ? '' : 's'}`;
      }
      case 'volume': {
        const n = winner.volume?.count ?? 0;
        return `Volume discount applied — ${n} item${n === 1 ? '' : 's'}`;
      }
      default:
        return 'Manual discount applied';
    }
  }

  /**
   * A typed code that fails throws — the person who typed it needs to know why.
   * (Auto rules that fail stay quiet; see buildPairingCandidates.)
   */
  /** Rows come back with numerics as strings; the maths needs numbers. */
  private mapTiers(row: any): PairingTier[] {
    return (row?.promo_pairing_tiers ?? []).map(
      (t: any): PairingTier => ({
        id: t.id,
        min_paired_count: Number(t.min_paired_count),
        value_type: t.value_type,
        value: Number(t.value),
        max_discount_amount:
          t.max_discount_amount === null ? null : Number(t.max_discount_amount),
      }),
    );
  }

  private async buildCodeCandidate(
    code: string | null | undefined,
    ctx: EvalContext,
  ): Promise<DiscountCandidate | null> {
    const trimmed = code?.trim();
    if (!trimmed) return null;

    const db = this.supabase.getAdminClient();
    const { data, error } = await db
      .from('promo_codes')
      .select(`${PROMO_SELECT}, promo_pairing_tiers (*)`)
      .ilike('code', trimmed)
      .maybeSingle();

    if (error || !data) throw new BadRequestException('Invalid promo code');

    const rule: PromoRule = {
      ...(data as unknown as PromoRule),
      tiers: this.mapTiers(data),
    };

    // Pairing rules are not codes — they fire on their own or not at all.
    if (rule.discount_type === 'pairing' || rule.auto_apply) {
      throw new BadRequestException('Invalid promo code');
    }

    const reason = checkEligibility(rule, ctx);
    if (reason) throw new BadRequestException(reason);

    const amount = computeCodeDiscount(rule, ctx);
    if (amount <= 0) {
      throw new BadRequestException(
        'This promo code does not apply to the items in your cart',
      );
    }

    return {
      source: 'code',
      promoCodeId: rule.id,
      code: rule.code,
      label: ruleLabel(rule),
      discountType: rule.discount_type,
      amount,
    };
  }

  private async buildPairingCandidates(ctx: EvalContext): Promise<{
    candidates: DiscountCandidate[];
    rejected: RejectedRule[];
  }> {
    const productIds = [...new Set(ctx.items.map((i) => i.productId))].filter(
      Boolean,
    );
    if (productIds.length === 0) return { candidates: [], rejected: [] };

    const db = this.supabase.getAdminClient();
    const { data, error } = await db
      .from('promo_codes')
      .select(`${PROMO_SELECT}, promo_pairing_tiers (*)`)
      .eq('discount_type', 'pairing')
      .eq('auto_apply', true)
      .eq('is_active', true)
      .in('anchor_product_id', productIds);

    if (error) {
      // A discount engine that throws here would take checkout down with it.
      this.logger.error(`Failed to load pairing rules: ${error.message}`);
      return { candidates: [], rejected: [] };
    }

    const candidates: DiscountCandidate[] = [];
    const rejected: RejectedRule[] = [];

    for (const row of data ?? []) {
      const rule: PromoRule = {
        ...(row as unknown as PromoRule),
        tiers: this.mapTiers(row),
      };

      const result = evaluatePairingRule(rule, ctx);
      if (result.candidate) candidates.push(result.candidate);
      if (result.rejected) rejected.push(result.rejected);
    }

    return { candidates, rejected };
  }

  /**
   * Auto-applied volume rules.
   *
   * Unlike pairing there is nothing to prefilter on — an unrestricted rule
   * matches any cart — so every live volume rule is loaded and evaluated. The
   * partial index on (discount_type) WHERE volume AND auto_apply AND is_active
   * keeps that cheap.
   */
  private async buildVolumeCandidates(ctx: EvalContext): Promise<{
    candidates: DiscountCandidate[];
    rejected: RejectedRule[];
  }> {
    if (ctx.items.length === 0) return { candidates: [], rejected: [] };

    const db = this.supabase.getAdminClient();
    const { data, error } = await db
      .from('promo_codes')
      .select(`${PROMO_SELECT}, promo_pairing_tiers (*)`)
      .eq('discount_type', 'volume')
      .eq('auto_apply', true)
      .eq('is_active', true);

    if (error) {
      // A discount engine that throws here would take checkout down with it.
      this.logger.error(`Failed to load volume rules: ${error.message}`);
      return { candidates: [], rejected: [] };
    }

    const candidates: DiscountCandidate[] = [];
    const rejected: RejectedRule[] = [];

    for (const row of data ?? []) {
      const rule: PromoRule = {
        ...(row as unknown as PromoRule),
        tiers: this.mapTiers(row),
      };

      const result = evaluateVolumeRule(rule, ctx);
      if (result.candidate) candidates.push(result.candidate);
      if (result.rejected) rejected.push(result.rejected);
    }

    return { candidates, rejected };
  }

  private buildManualCandidate(
    override: ManualOverride | null | undefined,
    subtotal: number,
  ): DiscountCandidate | null {
    if (!override || !override.value || override.value <= 0) return null;

    const amount = computeManualDiscount(override, subtotal);
    if (amount <= 0) return null;

    return {
      source: 'manual',
      promoCodeId: null,
      code: null,
      label: override.reason?.trim() || 'Manual discount',
      discountType: override.type,
      amount,
      manual: override,
    };
  }

  /**
   * Active bundle rules, for advertising on the storefront.
   *
   * Public and cart-independent: it answers "does this product have a bundle
   * deal on it", which is what a product badge needs. Applying a rule still
   * goes through resolve(), so nothing here can affect what is charged.
   */
  async listActiveBundles(
    channel: SalesChannel = 'online',
  ): Promise<BundleOffer[]> {
    const db = this.supabase.getAdminClient();
    const { data, error } = await db
      .from('promo_codes')
      .select(`${PROMO_SELECT}, promo_pairing_tiers (*)`)
      .eq('discount_type', 'pairing')
      .eq('auto_apply', true)
      .eq('is_active', true)
      .not('anchor_product_id', 'is', null);

    if (error) {
      // A failed badge lookup must never take a product page down with it.
      this.logger.error(`Failed to load bundle offers: ${error.message}`);
      return [];
    }

    const now = new Date();
    const offers: BundleOffer[] = [];

    for (const row of data ?? []) {
      const tiers = this.mapTiers(row);
      const rule: PromoRule = { ...(row as unknown as PromoRule), tiers };
      if (!isAdvertisable(rule, channel, now)) continue;

      offers.push({
        promoCodeId: rule.id,
        anchorProductId: rule.anchor_product_id!,
        label: rule.description?.trim() || 'Bundle deal',
        headline: bundleHeadline(tiers),
        basis: rule.pairing_basis ?? 'units',
        appliesTo: rule.applies_to ?? 'anchor',
        tiers: [...tiers]
          .sort((a, b) => a.min_paired_count - b.min_paired_count)
          .map((t) => ({
            minPairedCount: t.min_paired_count,
            valueType: t.value_type,
            value: t.value,
          })),
      });
    }

    return offers;
  }

  /**
   * Live volume rules, for the cart's "add one more item" nudge.
   *
   * Cart-independent and public, like listActiveBundles: it answers "what
   * thresholds are on offer", not "what is this basket worth". Applying a rule
   * still goes through resolve(), so nothing here can affect what is charged.
   */
  async listActiveVolumeOffers(
    channel: SalesChannel = 'online',
  ): Promise<VolumeOffer[]> {
    const db = this.supabase.getAdminClient();
    const { data, error } = await db
      .from('promo_codes')
      .select(`${PROMO_SELECT}, promo_pairing_tiers (*)`)
      .eq('discount_type', 'volume')
      .eq('auto_apply', true)
      .eq('is_active', true);

    if (error) {
      // A failed nudge lookup must never take the cart down with it.
      this.logger.error(`Failed to load volume offers: ${error.message}`);
      return [];
    }

    const now = new Date();
    const offers: VolumeOffer[] = [];

    for (const row of data ?? []) {
      const tiers = this.mapTiers(row);
      const rule: PromoRule = { ...(row as unknown as PromoRule), tiers };
      if (!tiers.length) continue;
      if (!isLive(rule, channel, now)) continue;

      offers.push({
        promoCodeId: rule.id,
        label: rule.description?.trim() || 'Volume discount',
        productIds: rule.applicable_product_ids?.length
          ? rule.applicable_product_ids
          : null,
        tiers: [...tiers]
          .sort((a, b) => a.min_paired_count - b.min_paired_count)
          .map((t) => ({
            minCount: t.min_paired_count,
            valueType: t.value_type,
            value: t.value,
          })),
      });
    }

    return offers;
  }

  // ─── Ledger ────────────────────────────────────────────────────────────────

  /**
   * Take a usage seat and write the ledger row. Returns the redemption id, or
   * null when there was no discount to record.
   *
   * Throws if the code was exhausted between resolve and reserve — the RPC
   * re-checks under a row lock, which is what makes max_uses honest.
   */
  async reserve(input: ReserveInput): Promise<string | null> {
    const { resolution } = input;
    if (!resolution.source || resolution.discountAmount <= 0) return null;

    const winner =
      resolution.source === 'code'
        ? resolution.breakdown.codeCandidate
        : resolution.source === 'pairing'
          ? resolution.breakdown.pairingCandidates.find(
              (c) => c.promoCodeId === resolution.promoCodeId,
            )
          : resolution.source === 'volume'
            ? resolution.breakdown.volumeCandidates.find(
                (c) => c.promoCodeId === resolution.promoCodeId,
              )
            : resolution.breakdown.manualCandidate;

    const db = this.supabase.getAdminClient();
    const { data, error } = await db.rpc('promo_reserve_redemption', {
      payload: {
        promo_code_id: resolution.promoCodeId,
        source: resolution.source,
        channel: input.channel,
        order_table: input.orderTable,
        order_id: input.orderId,
        order_number: input.orderNumber ?? null,
        code_snapshot: resolution.code,
        discount_type: resolution.discountType,
        rule_snapshot: winner ?? null,
        breakdown: resolution.breakdown,
        subtotal: resolution.subtotal,
        discount_amount: resolution.discountAmount,
        customer_email: input.customerEmail ?? null,
        customer_phone: input.customerPhone ?? null,
        customer_profile_id: input.customerProfileId ?? null,
        applied_by: input.appliedBy ?? null,
        status: input.confirmImmediately ? 'confirmed' : 'pending',
      },
    });

    if (error) {
      // P0001 is the usage-limit raise — a real, reportable condition.
      if (error.message?.includes('usage limit')) {
        throw new BadRequestException('This promo code has reached its usage limit');
      }
      throw new Error(`Failed to reserve promo redemption: ${error.message}`);
    }

    return (data as string) ?? null;
  }

  /** Idempotent. Safe to call on an already-confirmed or absent redemption. */
  async confirm(redemptionId: string | null): Promise<void> {
    if (!redemptionId) return;
    const db = this.supabase.getAdminClient();
    const { error } = await db.rpc('promo_confirm_redemption', {
      redemption_id: redemptionId,
    });
    if (error) {
      throw new Error(
        `Failed to confirm promo redemption ${redemptionId}: ${error.message}`,
      );
    }
  }

  async revert(redemptionId: string | null, reason?: string): Promise<void> {
    if (!redemptionId) return;
    const db = this.supabase.getAdminClient();
    const { error } = await db.rpc('promo_revert_redemption', {
      redemption_id: redemptionId,
      reason: reason ?? null,
    });
    if (error) {
      throw new Error(
        `Failed to revert promo redemption ${redemptionId}: ${error.message}`,
      );
    }
  }

  /** The live redemption for an order, if it has one. */
  async findByOrder(
    orderTable: 'orders' | 'popup_orders' | 'walkin_orders',
    orderId: string,
  ): Promise<string | null> {
    const db = this.supabase.getAdminClient();
    const { data } = await db
      .from('promo_redemptions')
      .select('id')
      .eq('order_table', orderTable)
      .eq('order_id', orderId)
      .neq('status', 'reverted')
      .maybeSingle();
    return data?.id ?? null;
  }

  /** Confirm / revert by order, for callers that only hold an order id. */
  async confirmForOrder(
    orderTable: 'orders' | 'popup_orders' | 'walkin_orders',
    orderId: string,
  ): Promise<void> {
    await this.confirm(await this.findByOrder(orderTable, orderId));
  }

  async revertForOrder(
    orderTable: 'orders' | 'popup_orders' | 'walkin_orders',
    orderId: string,
    reason?: string,
  ): Promise<void> {
    await this.revert(await this.findByOrder(orderTable, orderId), reason);
  }

  // ─── Reporting ─────────────────────────────────────────────────────────────

  async listRedemptions(filters: {
    channel?: string;
    promoCodeId?: string;
    source?: string;
    status?: string;
    limit?: number;
  }) {
    const db = this.supabase.getAdminClient();
    let query = db
      .from('promo_redemptions')
      .select(
        `id, promo_code_id, source, channel, order_table, order_id, order_number,
         code_snapshot, discount_type, rule_snapshot, breakdown, subtotal,
         discount_amount, customer_email, customer_phone, applied_by, status,
         confirmed_at, reverted_at, revert_reason, created_at,
         applied_by_profile:profiles!promo_redemptions_applied_by_fkey (first_name, last_name, email)`,
      )
      .order('created_at', { ascending: false })
      .limit(Math.min(filters.limit ?? 200, 500));

    if (filters.channel) query = query.eq('channel', filters.channel);
    if (filters.promoCodeId) query = query.eq('promo_code_id', filters.promoCodeId);
    if (filters.source) query = query.eq('source', filters.source);
    if (filters.status) query = query.eq('status', filters.status);

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }
}
