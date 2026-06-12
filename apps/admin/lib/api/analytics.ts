import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "./client";
import type { MetricFormat } from "@/lib/charts/theme";

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface DateRange {
  from: string;
  to: string;
}

/** ISO from/to for "last N days", memoized so query keys stay stable. */
export function useDateRange(days: number): DateRange {
  return useMemo(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    from.setHours(0, 0, 0, 0);
    return { from: from.toISOString(), to: to.toISOString() };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);
}

const rangeQS = (range: DateRange) =>
  `from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}&period=custom`;

// ─── Sessions / conversion ────────────────────────────────────────────────────

export interface SessionFunnel {
  sessions: number;
  addedToCart: number;
  reachedCheckout: number;
  purchased: number;
}

export interface SessionsAnalytics {
  range: DateRange;
  trackingSince: string | null;
  funnel: SessionFunnel;
  conversionRate: number;
  sessionsByDay: Record<string, number>;
  conversionByDay: Record<string, { sessions: number; purchased: number }>;
  byDevice: Record<string, number>;
  byReferrer: Record<string, number>;
  byLandingPage: Record<string, number>;
  previous: {
    funnel: SessionFunnel;
    conversionRate: number;
    sessionsByDay: Record<string, number>;
  };
}

export function useSessionsAnalytics(range: DateRange) {
  return useQuery({
    queryKey: ["analytics", "sessions", range],
    queryFn: () => apiClient<SessionsAnalytics>(`/analytics/sessions?${rangeQS(range)}`),
    staleTime: 60_000,
  });
}

// ─── Sales breakdown ──────────────────────────────────────────────────────────

export interface SalesBreakdownTotals {
  grossSales: number;
  discounts: number;
  returns: number;
  netSales: number;
  shipping: number;
  tax: number;
  totalSales: number;
  orders: number;
}

export interface SalesBreakdown extends SalesBreakdownTotals {
  range: DateRange;
  previous: SalesBreakdownTotals;
}

export function useSalesBreakdown(range: DateRange) {
  return useQuery({
    queryKey: ["analytics", "sales-breakdown", range],
    queryFn: () => apiClient<SalesBreakdown>(`/analytics/sales-breakdown?${rangeQS(range)}`),
    staleTime: 60_000,
  });
}

// ─── Returning customer rate ──────────────────────────────────────────────────

export interface ReturningCustomerRate {
  range: DateRange;
  totalCustomers: number;
  returning: number;
  rate: number;
  previousRate: number;
  previousTotalCustomers: number;
}

export function useReturningCustomerRate(range: DateRange) {
  return useQuery({
    queryKey: ["analytics", "returning-rate", range],
    queryFn: () =>
      apiClient<ReturningCustomerRate>(`/analytics/returning-customer-rate?${rangeQS(range)}`),
    staleTime: 60_000,
  });
}

// ─── Abandoned checkouts ──────────────────────────────────────────────────────

export interface AbandonedCheckoutItem {
  productId: string | null;
  variantId: string | null;
  productName: string;
  variantTitle: string | null;
  sku: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  imageUrl: string | null;
}

export interface AbandonedCheckout {
  id: string;
  date: string;
  lastActivity: string;
  status: "abandoned" | "recovered" | "completed";
  customer: {
    name: string | null;
    email: string | null;
    phone: string | null;
    profileId: string | null;
  };
  itemCount: number;
  itemThumbnails: string[];
  items: AbandonedCheckoutItem[];
  subtotal: number;
  recoveredBy: {
    orderId: string;
    orderNumber: string;
    total: number;
    date: string;
  } | null;
}

export interface AbandonedCheckoutsResponse {
  checkouts: AbandonedCheckout[];
  total: number;
  page: number;
  limit: number;
}

export function useAbandonedCheckouts(params: {
  page?: number;
  search?: string;
  from?: string;
  to?: string;
}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.search) qs.set("search", params.search);
  if (params.from) qs.set("from", params.from);
  if (params.to) qs.set("to", params.to);
  return useQuery({
    queryKey: ["analytics", "abandoned-checkouts", params],
    queryFn: () =>
      apiClient<AbandonedCheckoutsResponse>(`/analytics/abandoned-checkouts?${qs.toString()}`),
    staleTime: 30_000,
  });
}

export function useAbandonedCheckout(id: string | null) {
  return useQuery({
    queryKey: ["analytics", "abandoned-checkout", id],
    queryFn: () => apiClient<AbandonedCheckout & { sessionId: string }>(`/analytics/abandoned-checkouts/${id}`),
    enabled: !!id,
  });
}

// ─── Unified reports ──────────────────────────────────────────────────────────

export type ReportCategory =
  | "Sales"
  | "Orders"
  | "Customers"
  | "Behavior"
  | "Inventory"
  | "Finances";

export interface ReportMeta {
  id: string;
  name: string;
  category: ReportCategory;
  description: string;
}

export interface ReportColumn {
  key: string;
  label: string;
  format: MetricFormat;
}

export type ReportRow = Record<string, string | number | null>;

export interface ReportSummaryMetric {
  key: string;
  label: string;
  value: number;
  previousValue: number | null;
  format: MetricFormat;
}

export interface ReportPayload {
  id: string;
  name: string;
  description: string;
  category: ReportCategory;
  range: DateRange;
  previousRange: DateRange;
  granularity: string;
  summary: ReportSummaryMetric[];
  series?: ReportRow[];
  previousSeries?: ReportRow[];
  table: {
    columns: ReportColumn[];
    rows: ReportRow[];
    totals: Record<string, number>;
    previousTotals: Record<string, number> | null;
  };
  note?: string;
}

export function useReportsList() {
  return useQuery({
    queryKey: ["analytics", "reports-list"],
    queryFn: () => apiClient<{ reports: ReportMeta[] }>("/analytics/report"),
    staleTime: 10 * 60_000,
  });
}

export function useReport(
  reportId: string | null,
  range: DateRange,
  granularity: "day" | "week" | "month" = "day",
) {
  return useQuery({
    queryKey: ["analytics", "report", reportId, range, granularity],
    queryFn: () =>
      apiClient<ReportPayload>(
        `/analytics/report/${reportId}?${rangeQS(range)}&granularity=${granularity}`,
      ),
    enabled: !!reportId,
    staleTime: 60_000,
  });
}
