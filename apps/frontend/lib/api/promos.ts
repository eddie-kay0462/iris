import { useMutation } from "@tanstack/react-query";
import { apiClient } from "./client";

export type DiscountType =
  | "fixed"
  | "percentage"
  | "free_shipping"
  | "product"
  | "pairing";

export type DiscountSource = "code" | "pairing" | "manual";

export interface ResolveDiscountPayload {
  channel: "online";
  items: {
    productId: string;
    variantId?: string;
    unitPrice: number;
    quantity: number;
  }[];
  shippingCost?: number;
  code?: string;
}

export interface DiscountCandidate {
  source: DiscountSource;
  promoCodeId: string | null;
  code: string | null;
  label: string;
  amount: number;
  pairing?: {
    anchorProductId: string;
    basis: "units" | "products";
    appliesTo: "anchor" | "cart";
    pairedCount: number;
    tier: { min_paired_count: number; value_type: string; value: number };
  };
}

export interface DiscountResolution {
  subtotal: number;
  discountAmount: number;
  source: DiscountSource | null;
  promoCodeId: string | null;
  code: string | null;
  label: string | null;
  discountType: DiscountType | "none";
  breakdown: {
    codeCandidate: DiscountCandidate | null;
    pairingCandidates: DiscountCandidate[];
    rejected: { label: string; reason: string }[];
    winner: DiscountSource | null;
  };
  message: string;
}

/**
 * The cross-channel discount engine.
 *
 * Called on every cart and shipping change, not just when a code is typed —
 * that is what lets automatic bundle deals appear on their own.
 */
export function useResolveDiscount() {
  return useMutation({
    mutationFn: (payload: ResolveDiscountPayload) =>
      apiClient<DiscountResolution>("/promos/resolve", {
        method: "POST",
        body: payload,
      }),
  });
}

// ─── Legacy ──────────────────────────────────────────────────────────────────

export interface ValidatePromoPayload {
  code: string;
  subtotal: number;
  shippingCost: number;
  items?: { productId: string; price: number; quantity: number }[];
}

export interface ValidatePromoResult {
  discountAmount: number;
  promoCodeId: string;
  discountType: DiscountType;
  message: string;
}

/** @deprecated Use useResolveDiscount — it also surfaces automatic bundle rules. */
export function useValidatePromo() {
  return useMutation({
    mutationFn: (payload: ValidatePromoPayload) =>
      apiClient<ValidatePromoResult>("/promos/validate", {
        method: "POST",
        body: payload,
      }),
  });
}
