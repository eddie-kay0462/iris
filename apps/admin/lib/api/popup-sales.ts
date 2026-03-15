import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PopupEventStatus = "draft" | "active" | "closed";
export type PopupOrderStatus =
  | "active"
  | "awaiting_payment"
  | "confirmed"
  | "completed"
  | "on_hold"
  | "cancelled";
export type PopupPaymentMethod = "cash" | "momo" | "bank_transfer";

export interface PopupEvent {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  event_date: string | null;
  status: PopupEventStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  profiles?: { id: string; first_name: string | null; last_name: string | null } | null;
}

export interface PopupOrderItem {
  id: string;
  order_id: string;
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

export interface PopupOrder {
  id: string;
  event_id: string;
  order_number: string;
  customer_name: string | null;
  customer_phone: string | null;
  served_by: string | null;
  status: PopupOrderStatus;
  payment_method: PopupPaymentMethod | null;
  payment_reference: string | null;
  subtotal: number;
  total: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  profiles?: { id: string; first_name: string | null; last_name: string | null } | null;
  popup_order_items?: PopupOrderItem[];
}

export interface PopupOrdersResult {
  data: PopupOrder[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PopupStats {
  session_revenue: number;
  orders_completed: number;
  on_hold: number;
  awaiting_payment: number;
}

export interface CreateOrderItemInput {
  product_id?: string;
  variant_id?: string;
  product_name: string;
  variant_title?: string;
  sku?: string;
  quantity: number;
  unit_price: number;
}

export interface CreateOrderInput {
  customer_name?: string;
  customer_phone?: string;
  payment_method?: PopupPaymentMethod;
  payment_reference?: string;
  notes?: string;
  items: CreateOrderItemInput[];
}

export interface UpdateOrderInput {
  status?: PopupOrderStatus;
  payment_method?: PopupPaymentMethod;
  payment_reference?: string;
  customer_name?: string;
  customer_phone?: string;
  notes?: string;
}

export interface CreateEventInput {
  name: string;
  description?: string;
  location?: string;
  event_date?: string;
  status?: "draft" | "active";
}

export interface UpdateEventInput {
  name?: string;
  description?: string;
  location?: string;
  event_date?: string;
  status?: PopupEventStatus;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function usePopupEvents() {
  return useQuery({
    queryKey: ["popup-events"],
    queryFn: () => apiClient<PopupEvent[]>("/popup-sales/events"),
  });
}

export function useCreatePopupEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateEventInput) =>
      apiClient<PopupEvent>("/popup-sales/events", { method: "POST", body: dto }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["popup-events"] });
    },
  });
}

export function useUpdatePopupEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateEventInput }) =>
      apiClient<PopupEvent>(`/popup-sales/events/${id}`, {
        method: "PATCH",
        body: dto,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["popup-events"] });
    },
  });
}

export function usePopupStats(eventId: string | null) {
  return useQuery({
    queryKey: ["popup-stats", eventId],
    queryFn: () => apiClient<PopupStats>(`/popup-sales/events/${eventId}/stats`),
    enabled: !!eventId,
    refetchInterval: 15_000,
  });
}

export function usePopupOrders(
  eventId: string | null,
  params: { status?: PopupOrderStatus; page?: number; limit?: number } = {}
) {
  const sp = new URLSearchParams();
  if (params.status) sp.set("status", params.status);
  if (params.page) sp.set("page", String(params.page));
  if (params.limit) sp.set("limit", String(params.limit));
  const qs = sp.toString() ? `?${sp.toString()}` : "";

  return useQuery({
    queryKey: ["popup-orders", eventId, params],
    queryFn: () =>
      apiClient<PopupOrdersResult>(`/popup-sales/events/${eventId}/orders${qs}`),
    enabled: !!eventId,
    refetchInterval: 15_000,
  });
}

export function useCreatePopupOrder(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateOrderInput) =>
      apiClient<PopupOrder>(`/popup-sales/events/${eventId}/orders`, {
        method: "POST",
        body: dto,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["popup-orders", eventId] });
      qc.invalidateQueries({ queryKey: ["popup-stats", eventId] });
    },
  });
}

export function useUpdatePopupOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateOrderInput }) =>
      apiClient<PopupOrder>(`/popup-sales/orders/${id}`, {
        method: "PATCH",
        body: dto,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["popup-orders"] });
      qc.invalidateQueries({ queryKey: ["popup-stats"] });
    },
  });
}

export interface ChargeOrderInput {
  phone: string;
  provider: "mtn" | "vod" | "tgo";
}

export interface ChargeOrderResult {
  reference: string;
  paystack_status: string;
  message: string;
}

export function useChargePopupOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: ChargeOrderInput }) =>
      apiClient<ChargeOrderResult>(`/popup-sales/orders/${id}/charge`, {
        method: "POST",
        body: dto,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["popup-orders"] });
      qc.invalidateQueries({ queryKey: ["popup-stats"] });
    },
  });
}

export interface SubmitOtpResult {
  paystack_status: string;
  message: string;
}

export function useSubmitPopupOtp() {
  return useMutation({
    mutationFn: ({ id, otp }: { id: string; otp: string }) =>
      apiClient<SubmitOtpResult>(`/popup-sales/orders/${id}/submit-otp`, {
        method: "POST",
        body: { otp },
      }),
  });
}
