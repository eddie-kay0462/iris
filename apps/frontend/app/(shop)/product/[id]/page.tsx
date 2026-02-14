"use client";

import { use, useState } from "react";
import { useProduct, type ProductVariant } from "@/lib/api/products";
import { ImageGallery } from "../../components/ImageGallery";
import { VariantSelector } from "../../components/VariantSelector";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function ProductDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const { data: product, isLoading, error } = useProduct(id);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    null,
  );

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <div className="aspect-square animate-pulse rounded-lg bg-gray-100" />
          <div className="space-y-4">
            <div className="h-8 w-3/4 animate-pulse rounded bg-gray-100" />
            <div className="h-6 w-1/4 animate-pulse rounded bg-gray-100" />
            <div className="h-24 animate-pulse rounded bg-gray-100" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <p className="text-center text-gray-500">Product not found.</p>
      </div>
    );
  }

  const variants = product.product_variants || [];
  const active = selectedVariant || variants[0] || null;
  const displayPrice = active?.price ?? product.base_price;
  const comparePrice = active?.compare_at_price ?? product.compare_at_price;
  const inStock = active ? active.inventory_quantity > 0 : true;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Breadcrumbs */}
      <nav className="mb-6 text-sm text-gray-500">
        <a href="/products" className="hover:text-gray-700">
          Products
        </a>
        <span className="mx-2">/</span>
        <span className="text-gray-900">{product.title}</span>
      </nav>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Images */}
        <ImageGallery images={product.product_images || []} />

        {/* Product info */}
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {product.title}
            </h1>
            {product.vendor && (
              <p className="mt-1 text-sm text-gray-500">{product.vendor}</p>
            )}
          </div>

          <div className="flex items-baseline gap-3">
            {displayPrice != null && (
              <span className="text-2xl font-bold text-gray-900">
                ₦{displayPrice.toLocaleString()}
              </span>
            )}
            {comparePrice != null && comparePrice > (displayPrice || 0) && (
              <span className="text-lg text-gray-400 line-through">
                ₦{comparePrice.toLocaleString()}
              </span>
            )}
          </div>

          {/* Variant selector */}
          <VariantSelector
            variants={variants}
            selectedId={active?.id || null}
            onSelect={setSelectedVariant}
          />

          {/* Stock status */}
          <p
            className={`text-sm font-medium ${inStock ? "text-green-600" : "text-red-600"}`}
          >
            {inStock ? "In stock" : "Out of stock"}
          </p>

          {/* Add to cart (placeholder) */}
          <button
            disabled={!inStock}
            className="w-full rounded-lg bg-black py-3 text-sm font-semibold text-white disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {inStock ? "Add to cart" : "Sold out"}
          </button>

          {/* Description */}
          {product.description && (
            <div className="border-t border-gray-200 pt-6">
              <h2 className="mb-2 text-sm font-medium text-gray-900">
                Description
              </h2>
              <p className="text-sm leading-relaxed text-gray-600">
                {product.description}
              </p>
            </div>
          )}

          {/* Tags */}
          {product.tags && product.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {product.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
