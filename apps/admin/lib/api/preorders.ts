import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PreorderStatus = "pending" | "stock_held" | "fulfilled" | "cancelled" | "refunded";
export type PreorderSource = "online" | "popup";

export interface Preorder {
  id: string;
  order_number: string;
  source: PreorderSource;
  user_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  variant_id: string;
  product_name: string;
  variant_title: string | null;
  quantity: number;
  unit_price: number;
  payment_method: string;
  payment_reference: string | null;
  payment_status: string;
  status: PreorderStatus;
  priority: number | null;
  notified_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  product_variants?: {
    sku: string | null;
    option1_value: string | null;
    option2_value: string | null;
    option3_value: string | null;
  } | null;
}

export interface PreorderStats {
  pending: number;
  stock_held: number;
  fulfilled: number;
  cancelled: number;
  refunded: number;
  totalValue: number;
}

export interface PreordersResult {
  data: Preorder[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface RestockResult {
  variant_id: string;
  quantity_added: number;
  preorders_held: number;
  remaining_stock: number;
}

export interface CreatePopupPreorderItemInput {
  variantId: string;
  productTitle: string;
  variantTitle?: string;
  quantity: number;
  price: number;
}

export interface CreatePopupPreorderInput {
  items: CreatePopupPreorderItemInput[];
  customer_name?: string;
  customer_email?: string;
  customer_phone: string;
  payment_method?: "cash" | "momo" | "bank_transfer" | "pending";
  payment_reference?: string;
  notes?: string;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function usePreorderStats() {
  return useQuery({
    queryKey: ["preorder-stats"],
    queryFn: () => apiClient<PreorderStats>("/admin/preorders/stats"),
  });
}

export function usePreorders(params?: { status?: string; variant_id?: string; page?: number; limit?: number }) {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.variant_id) qs.set("variant_id", params.variant_id);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  const query = qs.toString();

  return useQuery({
    queryKey: ["preorders", params],
    queryFn: () => apiClient<PreordersResult>(`/admin/preorders${query ? `?${query}` : ""}`),
  });
}

export function useCancelPreorder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<Preorder>(`/admin/preorders/${id}/cancel`, { method: "PATCH" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["preorders"] });
      qc.invalidateQueries({ queryKey: ["preorder-stats"] });
    },
  });
}

export function useRestockPreorder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ variantId, quantity }: { variantId: string; quantity: number }) =>
      apiClient<RestockResult>(`/admin/preorders/restock/${variantId}`, {
        method: "POST",
        body: { quantity },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["preorders"] });
      qc.invalidateQueries({ queryKey: ["preorder-stats"] });
    },
  });
}

export function useRefundPreorder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, amount, reason }: { id: string; amount?: number; reason?: string }) =>
      apiClient(`/admin/preorders/${id}/refund`, {
        method: "POST",
        body: { amount, reason },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["preorders"] });
      qc.invalidateQueries({ queryKey: ["preorder-stats"] });
    },
  });
}

export function useCreatePopupPreorder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreatePopupPreorderInput) =>
      apiClient<Preorder[]>("/admin/preorders/popup", { method: "POST", body: dto }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["preorders"] });
      qc.invalidateQueries({ queryKey: ["preorder-stats"] });
    },
  });
}
