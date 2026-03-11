import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";

// --- Types ---

export interface Review {
  id: string;
  product_id: string;
  variant_id: string | null;
  user_id: string | null;
  email: string | null;
  name: string | null;
  rating: number;
  title: string | null;
  review_text: string | null;
  is_verified_purchase: boolean;
  order_id: string | null;
  is_approved: boolean;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  products?: { id: string; title: string; handle: string } | null;
}

export interface PaginatedReviews {
  data: Review[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ReviewQueryParams {
  page?: number;
  limit?: number;
  product_id?: string;
  is_approved?: string;
  rating?: number;
}

function toSearchParams(params: ReviewQueryParams): string {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "") sp.set(k, String(v));
  });
  const str = sp.toString();
  return str ? `?${str}` : "";
}

// --- Hooks ---

export function useReviews(params: ReviewQueryParams = {}) {
  return useQuery({
    queryKey: ["reviews", params],
    queryFn: () =>
      apiClient<PaginatedReviews>(`/reviews${toSearchParams(params)}`),
  });
}

export function useApproveReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<Review>(`/reviews/${id}/approve`, { method: "PATCH" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reviews"] });
    },
  });
}

export function useDeleteReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient(`/reviews/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reviews"] });
    },
  });
}
