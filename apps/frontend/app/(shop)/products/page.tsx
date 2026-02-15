"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useProducts } from "@/lib/api/products";
import { ProductGrid } from "../components/ProductGrid";
import { ProductFilters } from "../components/ProductFilters";

function ProductCatalogContent() {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("search") || "";

  const [gender, setGender] = useState("");
  const [sort, setSort] = useState("created_at:desc");
  const [search, setSearch] = useState(initialSearch);
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);

  const [sortBy, sortOrder] = sort.split(":");

  const { data, isLoading } = useProducts({
    gender: gender || undefined,
    search: search || undefined,
    sort_by: sortBy,
    sort_order: sortOrder,
    page,
    limit: 16,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-1 text-xs font-semibold uppercase tracking-widest text-gray-900 dark:text-white">
        Discover All Products
      </h1>

      <div className="mt-6">
        <ProductFilters
          gender={gender}
          sort={sort}
          search={search}
          category={category}
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
          onCategoryChange={(v) => {
            setCategory(v);
            setPage(1);
          }}
        />
      </div>

      <div className="mt-8">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="aspect-[3/4] animate-pulse bg-gray-100 dark:bg-gray-800" />
                <div className="h-3 w-3/4 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                <div className="h-3 w-1/4 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
              </div>
            ))}
          </div>
        ) : (
          <ProductGrid products={data?.data || []} />
        )}
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="mt-10 flex items-center justify-center gap-4">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page <= 1}
            className="text-xs font-medium uppercase tracking-widest text-gray-500 transition hover:text-black disabled:opacity-30 dark:hover:text-white"
          >
            Previous
          </button>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {data.page} / {data.totalPages}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= data.totalPages}
            className="text-xs font-medium uppercase tracking-widest text-gray-500 transition hover:text-black disabled:opacity-30 dark:hover:text-white"
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
          <div className="h-4 w-48 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
        </div>
      }
    >
      <ProductCatalogContent />
    </Suspense>
  );
}
