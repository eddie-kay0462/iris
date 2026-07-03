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
    productType?: string;
}

export function InfiniteProductGrid({
    gender,
    sort,
    search,
    category,
    productType,
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
        category: category || undefined,
        product_type: productType || undefined,
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
            <div className="grid grid-cols-2 gap-x-0.5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
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
            <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
                <p className="text-[13px] uppercase tracking-[0.14em] text-[#59626E] dark:text-neutral-400">
                    Something went wrong loading products.
                </p>
                <button
                    onClick={() => window.location.reload()}
                    className="border border-black px-6 py-2.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-black transition hover:bg-black hover:text-white dark:border-white dark:text-white dark:hover:bg-white dark:hover:text-black"
                >
                    Try again
                </button>
            </div>
        );
    }

    const products = data?.pages.flatMap((page) => page.data) || [];

    if (products.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center">
                <p className="select-none text-[64px] font-semibold leading-none tracking-tight text-gray-100 dark:text-neutral-800 sm:text-[96px]">
                    0/1NRI
                </p>
                <p className="mt-6 text-[13px] uppercase tracking-[0.2em] text-[#59626E] dark:text-neutral-300">
                    Nothing here. You&apos;re just early.
                </p>
                <p className="mt-2 max-w-xs text-[12px] leading-relaxed tracking-[0.04em] text-gray-400 dark:text-neutral-600">
                    Either it all sold out or the drop hasn&apos;t landed yet.
                    Being this early is basically a flex - check back soon.
                </p>
            </div>
        );
    }

    return (
        <>
            <div className="grid grid-cols-2 gap-x-0.5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
                {products.map((product, i) => (
                    <ProductCard key={product.id} product={product} priority={i < 4} />
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
