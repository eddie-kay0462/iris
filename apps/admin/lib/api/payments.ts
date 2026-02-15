import { useQuery } from "@tanstack/react-query";
import { apiClient } from "./client";

export interface PaymentTransaction {
  id: string;
  order_number: string;
  email: string;
  total: number;
  currency: string;
  payment_provider: string | null;
  payment_reference: string | null;
  payment_status: string | null;
  status: string;
  created_at: string;
}

export interface PaginatedPayments {
  data: PaymentTransaction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaymentStats {
  totalCollected: number;
  totalPending: number;
  totalRefunded: number;
  transactionCount: number;
}

export interface PaymentQueryParams {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}

function toSearchParams(params: PaymentQueryParams): string {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "") sp.set(k, String(v));
  });
  const str = sp.toString();
  return str ? `?${str}` : "";
}

export function useAdminPayments(params: PaymentQueryParams = {}) {
  return useQuery({
    queryKey: ["admin-payments", params],
    queryFn: () =>
      apiClient<PaginatedPayments>(
        `/payments/admin/list${toSearchParams(params)}`,
      ),
  });
}

export function usePaymentStats() {
  return useQuery({
    queryKey: ["payment-stats"],
    queryFn: () => apiClient<PaymentStats>("/payments/admin/stats"),
  });
}
