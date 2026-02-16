"use client";

import { use, useState, useMemo, useCallback, useEffect } from "react";
import { useProduct, type ProductVariant } from "@/lib/api/products";
import { useCart } from "@/lib/cart";
import { ImageGallery } from "../../components/ImageGallery";
import {
  VariantSelector,
  findMatchingVariant,
  type OptionSlot,
} from "../../components/VariantSelector";

type PageProps = {
  params: Promise<{ id: string }>;
};

/** Extract option groups (same logic as VariantSelector) to find the initial variant */
function getOptionGroups(variants: ProductVariant[]) {
  const slots = [
    { nameKey: "option1_name", valueKey: "option1_value", slot: 1 },
    { nameKey: "option2_name", valueKey: "option2_value", slot: 2 },
    { nameKey: "option3_name", valueKey: "option3_value", slot: 3 },
  ] as const;

  const groups: OptionSlot[] = [];
  for (const { nameKey, slot } of slots) {
    const name = variants[0]?.[nameKey];
    if (name) groups.push({ name, slot });
  }
  return groups;
}

/** Build initial selected options from a variant */
function selectedFromVariant(
  variant: ProductVariant,
  groups: OptionSlot[],
): Record<string, string> {
  const sel: Record<string, string> = {};
  for (const g of groups) {
    const key =
      g.slot === 1
        ? "option1_value"
        : g.slot === 2
          ? "option2_value"
          : "option3_value";
    const val = variant[key];
    if (val) sel[g.name] = val;
  }
  return sel;
}

export default function ProductDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const { data: product, isLoading, error } = useProduct(id);
  const { addItem } = useCart();
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [initialized, setInitialized] = useState(false);
  const [added, setAdded] = useState(false);

  const variants = product?.product_variants || [];

  // Auto-select first in-stock variant on load
  useEffect(() => {
    if (initialized || variants.length === 0) return;
    const groups = getOptionGroups(variants);
    if (groups.length === 0) {
      setInitialized(true);
      return;
    }
    // Prefer first in-stock variant, fall back to first variant
    const firstInStock = variants.find((v) => v.inventory_quantity > 0) || variants[0];
    setSelectedOptions(selectedFromVariant(firstInStock, groups));
    setInitialized(true);
  }, [variants, initialized]);

  // Resolve the active variant from selected options
  const activeVariant = useMemo(() => {
    if (variants.length === 0) return null;
    const groups = getOptionGroups(variants);
    if (groups.length === 0) return variants[0] || null;
    return findMatchingVariant(variants, selectedOptions, groups);
  }, [variants, selectedOptions]);

  const handleOptionSelect = useCallback(
    (optionName: string, value: string) => {
      setSelectedOptions((prev) => ({ ...prev, [optionName]: value }));
    },
    [],
  );

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <div className="aspect-square animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
          <div className="space-y-4">
            <div className="h-8 w-3/4 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            <div className="h-6 w-1/4 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            <div className="h-24 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <p className="text-center text-gray-500 dark:text-gray-400">Product not found.</p>
      </div>
    );
  }

  const active = activeVariant || variants[0] || null;
  const displayPrice = active?.price ?? product.base_price;
  const comparePrice = active?.compare_at_price ?? null;
  const inStock = active ? active.inventory_quantity > 0 : true;

  function handleAddToCart() {
    if (!active || !inStock || !product) return;
    const image = product.product_images?.[0]?.src ?? null;
    const variantParts = [
      active.option1_value,
      active.option2_value,
      active.option3_value,
    ].filter(Boolean);

    addItem({
      variantId: active.id,
      productId: product.id,
      productTitle: product.title,
      variantTitle: variantParts.length > 0 ? variantParts.join(" / ") : null,
      price: active.price ?? product.base_price ?? 0,
      image,
    });

    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Breadcrumbs */}
      <nav className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        <a href="/products" className="hover:text-gray-700 dark:hover:text-gray-200">
          Products
        </a>
        <span className="mx-2">/</span>
        <span className="text-gray-900 dark:text-white">{product.title}</span>
      </nav>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Images */}
        <ImageGallery images={product.product_images || []} />

        {/* Product info */}
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {product.title}
            </h1>
            {product.vendor && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{product.vendor}</p>
            )}
          </div>

          <div className="flex items-baseline gap-3">
            {displayPrice != null && (
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                GH₵{displayPrice.toLocaleString()}
              </span>
            )}
            {comparePrice != null && comparePrice > (displayPrice || 0) && (
              <span className="text-lg text-gray-400 line-through dark:text-gray-500">
                GH₵{comparePrice.toLocaleString()}
              </span>
            )}
          </div>

          {/* Variant selector */}
          <VariantSelector
            variants={variants}
            selected={selectedOptions}
            onSelect={handleOptionSelect}
          />

          {/* Stock status */}
          <p
            className={`text-sm font-medium ${inStock ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
          >
            {inStock ? "In stock" : "Out of stock"}
          </p>

          {/* Add to cart */}
          <button
            onClick={handleAddToCart}
            disabled={!inStock}
            className="w-full rounded-lg bg-black py-3 text-sm font-semibold text-white disabled:bg-gray-300 disabled:cursor-not-allowed dark:bg-white dark:text-black dark:disabled:bg-gray-700 dark:disabled:text-gray-500"
          >
            {!inStock ? "Sold out" : added ? "Added!" : "Add to cart"}
          </button>

          {/* Description */}
          {product.description && (
            <div className="border-t border-gray-200 pt-6 dark:border-gray-700">
              <h2 className="mb-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                Description
              </h2>
              <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
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
                  className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400"
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
