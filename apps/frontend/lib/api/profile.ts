import { useQuery } from "@tanstack/react-query";
import { apiClient } from "./client";

export interface DefaultAddress {
  address1?: string;
  address2?: string;
  city?: string;
  province_code?: string;
  country_code?: string;
  zip?: string;
  phone?: string;
}

export interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  default_address: DefaultAddress | string | null;
}

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: () => apiClient<UserProfile>("/profile"),
    staleTime: 5 * 60 * 1000,
  });
}

export function parseDefaultAddress(raw: DefaultAddress | string | null): DefaultAddress {
  if (!raw) return {};
  try {
    const parsed: DefaultAddress = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (parsed.phone) {
      parsed.phone = parsed.phone.replace(/^'+/, "");
    }
    return parsed;
  } catch {
    return {};
  }
}
