"use client";

import { useEffect, useState } from "react";
import {
  useResolveDiscount,
  type DiscountResolution,
  type SalesChannel,
  type ValueType,
} from "@/lib/api/promos";

export interface ChannelDiscountItem {
  productId: string;
  variantId?: string;
  unitPrice: number;
  quantity: number;
}

export interface ChannelDiscountInput {
  channel: SalesChannel;
  items: ChannelDiscountItem[];
  /** The code staff applied, or "" for none. */
  appliedCode: string;
  manualType: "none" | ValueType;
  manualValue: string;
  manualReason: string;
  /** Skip resolution entirely (e.g. pre-order mode, which uses another table). */
  disabled?: boolean;
}

export interface ChannelDiscountResult {
  resolution: DiscountResolution | null;
  discountAmount: number;
  label: string | null;
  /** Bundle rules the basket qualifies for, whether or not they won. */
  autoCandidates: DiscountResolution["breakdown"]["pairingCandidates"];
  /** Set when a manual override is worth less than a rule the basket qualifies for. */
  overriddenBy: { label: string; amount: number } | null;
  codeError: string | null;
  clearCodeError: () => void;
  isResolving: boolean;
}

/**
 * The single client-side path to the server's discount engine.
 *
 * Both POS surfaces call this rather than each computing their own totals — the
 * duplicated browser-side percentage maths is exactly what let a client dictate
 * its own discount before. Whatever comes back here is what the server will
 * charge.
 */
export function useChannelDiscount(
  input: ChannelDiscountInput,
): ChannelDiscountResult {
  const {
    channel,
    items,
    appliedCode,
    manualType,
    manualValue,
    manualReason,
    disabled,
  } = input;

  const resolveDiscount = useResolveDiscount();
  const [resolution, setResolution] = useState<DiscountResolution | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);

  const itemsKey = JSON.stringify(
    items.map((i) => [i.productId, i.unitPrice, i.quantity]),
  );

  useEffect(() => {
    let cancelled = false;

    if (disabled || items.length === 0) {
      setResolution(null);
      return;
    }

    // Debounced so tapping quantity up and down does not spray requests.
    const timer = setTimeout(async () => {
      try {
        const res = await resolveDiscount.mutateAsync({
          channel,
          items,
          code: appliedCode || undefined,
          manualOverride:
            manualType !== "none" && parseFloat(manualValue) > 0
              ? {
                  type: manualType,
                  value: parseFloat(manualValue),
                  reason: manualReason || undefined,
                }
              : undefined,
        });
        if (cancelled) return;
        setResolution(res);
        setCodeError(null);
      } catch (err: any) {
        if (cancelled) return;
        // Drop the discount rather than leaving a stale figure on screen — the
        // server would reject this basket anyway, and under-showing a discount
        // is far safer at a counter than over-showing one.
        setResolution(null);
        setCodeError(err?.message || "Invalid promo code");
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    itemsKey,
    appliedCode,
    manualType,
    manualValue,
    manualReason,
    channel,
    disabled,
  ]);

  return {
    resolution,
    discountAmount: resolution?.discountAmount ?? 0,
    label: resolution?.label ?? null,
    autoCandidates: resolution?.breakdown.pairingCandidates ?? [],
    overriddenBy: resolution?.breakdown.overriddenBy ?? null,
    codeError,
    clearCodeError: () => setCodeError(null),
    isResolving: resolveDiscount.isPending,
  };
}
