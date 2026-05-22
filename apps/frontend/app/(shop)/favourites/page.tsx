"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heart } from "lucide-react";
import { hasToken } from "@/lib/api/client";
import { useFavourites } from "@/lib/favourites";
import { ProductCard } from "../components/ProductCard";
import type { Product } from "@/lib/api/products";

function toProduct(fav: NonNullable<ReturnType<typeof useFavourites>["data"]>[number]): Product {
  const p = fav.products;
  return {
    id: p.id,
    title: p.title,
    handle: p.handle,
    base_price: p.base_price,
    product_images: (p.product_images ?? []).sort((a, b) => a.position - b.position),
    product_variants: [],
    description: null,
    status: "active",
    gender: null,
    product_type: null,
    category: null,
    vendor: null,
    tags: null,
    published: true,
    gsm: null,
    seo_title: null,
    seo_description: null,
    is_new_arrival: false,
    is_best_seller: false,
    is_featured: false,
    early_access_start: null,
    public_release_date: null,
    created_at: fav.created_at,
    updated_at: fav.created_at,
    deleted_at: null,
  };
}

export default function FavouritesPage() {
  const router = useRouter();
  const { data: favourites, isLoading } = useFavourites();

  useEffect(() => {
    if (!hasToken()) router.replace("/login");
  }, [router]);

  if (isLoading) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-12">
        <h1 className="text-[13px] tracking-[0.22em] uppercase font-medium mb-8">Saved Items</h1>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] animate-pulse bg-[#f4f3f1]" />
          ))}
        </div>
      </div>
    );
  }

  if (!favourites || favourites.length === 0) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-24 flex flex-col items-center text-center gap-5">
        <Heart className="w-10 h-10 text-black/20" strokeWidth={1} />
        <h1 className="text-[13px] tracking-[0.22em] uppercase font-medium">No saved items yet</h1>
        <p className="text-sm text-[#59626E] max-w-xs">
          Tap the heart on any product to save it here for later.
        </p>
        <Link
          href="/products"
          className="mt-2 inline-block bg-black text-white px-8 py-3 text-[12px] tracking-[0.2em] uppercase font-bold"
        >
          Shop Now
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-12">
      <div className="flex items-baseline justify-between mb-8">
        <h1 className="text-[13px] tracking-[0.22em] uppercase font-medium">
          Saved Items
        </h1>
        <span className="text-[11px] tracking-[0.14em] uppercase text-[#59626E]">
          {favourites.length} {favourites.length === 1 ? "item" : "items"}
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        {favourites.map((fav) => (
          <ProductCard key={fav.id} product={toProduct(fav)} />
        ))}
      </div>
    </div>
  );
}
