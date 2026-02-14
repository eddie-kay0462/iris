"use client";

import { Suspense, useState } from "react";
import { useProducts } from "@/lib/api/products";
import { ProductGrid } from "../components/ProductGrid";
import { ProductFilters } from "../components/ProductFilters";

function ProductCatalogContent() {
  const [gender, setGender] = useState("");
  const [sort, setSort] = useState("created_at:desc");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [sortBy, sortOrder] = sort.split(":");

  const { data, isLoading } = useProducts({
    gender: gender || undefined,
    search: search || undefined,
    sort_by: sortBy,
    sort_order: sortOrder,
    page,
    limit: 12,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold text-gray-900 dark:text-white">Products</h1>

      <ProductFilters
        gender={gender}
        sort={sort}
        search={search}
        onGenderChange={(v) => {
          setGender(v);
          setPage(1);
        }}
        onSortChange={(v) => {
          setSort(v);
          setPage(1);
        }}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
      />

      <div className="mt-8">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="aspect-[3/4] animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                <div className="h-4 w-1/4 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
              </div>
            ))}
          </div>
        ) : (
          <ProductGrid products={data?.data || []} />
        )}
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-4">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page <= 1}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Page {data.page} of {data.totalPages}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= data.totalPages}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="h-8 w-40 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
        </div>
      }
    >
      <ProductCatalogContent />
    </Suspense>
  );
}
