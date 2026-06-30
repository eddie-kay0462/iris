import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";

// --- Types ---

export interface AllyAllocation {
  id: string;
  variantId: string;
  productId: string | null;
  productTitle: string | null;
  variantTitle: string | null;
  sku: string | null;
  price: number | null;
  quantityAllocated: number;
  quantityReturned: number;
  quantitySold: number;
  onHand: number;
  updatedAt: string;
}

export interface AllySaleItem {
  product_name: string;
  variant_title: string | null;
  sku: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface AllySale {
  id: string;
  order_number: string;
  customer_name: string | null;
  payment_method: string;
  subtotal: number;
  total: number;
  commission_amount: number;
  status: string;
  brand: string;
  sale_date: string;
  items: AllySaleItem[];
}

export interface AllySalesResponse {
  sales: AllySale[];
  total: number;
  page: number;
  limit: number;
}

// --- Hooks ---

export function useAllyAllocations(allyId: string) {
  return useQuery({
    queryKey: ["ally-allocations", allyId],
    queryFn: () => apiClient<AllyAllocation[]>(`/allies/admin/${allyId}/allocations`),
    enabled: !!allyId,
  });
}

export function useAllocateStock(allyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { variantId: string; quantity: number; notes?: string }) =>
      apiClient<AllyAllocation[]>(`/allies/admin/${allyId}/allocations`, {
        method: "POST",
        body: data,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ally-allocations", allyId] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}

export function useReturnStock(allyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { variantId: string; quantity: number; notes?: string }) =>
      apiClient<AllyAllocation[]>(`/allies/admin/${allyId}/allocations/return`, {
        method: "POST",
        body: data,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ally-allocations", allyId] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}

export function useAllySales(allyId: string, page = 1, limit = 20) {
  return useQuery({
    queryKey: ["ally-sales", allyId, page, limit],
    queryFn: () =>
      apiClient<AllySalesResponse>(`/allies/admin/${allyId}/sales?page=${page}&limit=${limit}`),
    enabled: !!allyId,
    // Keep the current page visible while the next one loads (no flicker).
    placeholderData: (prev) => prev,
  });
}
