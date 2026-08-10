"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { InfiniteProductGrid } from "../components/InfiniteProductGrid";
import { ProductFilters } from "../components/ProductFilters";
import { PersonalisedStrip } from "../components/PersonalisedStrip";
import { useState, useCallback } from "react";

export function ProductsCatalogClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Filters are derived straight from the URL (the single source of truth) —
  // no mirrored state/effect pair, so a URL change (navbar search, back/forward,
  // clicking a filter) is reflected immediately with no extra render lag.
  const gender = searchParams.get("gender") || "";
  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || "";
  const productType = searchParams.get("product_type") || "";

  // Sort isn't part of the URL contract (not required for this pass), so it
  // stays local-only, same as before.
  const [sort, setSort] = useState("created_at:desc");

  // Sync filter changes → URL, so filtered views are linkable/bookmarkable/
  // shareable and match what generateMetadata (page.tsx) canonicalizes against.
  const updateUrl = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const handleClearAll = useCallback(() => {
    setSort("created_at:desc");
    router.replace("/products", { scroll: false });
  }, [router]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-1 text-xs font-semibold uppercase tracking-widest text-text">
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
          onGenderChange={(v) => updateUrl({ gender: v })}
          onSortChange={setSort}
          onSearchChange={(v) => updateUrl({ search: v })}
          onCategoryChange={(v) => updateUrl({ category: v, product_type: "" })}
          onProductTypeChange={(v) => updateUrl({ product_type: v })}
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
