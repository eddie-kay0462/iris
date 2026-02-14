import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";

// --- Types ---

export interface ProductImage {
  id: string;
  product_id: string;
  src: string;
  alt_text: string | null;
  position: number;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  option1_name: string | null;
  option1_value: string | null;
  option2_name: string | null;
  option2_value: string | null;
  option3_name: string | null;
  option3_value: string | null;
  price: number | null;
  compare_at_price: number | null;
  sku: string | null;
  barcode: string | null;
  inventory_quantity: number;
  weight: number | null;
  weight_unit: string | null;
}

export interface Product {
  id: string;
  title: string;
  handle: string;
  description: string | null;
  base_price: number | null;
  status: "draft" | "active" | "archived";
  gender: "men" | "women" | "all" | null;
  product_type: string | null;
  vendor: string | null;
  tags: string[] | null;
  published: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  product_variants: ProductVariant[];
  product_images: ProductImage[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ProductQueryParams {
  search?: string;
  status?: string;
  gender?: string;
  published?: string;
  sort_by?: string;
  sort_order?: string;
  page?: number;
  limit?: number;
}

// --- Hooks ---

function toSearchParams(params: ProductQueryParams): string {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "") sp.set(k, String(v));
  });
  const str = sp.toString();
  return str ? `?${str}` : "";
}

export function useProducts(params: ProductQueryParams = {}) {
  return useQuery({
    queryKey: ["products", params],
    queryFn: () =>
      apiClient<PaginatedResponse<Product>>(
        `/products${toSearchParams(params)}`,
      ),
  });
}

export function useProduct(idOrHandle: string) {
  return useQuery({
    queryKey: ["product", idOrHandle],
    queryFn: () => apiClient<Product>(`/products/${idOrHandle}`),
    enabled: !!idOrHandle,
  });
}

export function useAdminProducts(params: ProductQueryParams = {}) {
  return useQuery({
    queryKey: ["admin-products", params],
    queryFn: () =>
      apiClient<PaginatedResponse<Product>>(
        `/products/admin/list${toSearchParams(params)}`,
      ),
  });
}

export function useAdminProduct(id: string) {
  return useQuery({
    queryKey: ["admin-product", id],
    queryFn: () => apiClient<Product>(`/products/admin/list?id=${id}`),
    enabled: false, // We'll use a direct fetch instead
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient<Product>("/products", { method: "POST", body: data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
    },
  });
}

export function useUpdateProduct(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient<Product>(`/products/${id}`, { method: "PUT", body: data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["admin-product", id] });
    },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient(`/products/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
    },
  });
}

export function usePublishProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<Product>(`/products/${id}/publish`, { method: "PATCH" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
    },
  });
}

// --- Variant mutations ---

export function useAddVariant(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient(`/products/${productId}/variants`, {
        method: "POST",
        body: data,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-product", productId] });
    },
  });
}

export function useUpdateVariant(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      variantId,
      data,
    }: {
      variantId: string;
      data: Record<string, unknown>;
    }) =>
      apiClient(`/products/${productId}/variants/${variantId}`, {
        method: "PUT",
        body: data,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-product", productId] });
    },
  });
}

export function useDeleteVariant(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (variantId: string) =>
      apiClient(`/products/${productId}/variants/${variantId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-product", productId] });
    },
  });
}

// --- Image mutations ---

export function useAddImage(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { src: string; alt_text?: string }) =>
      apiClient(`/products/${productId}/images`, {
        method: "POST",
        body: data,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-product", productId] });
    },
  });
}

export function useDeleteImage(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (imageId: string) =>
      apiClient(`/products/${productId}/images/${imageId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-product", productId] });
    },
  });
}

export function useReorderImages(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (imageIds: string[]) =>
      apiClient(`/products/${productId}/images/reorder`, {
        method: "PUT",
        body: { image_ids: imageIds },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-product", productId] });
    },
  });
}

// --- Direct fetch for product detail (used in edit page) ---

export async function fetchAdminProduct(id: string): Promise<Product> {
  return apiClient<Product>(`/products/${id}`);
}
