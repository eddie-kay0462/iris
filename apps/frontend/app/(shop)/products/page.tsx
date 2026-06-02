"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { InfiniteProductGrid } from "../components/InfiniteProductGrid";
import { ProductFilters } from "../components/ProductFilters";
import { PersonalisedStrip } from "../components/PersonalisedStrip";
import { useState, useEffect, useCallback } from 'react';

function ProductCatalogContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [gender, setGender] = useState("");
  const [sort, setSort] = useState("created_at:desc");
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [productType, setProductType] = useState(searchParams.get("product_type") || "");

  // Sync URL params → state whenever the URL changes (e.g. searching from the navbar
  // while already on this page doesn't remount the component, only re-renders it)
  useEffect(() => {
    setSearch(searchParams.get("search") || "");
    setCategory(searchParams.get("category") || "");
    setProductType(searchParams.get("product_type") || "");
  }, [searchParams]);

  const handleClearAll = useCallback(() => {
    setGender("");
    setSort("created_at:desc");
    setSearch("");
    setCategory("");
    setProductType("");
    router.replace("/products");
  }, [router]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-1 text-xs font-semibold uppercase tracking-widest text-gray-900 dark:text-white">
        Discover All Products
      </h1>

      <div className="mt-6">
        <PersonalisedStrip />
      </div>

      <div className="mt-6">
        <ProductFilters
          gender={gender}
          sort={sort}
          search={search}
          category={category}
          productType={productType}
          onGenderChange={setGender}
          onSortChange={setSort}
          onSearchChange={setSearch}
          onCategoryChange={(v) => {
            setCategory(v);
            setProductType("");
          }}
          onProductTypeChange={setProductType}
          onClearAll={handleClearAll}
        />
      </div>

      <div className="mt-8 xl:-mx-4">
        <InfiniteProductGrid
          gender={gender}
          sort={sort}
          search={search}
          category={category}
          productType={productType}
        />
      </div>
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
