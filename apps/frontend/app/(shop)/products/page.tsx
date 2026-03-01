"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { InfiniteProductGrid } from "../components/InfiniteProductGrid";
import { ProductFilters } from "../components/ProductFilters";
import { PersonalisedStrip } from "../components/PersonalisedStrip";
import { hasToken } from "@/lib/api/client";

function ProductCatalogContent() {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("search") || "";

  const [gender, setGender] = useState("");
  const [sort, setSort] = useState("created_at:desc");
  const [search, setSearch] = useState(initialSearch);
  const [category, setCategory] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Detect login state client-side (token stored in localStorage)
  useEffect(() => {
    setIsLoggedIn(hasToken());
  }, []);

  /* Removed page state as it's handled by infinite scroll */

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-1 text-xs font-semibold uppercase tracking-widest text-gray-900 dark:text-white">
        Discover All Products
      </h1>

      {/* Personalised strip — only shown when user is logged in */}
      {isLoggedIn && (
        <div className="mt-6">
          <PersonalisedStrip />
        </div>
      )}

      <div className="mt-6">
        <ProductFilters
          gender={gender}
          sort={sort}
          search={search}
          category={category}
          onGenderChange={(v) => {
            setGender(v);
          }}
          onSortChange={(v) => {
            setSort(v);
          }}
          onSearchChange={(v) => {
            setSearch(v);
          }}
          onCategoryChange={(v) => {
            setCategory(v);
          }}
        />
      </div>

      <div className="mt-8">
        <InfiniteProductGrid
          gender={gender}
          sort={sort}
          search={search}
          category={category}
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
