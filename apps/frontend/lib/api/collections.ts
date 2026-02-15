import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
import type { Product } from "./products";

// --- Types ---

export interface Collection {
  id: string;
  title: string;
  handle: string;
  description: string | null;
  image_url: string | null;
  published: boolean;
  created_at: string;
  updated_at: string;
  product_count?: number;
  collection_products?: Array<{
    position: number;
    product: Product;
  }>;
}

// --- Hooks ---

export function useCollections() {
  return useQuery({
    queryKey: ["collections"],
    queryFn: () => apiClient<Collection[]>("/collections"),
  });
}

export function useCollection(idOrHandle: string) {
  return useQuery({
    queryKey: ["collection", idOrHandle],
    queryFn: () => apiClient<Collection>(`/collections/${idOrHandle}`),
    enabled: !!idOrHandle,
  });
}

export function useAdminCollections() {
  return useQuery({
    queryKey: ["admin-collections"],
    queryFn: () => apiClient<Collection[]>("/collections/admin/list"),
  });
}

export function useCreateCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient<Collection>("/collections", { method: "POST", body: data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-collections"] });
    },
  });
}

export function useUpdateCollection(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient<Collection>(`/collections/${id}`, {
        method: "PUT",
        body: data,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-collections"] });
    },
  });
}

export function useDeleteCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient(`/collections/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-collections"] });
    },
  });
}

export function useAddCollectionProducts(collectionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (productIds: string[]) =>
      apiClient(`/collections/${collectionId}/products`, {
        method: "POST",
        body: { product_ids: productIds },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-collections"] });
      qc.invalidateQueries({ queryKey: ["collection", collectionId] });
    },
  });
}

export function useRemoveCollectionProduct(collectionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (productId: string) =>
      apiClient(`/collections/${collectionId}/products/${productId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-collections"] });
      qc.invalidateQueries({ queryKey: ["collection", collectionId] });
    },
  });
}
