import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";

export interface AdminUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  created_at: string;
  last_login_at: string | null;
}

export interface PaginatedUsers {
  data: AdminUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface RoleInfo {
  role: string;
  permissions: string[];
  description: string;
}

function toSearchParams(params: Record<string, unknown>): string {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "") sp.set(k, String(v));
  });
  const str = sp.toString();
  return str ? `?${str}` : "";
}

export function useAdminUsers(params: { search?: string; page?: number; limit?: number } = {}) {
  return useQuery({
    queryKey: ["admin-users", params],
    queryFn: () =>
      apiClient<PaginatedUsers>(`/settings/users${toSearchParams(params)}`),
  });
}

export function useUpdateUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      apiClient(`/settings/users/${userId}/role`, {
        method: "PATCH",
        body: { role },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });
}

export function useRoles() {
  return useQuery({
    queryKey: ["roles"],
    queryFn: () => apiClient<RoleInfo[]>("/settings/roles"),
  });
}

export interface ShippingOption {
  id: string;
  label: string;
  estimate: string;
  price: number;
}

export const DEFAULT_SHIPPING_OPTIONS: ShippingOption[] = [
  { id: "standard", label: "No rush shipping", estimate: "5-7 business days", price: 40 },
  { id: "express", label: "Express", estimate: "2-3 business days", price: 68 },
];

export function useShippingOptions() {
  return useQuery({
    queryKey: ["shipping-options"],
    queryFn: () => apiClient<ShippingOption[]>("/settings/shipping-options"),
    placeholderData: DEFAULT_SHIPPING_OPTIONS,
    staleTime: 5 * 60 * 1000,
  });
}

export interface CountryShippingRate {
  country: string; // ISO-2 destination code, e.g. "US"
  label: string;
  estimate: string;
  price: number; // flat rate in GHS
}

export const DEFAULT_COUNTRY_SHIPPING_RATES: CountryShippingRate[] = [
  { country: "US", label: "United States", estimate: "10-15 business days", price: 900 },
];

export function useCountryShippingRates() {
  return useQuery({
    queryKey: ["country-shipping-rates"],
    queryFn: () => apiClient<CountryShippingRate[]>("/settings/country-shipping-rates"),
    placeholderData: DEFAULT_COUNTRY_SHIPPING_RATES,
    staleTime: 5 * 60 * 1000,
  });
}
