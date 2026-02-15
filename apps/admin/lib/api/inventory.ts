import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";

// --- Types ---

export interface InventoryItem {
  id: string;
  product_id: string;
  sku: string | null;
  option1_name: string | null;
  option1_value: string | null;
  option2_name: string | null;
  option2_value: string | null;
  inventory_quantity: number;
  price: number | null;
  product: {
    id: string;
    title: string;
    status: string;
  };
}

export interface InventoryStats {
  totalSkus: number;
  lowStock: number;
  outOfStock: number;
  totalValue: number;
}

export interface InventoryMovement {
  id: string;
  variant_id: string;
  quantity_change: number;
  quantity_before: number;
  quantity_after: number;
  movement_type: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  variant?: {
    id: string;
    sku: string;
    product: { title: string };
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface InventoryQueryParams {
  search?: string;
  low_stock?: string;
  out_of_stock?: string;
  page?: number;
  limit?: number;
}

export interface MovementQueryParams {
  variant_id?: string;
  movement_type?: string;
  from_date?: string;
  to_date?: string;
  page?: number;
  limit?: number;
}

// --- Hooks ---

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toSearchParams(params: Record<string, any>): string {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "") sp.set(k, String(v));
  });
  const str = sp.toString();
  return str ? `?${str}` : "";
}

export function useInventory(params: InventoryQueryParams = {}) {
  return useQuery({
    queryKey: ["inventory", params],
    queryFn: () =>
      apiClient<PaginatedResponse<InventoryItem>>(
        `/inventory${toSearchParams(params)}`,
      ),
  });
}

export function useInventoryStats() {
  return useQuery({
    queryKey: ["inventory-stats"],
    queryFn: () => apiClient<InventoryStats>("/inventory/stats"),
  });
}

export function useLowStockItems() {
  return useQuery({
    queryKey: ["inventory-low-stock"],
    queryFn: () => apiClient<InventoryItem[]>("/inventory/low-stock"),
  });
}

export function useAdjustStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      variant_id: string;
      quantity_change: number;
      movement_type: string;
      notes?: string;
    }) => apiClient("/inventory/adjust", { method: "POST", body: data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["inventory-stats"] });
      qc.invalidateQueries({ queryKey: ["inventory-low-stock"] });
    },
  });
}

export function useInventoryMovements(params: MovementQueryParams = {}) {
  return useQuery({
    queryKey: ["inventory-movements", params],
    queryFn: () =>
      apiClient<PaginatedResponse<InventoryMovement>>(
        `/inventory/movements${toSearchParams(params)}`,
      ),
  });
}
