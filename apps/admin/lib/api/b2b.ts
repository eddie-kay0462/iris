import { useQuery, useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
import type { B2bCostKind, B2bFinancials } from "@/lib/b2b-math";

/**
 * A B2B change moves the B2B page, client totals and (once an order completes)
 * the company revenue figures, so refresh all of them together.
 */
function invalidateB2bViews(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ["b2b-summary"] });
  qc.invalidateQueries({ queryKey: ["b2b-orders"] });
  qc.invalidateQueries({ queryKey: ["b2b-order"] });
  qc.invalidateQueries({ queryKey: ["b2b-clients"] });
  qc.invalidateQueries({ queryKey: ["b2b-client"] });
  qc.invalidateQueries({ queryKey: ["admin-analytics"] });
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type B2bStatus = "draft" | "confirmed" | "in_production" | "completed" | "cancelled";

export const B2B_STATUS_LABELS: Record<B2bStatus, string> = {
  draft: "Draft",
  confirmed: "Confirmed",
  in_production: "In production",
  completed: "Completed",
  cancelled: "Cancelled",
};

/** Mirrors B2B_STATUS_TRANSITIONS in apps/backend/src/b2b/b2b-rules.ts. */
export const B2B_STATUS_TRANSITIONS: Record<B2bStatus, B2bStatus[]> = {
  draft: ["confirmed", "cancelled"],
  confirmed: ["draft", "in_production", "completed", "cancelled"],
  in_production: ["confirmed", "completed", "cancelled"],
  completed: ["in_production"],
  cancelled: ["draft"],
};

export interface B2bClientStats {
  orders: number;
  completedOrders: number;
  openOrders: number;
  revenue: number;
  units: number;
  pipelineValue: number;
  lastOrderAt: string | null;
}

export interface B2bClient {
  id: string;
  name: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  notes: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  stats: B2bClientStats;
}

export interface B2bOrderListItem {
  id: string;
  order_number: string;
  client_id: string;
  title: string;
  status: B2bStatus;
  units: number;
  unit_price: number;
  total_cost: number;
  revenue: number;
  gross_profit: number;
  unit_cost: number;
  margin_pct: number | null;
  overdue: boolean;
  expected_start_date: string | null;
  expected_delivery_date: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  client: { id: string; name: string; contact_name: string | null } | null;
}

export interface B2bCostLineRow {
  id: string;
  label: string;
  kind: B2bCostKind;
  amount: number;
  sort_order: number;
}

export interface B2bOrder extends Omit<B2bOrderListItem, "client" | "unit_cost" | "margin_pct"> {
  notes: string | null;
  created_by: string | null;
  client: Omit<B2bClient, "stats">;
  cost_lines: B2bCostLineRow[];
  financials: B2bFinancials;
}

export interface B2bClientDetail extends B2bClient {
  orders: B2bOrderListItem[];
}

