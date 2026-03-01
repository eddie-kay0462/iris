import { useQuery } from "@tanstack/react-query";
import { apiClient } from "./client";
import type { Product } from "./products";

/**
 * Fetch personalised recommendations for the currently logged-in user.
 * The NestJS backend reads the JWT to identify the user.
 * Falls back to popularity for guests and unknown users.
 * Returns an empty array if the recommender service is offline.
 */
export function usePersonalisedProducts(k = 12) {
    return useQuery<Product[]>({
        queryKey: ["recommendations", "for-you", k],
        queryFn: () =>
            apiClient<Product[]>(`/recommendations/for-you?k=${k}`).catch(() => []),
        staleTime: 5 * 60 * 1000, // 5 minutes — recs don't need to be ultra-fresh
        retry: false,              // don't retry on failure; just show nothing
    });
}

/**
 * Fetch products similar to the given product handle.
 * Always public — no auth needed.
 * Returns an empty array if the recommender service is offline or
 * the product is not in the training data.
 */
export function useSimilarProducts(productHandle: string, k = 6) {
    return useQuery<Product[]>({
        queryKey: ["recommendations", "similar", productHandle, k],
        queryFn: () =>
            apiClient<Product[]>(
                `/recommendations/similar/${encodeURIComponent(productHandle)}?k=${k}`,
            ).catch(() => []),
        enabled: !!productHandle,
        staleTime: 10 * 60 * 1000, // 10 minutes — content similarity is stable
        retry: false,
    });
}
