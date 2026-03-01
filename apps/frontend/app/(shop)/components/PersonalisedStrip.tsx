"use client";

import { usePersonalisedProducts } from "@/lib/api/recommendations";
import { ProductCard } from "./ProductCard";

/**
 * A horizontally scrollable strip of personalised product recommendations.
 *
 * Renders nothing if:
 *  - the recommendations are still loading
 *  - the recommender returns an empty list (offline / no data)
 *  - there is an error
 *
 * Call this only when the user is logged in — the hook sends the JWT
 * automatically via apiClient, so NestJS can identify the user.
 */
export function PersonalisedStrip({ k = 12 }: { k?: number }) {
    const { data, isLoading } = usePersonalisedProducts(k);

    // Skeleton while loading
    if (isLoading) {
        return (
            <div className="mb-10">
                <div className="mb-3 h-3 w-32 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                <div className="flex gap-4 overflow-x-auto pb-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="w-40 shrink-0 space-y-2">
                            <div className="aspect-[3/4] animate-pulse bg-gray-100 dark:bg-gray-800" />
                            <div className="h-2.5 w-3/4 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                            <div className="h-2.5 w-1/3 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // Render nothing if there are no recommendations (recommender offline, guest, etc.)
    if (!data || data.length === 0) return null;

    return (
        <div className="mb-10">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-900 dark:text-white">
                Picked for you
            </h2>

            {/* Horizontal scroll container */}
            <div className="flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {data.map((product) => (
                    <div key={product.id} className="w-40 shrink-0">
                        <ProductCard product={product} />
                    </div>
                ))}
            </div>
        </div>
    );
}