export interface B2bOrdersResult {
  data: B2bOrderListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface B2bTotals {
  revenue: number;
  totalCost: number;
  grossProfit: number;
  units: number;
  orders: number;
  averageOrderValue: number;
  marginPct: number | null;
}

export interface B2bSummary extends B2bTotals {
  period: { from: string | null; to: string };
  previous: B2bTotals | null;
  onTime: { rate: number | null; onTime: number; measured: number };
  pipeline: {
    orders: number;
    units: number;
    revenue: number;
    byStatus: Record<"draft" | "confirmed" | "in_production", number>;
  };
  overdue: number;
  clients: { total: number; active: number };
}

export interface B2bClientInput {
  name: string;
  /** null clears the field on edit. */
  contact_name?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  notes?: string | null;
}

export interface B2bCostLineInput {
  label: string;
  kind: B2bCostKind;
  amount: number;
}

export interface CreateB2bOrderInput {
  client_id: string;
  title: string;
  notes?: string;
  units: number;
  unit_price: number;
  cost_lines: B2bCostLineInput[];
  expected_start_date?: string;
  expected_delivery_date?: string;
  status?: "draft" | "confirmed";
}

export interface UpdateB2bOrderInput {
  client_id?: string;
  title?: string;
  notes?: string;
  units?: number;
  unit_price?: number;
  cost_lines?: B2bCostLineInput[];
  expected_start_date?: string | null;
  expected_delivery_date?: string | null;
}

// ─── Hooks: read ──────────────────────────────────────────────────────────────

export function useB2bSummary(range: { from?: string; to?: string }) {
  const sp = new URLSearchParams();
  if (range.from) sp.set("from", range.from);
  if (range.to) sp.set("to", range.to);
  const qs = sp.toString() ? `?${sp.toString()}` : "";
  return useQuery({
    queryKey: ["b2b-summary", range],
    queryFn: () => apiClient<B2bSummary>(`/b2b/summary${qs}`),
  });
}

export function useB2bOrders(
  params: { status?: B2bStatus | "open"; client_id?: string; search?: string; page?: number; limit?: number } = {},
) {
  const sp = new URLSearchParams();
  if (params.status) sp.set("status", params.status);
  if (params.client_id) sp.set("client_id", params.client_id);
  if (params.search) sp.set("search", params.search);
  if (params.page) sp.set("page", String(params.page));
  if (params.limit) sp.set("limit", String(params.limit));
  const qs = sp.toString() ? `?${sp.toString()}` : "";
  return useQuery({
    queryKey: ["b2b-orders", params],
    queryFn: () => apiClient<B2bOrdersResult>(`/b2b/orders${qs}`),
  });
}

export function useB2bOrder(id: string | null) {
  return useQuery({
    queryKey: ["b2b-order", id],
    queryFn: () => apiClient<B2bOrder>(`/b2b/orders/${id}`),
    enabled: !!id,
  });
}

export function useB2bClients(params: { search?: string; includeArchived?: boolean } = {}) {
  const sp = new URLSearchParams();
  if (params.search) sp.set("search", params.search);
  if (params.includeArchived) sp.set("include_archived", "true");
  const qs = sp.toString() ? `?${sp.toString()}` : "";
  return useQuery({
    queryKey: ["b2b-clients", params],
    queryFn: () => apiClient<B2bClient[]>(`/b2b/clients${qs}`),
  });
}

export function useB2bClient(id: string | null) {
  return useQuery({
    queryKey: ["b2b-client", id],
    queryFn: () => apiClient<B2bClientDetail>(`/b2b/clients/${id}`),
    enabled: !!id,
  });
}

// ─── Hooks: write ─────────────────────────────────────────────────────────────

export function useCreateB2bClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: B2bClientInput) =>
      apiClient<Omit<B2bClient, "stats">>("/b2b/clients", { method: "POST", body: dto }),
    onSuccess: () => invalidateB2bViews(qc),
  });
}

export function useUpdateB2bClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...dto }: Partial<B2bClientInput> & { id: string; archived?: boolean }) =>
      apiClient<Omit<B2bClient, "stats">>(`/b2b/clients/${id}`, { method: "PATCH", body: dto }),
    onSuccess: () => invalidateB2bViews(qc),
  });
}

export function useCreateB2bOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateB2bOrderInput) =>
      apiClient<B2bOrder>("/b2b/orders", { method: "POST", body: dto }),
    onSuccess: () => invalidateB2bViews(qc),
  });
}

export function useUpdateB2bOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...dto }: UpdateB2bOrderInput & { id: string }) =>
      apiClient<B2bOrder>(`/b2b/orders/${id}`, { method: "PATCH", body: dto }),
    onSuccess: () => invalidateB2bViews(qc),
  });
}

export function useUpdateB2bOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, completed_at }: { id: string; status: B2bStatus; completed_at?: string }) =>
      apiClient<B2bOrder>(`/b2b/orders/${id}/status`, {
        method: "POST",
        body: { status, ...(completed_at ? { completed_at } : {}) },
      }),
    onSuccess: () => invalidateB2bViews(qc),
  });
}
