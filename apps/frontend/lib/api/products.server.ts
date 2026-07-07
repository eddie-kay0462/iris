/**
 * Server-side product fetchers for SEO surfaces (sitemap, generateMetadata,
 * JSON-LD). These run on the server without the browser `apiClient` (which reads
 * localStorage) and only touch the public, unauthenticated product endpoints.
 *
 * Every call is defensive: if the backend is unreachable at build/request time,
 * we return null/empty so a sitemap or a page render never crashes.
 */
import { cache } from "react";
import type { PaginatedResponse, Product } from "./products";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

/** Fetch a single published product by id or handle. Returns null on any failure. */
export const getProductServer = cache(
  async (idOrHandle: string): Promise<Product | null> => {
    if (!idOrHandle) return null;
    try {
      const res = await fetch(
        `${API_BASE_URL}/products/${encodeURIComponent(idOrHandle)}`,
        { next: { revalidate: 300 } },
      );
      if (!res.ok) return null;
      return (await res.json()) as Product;
    } catch {
      return null;
    }
  },
);

/**
 * Fetch every active (live) product for the sitemap and listing structured
 * data. Returns an empty array if the backend is unavailable.
 */
export const getPublishedProducts = cache(
  async (limit = 1000): Promise<Product[]> => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/products?limit=${limit}&sort_by=created_at&sort_order=desc`,
        { next: { revalidate: 3600 } },
      );
      if (!res.ok) return [];
      const json = (await res.json()) as PaginatedResponse<Product>;
      return json.data ?? [];
    } catch {
      return [];
    }
  },
);

/** The canonical storefront path for a product ("/product/{handle||id}"). */
export function productPath(product: Pick<Product, "id" | "handle">): string {
  return `/product/${product.handle || product.id}`;
}
