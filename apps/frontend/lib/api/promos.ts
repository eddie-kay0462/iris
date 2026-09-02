import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient } from "./client";

export type DiscountType =
  | "fixed"
  | "percentage"
  | "free_shipping"
  | "product"
  | "pairing"
  | "volume";

export type DiscountSource = "code" | "pairing" | "volume" | "manual";

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
  volume?: {
    countedProductIds: string[] | null;
    count: number;
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
    volumeCandidates: DiscountCandidate[];
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

/** @deprecated Use useResolveDiscount — it also surfaces automatic rules. */
export function useValidatePromo() {
  return useMutation({
    mutationFn: (payload: ValidatePromoPayload) =>
      apiClient<ValidatePromoResult>("/promos/validate", {
        method: "POST",
        body: payload,
      }),
  });
}

// ─── Bundle offers (storefront badges) ───────────────────────────────────────

export interface BundleTier {
  minPairedCount: number;
  valueType: "percentage" | "fixed";
  value: number;
}

export interface BundleOffer {
  promoCodeId: string;
  anchorProductId: string;
  label: string;
  /** Ready-made badge text, e.g. "Up to 30% off". */
  headline: string;
  basis: "units" | "products";
  appliesTo: "anchor" | "cart";
  tiers: BundleTier[];
}

/**
 * Which products currently carry an automatic bundle deal.
 *
 * Cart-independent, so it's fetched once and shared across every product card
 * on the page. What a bundle is actually *worth* is still decided server-side
 * at checkout — this only drives the badge.
 */
export function useBundleOffers() {
  return useQuery({
    queryKey: ["bundle-offers"],
    queryFn: () => apiClient<BundleOffer[]>("/promos/bundles"),
    staleTime: 5 * 60 * 1000,
    // A badge is decoration: never let its absence surface as an error.
    retry: false,
  });
}

/** The offer attached to a product, if it has one. */
export function useBundleOfferFor(productId: string | undefined) {
  const { data } = useBundleOffers();
  if (!productId) return null;
  return data?.find((o) => o.anchorProductId === productId) ?? null;
}

// ─── Volume offers (cart nudge) ──────────────────────────────────────────────

export interface VolumeTier {
  minCount: number;
  valueType: "percentage" | "fixed";
  value: number;
}

export interface VolumeOffer {
  promoCodeId: string;
  label: string;
  /** Null when every line in the cart counts toward the threshold. */
  productIds: string[] | null;
  tiers: VolumeTier[];
}

/**
 * Which item-count thresholds are currently on offer.
 *
 * Cart-independent, so it's fetched once and shared between the cart drawer and
 * the cart page. What a cart is actually *worth* is still decided server-side
 * at checkout — this only drives the "add one more" nudge.
 */
export function useVolumeOffers() {
  return useQuery({
    queryKey: ["volume-offers"],
    queryFn: () => apiClient<VolumeOffer[]>("/promos/volume-offers"),
    staleTime: 5 * 60 * 1000,
    // A nudge is decoration: never let its absence surface as an error.
    retry: false,
  });
}
