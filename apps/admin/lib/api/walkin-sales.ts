import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type WalkinOrderStatus =
  | "completed"
  | "awaiting_payment"
  | "on_hold"
  | "cancelled"
  | "refunded";
export type WalkinPaymentMethod = "cash" | "momo" | "bank_transfer";

export interface WalkinOrderItem {
  id: string;
  walkin_order_id: string;
  product_id: string | null;
  variant_id: string | null;
  product_name: string;
  variant_title: string | null;
  sku: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

export interface WalkinOrder {
  id: string;
  order_number: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  customer_profile_id: string | null;
  served_by: string | null;
  status: WalkinOrderStatus;
  payment_method: WalkinPaymentMethod | null;
  payment_reference: string | null;
  subtotal: number;
  discount_type: "none" | "percentage" | "fixed" | null;
  discount_amount: number;
  discount_reason: string | null;
  total: number;
  notes: string | null;
  brand: string;
  created_at: string;
  updated_at: string;
  profiles?: { id: string; first_name: string | null; last_name: string | null } | null;
  walkin_order_items?: WalkinOrderItem[];
}

export interface WalkinOrdersResult {
  data: WalkinOrder[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface WalkinStats {
  total_revenue: number;
  today_revenue: number;
  orders_completed: number;
  orders_today: number;
}

export interface WalkinOrderItemInput {
  product_id?: string;
  variant_id?: string;
  product_name: string;
  variant_title?: string;
  sku?: string;
  quantity: number;
  unit_price: number;
}

export interface CreateWalkinOrderInput {
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  customer_profile_id?: string;
  payment_method?: WalkinPaymentMethod;
  payment_reference?: string;
  discount_type?: "none" | "percentage" | "fixed";
  discount_amount?: number;
  discount_reason?: string;
  notes?: string;
  items: WalkinOrderItemInput[];
}

export interface UpdateWalkinOrderInput {
  status?: WalkinOrderStatus;
  payment_method?: WalkinPaymentMethod;
  payment_reference?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  notes?: string;
}

export interface WalkinPreorderItemInput {
  variantId: string;
  productTitle: string;
  variantTitle?: string;
  quantity: number;
  price: number;
}

export interface CreateWalkinPreorderInput {
  items: WalkinPreorderItemInput[];
  customer_name?: string;
  customer_email?: string;
  customer_phone: string;
  payment_method?: WalkinPaymentMethod | "pending";
  payment_reference?: string;
  notes?: string;
}

export interface WalkinCustomer {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone_number: string | null;
  is_activated: boolean;
  invited_at: string | null;
}

export interface CreateWalkinCustomerInput {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
}

export interface RefundWalkinOrderInput {
  amount?: number;
  reason?: string;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useWalkinOrders(
  params: { status?: WalkinOrderStatus; search?: string; page?: number; limit?: number } = {}
) {
  const sp = new URLSearchParams();
  if (params.status) sp.set("status", params.status);
  if (params.search) sp.set("search", params.search);
  if (params.page) sp.set("page", String(params.page));
  if (params.limit) sp.set("limit", String(params.limit));
  const qs = sp.toString() ? `?${sp.toString()}` : "";

  return useQuery({
    queryKey: ["walkin-orders", params],
    queryFn: () => apiClient<WalkinOrdersResult>(`/walkin-sales/orders${qs}`),
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });
}

export function useWalkinOrder(id: string | null) {
  return useQuery({
    queryKey: ["walkin-order", id],
    queryFn: () => apiClient<WalkinOrder>(`/walkin-sales/orders/${id}`),
    enabled: !!id,
  });
}

export function useWalkinStats() {
  return useQuery({
    queryKey: ["walkin-stats"],
    queryFn: () => apiClient<WalkinStats>("/walkin-sales/stats"),
    refetchInterval: 30_000,
  });
}

export function useCreateWalkinOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateWalkinOrderInput) =>
      apiClient<WalkinOrder>("/walkin-sales/orders", { method: "POST", body: dto }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["walkin-orders"] });
      qc.invalidateQueries({ queryKey: ["walkin-stats"] });
    },
  });
}

export function useUpdateWalkinOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateWalkinOrderInput }) =>
      apiClient<WalkinOrder>(`/walkin-sales/orders/${id}`, { method: "PATCH", body: dto }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["walkin-orders"] });
      qc.invalidateQueries({ queryKey: ["walkin-stats"] });
    },
  });
}

export function useRefundWalkinOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: RefundWalkinOrderInput }) =>
      apiClient<WalkinOrder>(`/walkin-sales/orders/${id}/refund`, { method: "POST", body: dto }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["walkin-orders"] });
      qc.invalidateQueries({ queryKey: ["walkin-stats"] });
    },
  });
}

export interface ChargeWalkinOrderInput {
  phone: string;
  provider: "mtn" | "vod" | "tgo";
}

export interface ChargeWalkinOrderResult {
  reference: string;
  paystack_status: string;
  message: string;
}

export function useChargeWalkinOrder() {
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: ChargeWalkinOrderInput }) =>
      apiClient<ChargeWalkinOrderResult>(`/walkin-sales/orders/${id}/charge`, {
        method: "POST",
        body: dto,
      }),
  });
}

export interface SubmitWalkinOtpResult {
  paystack_status: string;
  message: string;
}

export function useSubmitWalkinOtp() {
  return useMutation({
    mutationFn: ({ id, otp }: { id: string; otp: string }) =>
      apiClient<SubmitWalkinOtpResult>(`/walkin-sales/orders/${id}/submit-otp`, {
        method: "POST",
        body: { otp },
      }),
  });
}

export interface VerifyWalkinPaymentResult {
  status: string;
  confirmed: boolean;
}

export function useVerifyWalkinPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<VerifyWalkinPaymentResult>(`/walkin-sales/orders/${id}/verify-payment`),
    onSuccess: (res) => {
      if (res.confirmed) {
        qc.invalidateQueries({ queryKey: ["walkin-orders"] });
        qc.invalidateQueries({ queryKey: ["walkin-stats"] });
      }
    },
  });
}

export function useCreateWalkinPreorder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateWalkinPreorderInput) =>
      apiClient<unknown>("/walkin-sales/preorders", { method: "POST", body: dto }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["walkin-orders"] });
    },
  });
}

export function useCreateWalkinCustomer() {
  return useMutation({
    mutationFn: (dto: CreateWalkinCustomerInput) =>
      apiClient<WalkinCustomer>("/walkin-sales/customers", { method: "POST", body: dto }),
  });
}

export async function searchWalkinCustomers(q: string): Promise<WalkinCustomer[]> {
  if (!q.trim()) return [];
  return apiClient<WalkinCustomer[]>(`/walkin-sales/customers?search=${encodeURIComponent(q)}`);
}
