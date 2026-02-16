"use client";

import { useInView } from "react-intersection-observer";
import { useEffect } from "react";
import { ProductCard } from "./ProductCard";
import { useInfiniteProducts } from "@/lib/api/products";

interface InfiniteProductGridProps {
    initialSearch?: string;
    gender?: string;
    sort?: string;
    search?: string;
    category?: string;
}

export function InfiniteProductGrid({
    gender,
    sort,
    search,
}: InfiniteProductGridProps) {
    const [sortBy, sortOrder] = (sort || "created_at:desc").split(":");

    const {
        data,
        isLoading,
        isError,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useInfiniteProducts({
        gender: gender || undefined,
        search: search || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
        limit: 16,
    });

    const { ref, inView } = useInView();

    useEffect(() => {
        if (inView && hasNextPage) {
            fetchNextPage();
        }
    }, [inView, hasNextPage, fetchNextPage]);

    if (isLoading) {
        return (
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="space-y-3">
                        <div className="aspect-[3/4] animate-pulse bg-gray-100 dark:bg-gray-800" />
                        <div className="h-3 w-3/4 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                        <div className="h-3 w-1/4 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                    </div>
                ))}
            </div>
        );
    }

    if (isError) {
        return (
            <div className="py-16 text-center text-sm text-red-500">
                Error loading products. Please try again.
            </div>
        );
    }

    const products = data?.pages.flatMap((page) => page.data) || [];

    if (products.length === 0) {
        return (
            <div className="py-16 text-center text-sm text-gray-400 dark:text-gray-500">
                No products found.
            </div>
        );
    }

    return (
        <>
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
                {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                ))}
            </div>

            {/* Loading trigger / Spinner */}
            {hasNextPage && (
                <div
                    ref={ref}
                    className="mt-10 flex flex-col items-center justify-center gap-2 py-4"
                >
                    {isFetchingNextPage ? (
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-black dark:border-gray-600 dark:border-t-white" />
                    ) : (
                        <div className="h-6 w-6" /> // Spacer to ensure intersection happens
                    )}
                </div>
            )}

            {!hasNextPage && products.length > 0 && (
                <div className="mt-10 text-center text-xs text-gray-400 dark:text-gray-500">
                    Waiting for more 1NRI drops...
                </div>
            )}
        </>
    );
}
