import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";

// --- Types ---

export interface OrderItem {
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

export interface PreorderLine {
  id: string;
  order_id: string | null;
  order_number: string;
  product_name: string;
  variant_title: string | null;
  quantity: number;
  unit_price: number;
  status: string;
  payment_status: string | null;
}

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  from_status: string | null;
  to_status: string;
  notes: string | null;
  changed_by: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  user_id: string | null;
  email: string;
  guest_token?: string | null;
  order_number: string;
  status: string;
  subtotal: number;
  discount: number;
  shipping_cost: number;
  tax: number;
  processing_fee: number;
  total: number;
  currency: string;
  shipping_address: {
    fullName: string;
    address: string;
    address2?: string;
    city: string;
    state?: string;
    region: string;
    postalCode?: string;
    phone: string;
  } | null;
  billing_address: unknown | null;
  tracking_number: string | null;
  carrier: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  payment_provider: string | null;
  payment_reference: string | null;
  payment_status: string | null;
  applied_promo_code_id: string | null;
  customer_notes: string | null;
  internal_notes: string | null;
  hold_expires_at?: string | null;
  hold_refreshed?: boolean;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
  order_status_history?: OrderStatusHistory[];
  /** Pre-order lines paid through this order (out-of-stock-but-preorderable
   *  items). Recorded in the preorders table, linked back via order_id. */
  preorders?: PreorderLine[];
}

export interface PaginatedOrders {
  data: Order[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface OrderQueryParams {
  status?: string;
  search?: string;
  from_date?: string;
  to_date?: string;
  page?: number;
  limit?: number;
}

// --- Helpers ---

export async function confirmPaymentByReference(reference: string): Promise<Order | null> {
  try {
    return await apiClient<Order>("/orders/confirm-payment", {
      method: "POST",
      body: { reference },
    });
  } catch {
    return null;
  }
}

export type FulfillmentStatus = "in_stock" | "preorder" | "unavailable";

/**
 * Live check of how each cart line would be fulfilled right now. A line comes
 * back as "preorder" when it's out of stock but the variant allows pre-orders —
 * i.e. checkout will auto-convert it — so the UI can badge it even if the shopper
 * added it while it was in stock.
 */
export function usePreviewFulfillment(
  items: { variantId: string; quantity: number }[],
) {
  const key = items
    .map((i) => `${i.variantId}:${i.quantity}`)
    .sort()
    .join(",");
  return useQuery({
    queryKey: ["preview-fulfillment", key],
    queryFn: () =>
      apiClient<Record<string, FulfillmentStatus>>("/orders/preview-fulfillment", {
        method: "POST",
        body: { items },
      }),
    enabled: items.length > 0,
    staleTime: 30_000,
  });
}

/** Silently releases a pending order's stock hold (e.g. on Paystack modal close). */
export async function releaseStockHold(reference: string): Promise<void> {
  try {
    await apiClient("/orders/release-hold", {
      method: "POST",
      body: { reference },
    });
  } catch {
    // Best-effort — the hold will lapse on its own anyway.
  }
}

function toSearchParams(params: OrderQueryParams): string {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "") sp.set(k, String(v));
  });
  const str = sp.toString();
  return str ? `?${str}` : "";
}

// --- Customer Hooks ---

export interface CreateOrderInput {
  items: {
    variantId: string;
    productId: string;
    productTitle: string;
    variantTitle?: string;
    price: number;
    quantity: number;
  }[];
  shippingAddress: {
    fullName: string;
    address: string;
    address2?: string;
    city: string;
    region: string;
    postalCode?: string;
    phone: string;
  };
  paymentReference: string;
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      items: {
        variantId: string;
        productId: string;
        productTitle: string;
        variantTitle?: string;
        price: number;
        quantity: number;
      }[];
      shippingAddress: {
        fullName: string;
        address: string;
        address2?: string;
        city: string;
        state?: string;
        region: string;
        postalCode?: string;
        phone: string;
      };
      paymentReference: string;
      shippingCost: number;
      shippingMethod: "standard" | "express";
      promoCode?: string;
      guestEmail?: string;
    }) => apiClient<Order>("/orders", { method: "POST", body: data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-orders"] });
    },
  });
}

export function useMyOrders(params: OrderQueryParams = {}) {
  return useQuery({
    queryKey: ["my-orders", params],
    queryFn: () =>
      apiClient<PaginatedOrders>(`/orders/my${toSearchParams(params)}`),
  });
}

export function useMyOrder(id: string) {
  return useQuery({
    queryKey: ["my-order", id],
    queryFn: () => apiClient<Order>(`/orders/my/${id}`),
    enabled: !!id,
  });
}

export function useMyOrderByNumber(orderNumber: string) {
  return useQuery({
    queryKey: ["my-order-by-number", orderNumber],
    queryFn: () => apiClient<Order>(`/orders/my/by-number/${orderNumber}`),
    enabled: !!orderNumber,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.payment_status === "paid") return false;
      return 3000;
    },
  });
}

