import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";

export type DiscountType =
  | "fixed"
  | "percentage"
  | "free_shipping"
  | "product"
  | "pairing"
  | "volume";

export type SalesChannel = "online" | "popup" | "walkin";
export type PairingBasis = "units" | "products";
export type PairingAppliesTo = "anchor" | "cart";
export type ValueType = "percentage" | "fixed";
export type DiscountSource = "code" | "pairing" | "volume" | "manual";

/** Shared by pairing and volume rules — see promo_pairing_tiers. */
export interface PairingTier {
  id?: string;
  /** Paired items for a pairing rule; cart units for a volume rule. */
  min_paired_count: number;
  value_type: ValueType;
  value: number;
  max_discount_amount: number | null;
}

export interface PromoCode {
  id: string;
  /** Null for rules that auto-apply and so carry no code. */
  code: string | null;
  description: string | null;
  discount_type: DiscountType;
  discount_value: number;
  applicable_product_ids: string[] | null;
  min_order_amount: number | null;
  max_discount_amount: number | null;
  max_uses: number | null;
  used_count: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  channels: SalesChannel[] | null;
  auto_apply: boolean;
  anchor_product_id: string | null;
  pairing_basis: PairingBasis | null;
  applies_to: PairingAppliesTo | null;
  promo_pairing_tiers: PairingTier[];
  created_at: string;
  updated_at: string;
}

export interface CreatePromoPayload {
  code?: string;
  description?: string;
  discount_type: DiscountType;
  discount_value?: number;
  applicable_product_ids?: string[];
  min_order_amount?: number;
  max_discount_amount?: number;
  max_uses?: number;
  starts_at?: string;
  expires_at?: string;
  is_active?: boolean;
  channels?: SalesChannel[];
  auto_apply?: boolean;
  anchor_product_id?: string;
  pairing_basis?: PairingBasis;
  applies_to?: PairingAppliesTo;
  tiers?: PairingTier[];
}

export interface PromoRedemption {
  id: string;
  promo_code_id: string | null;
  source: DiscountSource;
  channel: SalesChannel;
  order_table: string;
  order_id: string;
  order_number: string | null;
  code_snapshot: string | null;
  discount_type: string | null;
  rule_snapshot: Record<string, unknown> | null;
  breakdown: Record<string, unknown> | null;
  subtotal: number;
  discount_amount: number;
  customer_email: string | null;
  customer_phone: string | null;
  applied_by: string | null;
  applied_by_profile: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
  status: "pending" | "confirmed" | "reverted";
  confirmed_at: string | null;
  reverted_at: string | null;
  revert_reason: string | null;
  created_at: string;
}

export function usePromoCodes() {
  return useQuery({
    queryKey: ["promo-codes"],
    queryFn: () => apiClient<PromoCode[]>("/promos"),
  });
}

export function usePromoRedemptions(filters: {
  channel?: string;
  source?: string;
  promoCodeId?: string;
  status?: string;
} = {}) {
  const qs = new URLSearchParams(
    Object.entries(filters).filter(([, v]) => !!v) as [string, string][],
  ).toString();

  return useQuery({
    queryKey: ["promo-redemptions", filters],
    queryFn: () =>
      apiClient<PromoRedemption[]>(`/promos/redemptions${qs ? `?${qs}` : ""}`),
  });
}

export function useCreatePromo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePromoPayload) =>
      apiClient<PromoCode>("/promos", { method: "POST", body: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["promo-codes"] });
    },
  });
}

export function useUpdatePromo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<CreatePromoPayload> & { id: string }) =>
      apiClient<PromoCode>(`/promos/${id}`, { method: "PATCH", body: data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["promo-codes"] });
    },
  });
}

export function useDeletePromo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient(`/promos/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["promo-codes"] });
    },
  });
}

// ─── Cross-channel resolution (shared by both POS surfaces) ──────────────────

export interface ResolveDiscountPayload {
  channel: SalesChannel;
  items: {
    productId: string;
    variantId?: string;
    unitPrice: number;
    quantity: number;
  }[];
  shippingCost?: number;
  code?: string;
  manualOverride?: { type: ValueType; value: number; reason?: string };
}

export interface DiscountCandidate {
  source: DiscountSource;
  promoCodeId: string | null;
  code: string | null;
  label: string;
  amount: number;
  pairing?: {
    anchorProductId: string;
    basis: PairingBasis;
    appliesTo: PairingAppliesTo;
    pairedCount: number;
    tier: PairingTier;
  };
  volume?: {
    countedProductIds: string[] | null;
    count: number;
    tier: PairingTier;
  };
}

export interface DiscountResolution {
  subtotal: number;
  discountAmount: number;
  source: DiscountSource | null;
  promoCodeId: string | null;
  code: string | null;
  label: string | null;
  discountType: string;
  channelDiscountType:
    | "none"
    | "percentage"
    | "fixed"
    | "code"
    | "pairing"
    | "volume";
  breakdown: {
    codeCandidate: DiscountCandidate | null;
    pairingCandidates: DiscountCandidate[];
    volumeCandidates: DiscountCandidate[];
    manualCandidate: DiscountCandidate | null;
    rejected: { label: string; reason: string }[];
    winner: DiscountSource | null;
    overriddenBy: { label: string; amount: number } | null;
  };
  message: string;
}

export function useResolveDiscount() {
  return useMutation({
    mutationFn: (payload: ResolveDiscountPayload) =>
      apiClient<DiscountResolution>("/promos/resolve", {
        method: "POST",
        body: payload,
      }),
  });
}
