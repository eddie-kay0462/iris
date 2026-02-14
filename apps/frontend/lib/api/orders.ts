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
  user_id: string;
  email: string;
  order_number: string;
  status: string;
  subtotal: number;
  discount: number;
  shipping_cost: number;
  tax: number;
  total: number;
  currency: string;
  shipping_address: {
    fullName: string;
    address: string;
    address2?: string;
    city: string;
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
  customer_notes: string | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
  order_status_history?: OrderStatusHistory[];
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

function toSearchParams(params: OrderQueryParams): string {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "") sp.set(k, String(v));
  });
  const str = sp.toString();
  return str ? `?${str}` : "";
}

// --- Customer Hooks ---

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
        region: string;
        postalCode?: string;
        phone: string;
      };
      paymentReference: string;
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

export interface AnalyticsData {
  revenueByDay: Record<string, number>;
  ordersByDay: Record<string, number>;
  topProducts: { name: string; revenue: number; unitsSold: number }[];
  statusBreakdown: Record<string, number>;
  totalOrders: number;
  totalRevenue: number;
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

export function useAdminCustomers(params: { search?: string; page?: number; limit?: number } = {}) {
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