export function useGuestOrderByNumber(orderNumber: string, guestToken: string | null) {
  return useQuery({
    queryKey: ["guest-order-by-number", orderNumber, guestToken],
    queryFn: () =>
      apiClient<Order>(`/orders/guest/${orderNumber}?token=${guestToken}`),
    enabled: !!orderNumber && !!guestToken,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.payment_status === "paid") return false;
      return 3000;
    },
  });
}

type TrackingItem = Pick<OrderItem, "product_name" | "variant_title" | "quantity" | "total_price">;

export interface TrackingPreorderLine {
  product_name: string;
  variant_title: string | null;
  quantity: number;
  unit_price: number;
  status: string;
}

export interface TrackingOrder {
  kind: "order";
  order_number: string;
  status: string;
  payment_status: string | null;
  tracking_number: string | null;
  carrier: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  created_at: string;
  shipping_address: Order["shipping_address"];
  order_items?: TrackingItem[];
  preorders?: TrackingPreorderLine[];
}

export interface TrackingPreorder {
  kind: "preorder";
  order_number: string;
  status: string;
  payment_status: string | null;
  created_at: string;
  notified_at: string | null;
  items: TrackingItem[];
}

export type TrackingResult = TrackingOrder | TrackingPreorder;

export async function trackOrderByEmail(orderNumber: string, email: string): Promise<TrackingResult> {
  return apiClient<TrackingResult>(
    `/orders/track?orderNumber=${encodeURIComponent(orderNumber)}&email=${encodeURIComponent(email)}`,
  );
}

export function useCancelOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) =>
      apiClient<Order>(`/orders/${orderId}/cancel`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-orders"] });
      qc.invalidateQueries({ queryKey: ["my-order"] });
    },
  });
}

// --- Admin Types ---

export interface AdminStats {
  totalRevenue: number;
  recentRevenue: number;
  orderCount: number;
  customerCount: number;
  lowStockCount: number;
  ordersByStatus: Record<string, number>;
}

export interface AdminCustomer {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  role: string;
  created_at: string;
  last_login_at: string | null;
  order_count: number;
  total_spent: number;
  last_order_date: string | null;
}

export interface AdminCustomerDetail extends AdminCustomer {
  orders: Order[];
}

export interface PaginatedCustomers {
  data: AdminCustomer[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AnalyticsTopProduct {
  name: string;
  revenue: number;
  unitsSold: number;
  productId: string | null;
  imageUrl: string | null;
}

export interface AnalyticsData {
  revenueByDay: Record<string, number>;
  ordersByDay: Record<string, number>;
  topProducts: AnalyticsTopProduct[];
  statusBreakdown: Record<string, number>;
  totalOrders: number;
  totalRevenue: number;
  previousPeriodRevenue: number;
  previousPeriodOrders: number;
  funnelCounts: Record<string, number>;
}

export interface CustomerStats {
  totalCustomers: number;
  newThisMonth: number;
  avgOrderValue: number;
  topSpender: { name: string; amount: number } | null;
}

// --- Admin Hooks ---

export function useAdminOrders(params: OrderQueryParams = {}) {
  return useQuery({
    queryKey: ["admin-orders", params],
    queryFn: () =>
      apiClient<PaginatedOrders>(
        `/orders/admin/list${toSearchParams(params)}`,
      ),
  });
}

export function useAdminOrder(id: string) {
  return useQuery({
    queryKey: ["admin-order", id],
    queryFn: () => apiClient<Order>(`/orders/admin/${id}`),
    enabled: !!id,
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderId,
      ...data
    }: {
      orderId: string;
      status: string;
      notes?: string;
      trackingNumber?: string;
      carrier?: string;
    }) =>
      apiClient<Order>(`/orders/admin/${orderId}/status`, {
        method: "PATCH",
        body: data,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      qc.invalidateQueries({ queryKey: ["admin-order"] });
    },
  });
}

export function useAdminStats() {
  return useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => apiClient<AdminStats>("/orders/admin/stats"),
  });
}

export function useCustomerStats() {
  return useQuery({
    queryKey: ["admin-customer-stats"],
    queryFn: () => apiClient<CustomerStats>("/orders/admin/customer-stats"),
  });
}

export function useAdminCustomers(params: { search?: string; page?: number; limit?: number; min_orders?: number; max_orders?: number } = {}) {
  return useQuery({
    queryKey: ["admin-customers", params],
    queryFn: () =>
      apiClient<PaginatedCustomers>(
        `/orders/admin/customers${toSearchParams(params as OrderQueryParams)}`,
      ),
  });
}

export function useAdminCustomer(id: string) {
  return useQuery({
    queryKey: ["admin-customer", id],
    queryFn: () => apiClient<AdminCustomerDetail>(`/orders/admin/customers/${id}`),
    enabled: !!id,
  });
}

export function useAnalytics(params: { from_date?: string; to_date?: string } = {}) {
  return useQuery({
    queryKey: ["admin-analytics", params],
    queryFn: () =>
      apiClient<AnalyticsData>(
        `/orders/admin/analytics${toSearchParams(params as OrderQueryParams)}`,
      ),
  });
}
