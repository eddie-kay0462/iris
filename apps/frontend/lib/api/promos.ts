import { useMutation } from "@tanstack/react-query";
import { apiClient } from "./client";

export type DiscountType = "fixed" | "percentage" | "free_shipping" | "product";

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

export function useValidatePromo() {
  return useMutation({
    mutationFn: (payload: ValidatePromoPayload) =>
      apiClient<ValidatePromoResult>("/promos/validate", {
        method: "POST",
        body: payload,
      }),
  });
}
