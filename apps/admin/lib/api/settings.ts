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

export interface CreateUserPayload {
  email: string;
  role: string;
  first_name?: string;
  last_name?: string;
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateUserPayload) =>
      apiClient("/settings/users", { method: "POST", body: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });
}

export function useResetUserPassword() {
  return useMutation({
    mutationFn: (userId: string) =>
      apiClient(`/settings/users/${userId}/reset-password`, { method: "POST" }),
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

export function useShippingOptions() {
  return useQuery({
    queryKey: ["shipping-options"],
    queryFn: () => apiClient<ShippingOption[]>("/settings/shipping-options"),
  });
}

export function useUpdateShippingOptions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (options: ShippingOption[]) =>
      apiClient<ShippingOption[]>("/settings/shipping-options", {
        method: "PUT",
        body: { options },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shipping-options"] });
    },
  });
}

export interface CountryShippingRate {
  country: string; // ISO-2 destination code, e.g. "US"
  label: string;
  estimate: string;
  price: number; // flat rate in GHS
}

export function useCountryShippingRates() {
  return useQuery({
    queryKey: ["country-shipping-rates"],
    queryFn: () => apiClient<CountryShippingRate[]>("/settings/country-shipping-rates"),
  });
}

export function useUpdateCountryShippingRates() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rates: CountryShippingRate[]) =>
      apiClient<CountryShippingRate[]>("/settings/country-shipping-rates", {
        method: "PUT",
        body: { rates },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["country-shipping-rates"] });
    },
  });
}

export interface AnnouncementBanner {
  enabled: boolean;
  text: string;
  link: string;
}

export function useAnnouncementBanner() {
  return useQuery({
    queryKey: ["announcement-banner"],
    queryFn: () => apiClient<AnnouncementBanner>("/settings/announcement-banner"),
  });
}

export function useUpdateAnnouncementBanner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (banner: AnnouncementBanner) =>
      apiClient<AnnouncementBanner>("/settings/announcement-banner", {
        method: "PUT",
        body: banner,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["announcement-banner"] });
    },
  });
}

export function useStockHoldMinutes() {
  return useQuery({
    queryKey: ["stock-hold-minutes"],
    queryFn: () => apiClient<number>("/settings/stock-hold-minutes"),
  });
}

export function useUpdateStockHoldMinutes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (minutes: number) =>
      apiClient<number>("/settings/stock-hold-minutes", {
        method: "PUT",
        body: { minutes },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-hold-minutes"] });
    },
  });
}

export function usePreorderEtaText() {
  return useQuery({
    queryKey: ["preorder-eta-text"],
    queryFn: () => apiClient<string>("/settings/preorder-eta-text"),
  });
}

export function useUpdatePreorderEtaText() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (text: string) =>
      apiClient<string>("/settings/preorder-eta-text", {
        method: "PUT",
        body: { text },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["preorder-eta-text"] });
    },
  });
}

export function useRoadToHqBaseline() {
  return useQuery({
    queryKey: ["road-to-hq-baseline"],
    queryFn: () => apiClient<number>("/settings/road-to-hq-baseline"),
  });
}

export function useUpdateRoadToHqBaseline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (value: number) =>
      apiClient<number>("/settings/road-to-hq-baseline", {
        method: "PUT",
        body: { value },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["road-to-hq-baseline"] });
    },
  });
}

export function useRoadToHqTarget() {
  return useQuery({
    queryKey: ["road-to-hq-target"],
    queryFn: () => apiClient<number>("/settings/road-to-hq-target"),
  });
}

export function useUpdateRoadToHqTarget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (value: number) =>
      apiClient<number>("/settings/road-to-hq-target", {
        method: "PUT",
        body: { value },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["road-to-hq-target"] });
    },
  });
}
