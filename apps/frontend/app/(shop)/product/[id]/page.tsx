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
import { useSimilarProducts } from "@/lib/api/recommendations";
import { ProductCard } from "../../components/ProductCard";
import { createPreorder } from "@/lib/api/preorders";
import { getToken } from "@/lib/api/client";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

// ─── Paystack inline type ────────────────────────────────────────────────────
declare global {
  interface Window {
    PaystackPop?: {
      setup: (opts: {
        key: string;
        email: string;
        amount: number;
        currency?: string;
        ref?: string;
        metadata?: Record<string, unknown>;
        callback: (response: { reference: string }) => void;
        onClose: () => void;
      }) => { openIframe: () => void };
    };
  }
}

// ─── PreorderModal ────────────────────────────────────────────────────────────

interface PreorderModalProps {
  productTitle: string;
  variantTitle: string | null;
  variantId: string;
  price: number;
  onClose: () => void;
}

function PreorderModal({
  productTitle,
  variantTitle,
  variantId,
  price,
  onClose,
}: PreorderModalProps) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState<"idle" | "paying" | "saving" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Load Paystack script once
  useEffect(() => {
    if (document.getElementById("paystack-script")) return;
    const s = document.createElement("script");
    s.id = "paystack-script";
    s.src = "https://js.paystack.co/v1/inline.js";
    s.async = true;
    document.head.appendChild(s);
  }, []);

  const total = price * quantity;

  async function handlePay() {
    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }

    const pk = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;
    if (!pk || !window.PaystackPop) {
      setErrorMsg("Payment unavailable. Please try again.");
      setStatus("error");
      return;
    }

    // We need the customer email. Use a placeholder if not available; in
    // production, decode the JWT or fetch /auth/me.
    const email = "customer@1nri.com";

    setStatus("paying");

    window.PaystackPop.setup({
      key: pk,
      email,
      amount: Math.round(total * 100), // pesewas
      currency: "GHS",
      metadata: { variantId, quantity, productTitle },
      callback: async (response) => {
        setStatus("saving");
        try {
          await createPreorder({
            item: {
              variantId,
              productTitle,
              variantTitle: variantTitle ?? undefined,
              quantity,
              price,
            },
            paymentReference: response.reference,
          });
          setStatus("success");
        } catch {
          setErrorMsg("Payment received but we couldn't record your pre-order. Please contact support with your reference: " + response.reference);
          setStatus("error");
        }
      },
      onClose: () => {
        setStatus("idle");
      },
    }).openIframe();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 dark:bg-gray-900">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          <X className="h-5 w-5" />
        </button>

        {status === "success" ? (
          <div className="py-6 text-center">
            <div className="mb-3 text-4xl">🎉</div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Pre-order confirmed!</h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              We&apos;ll contact you as soon as stock is available.
            </p>
            <button
              onClick={() => router.push("/preorders")}
              className="mt-5 w-full rounded-lg bg-black py-2.5 text-sm font-semibold text-white dark:bg-white dark:text-black"
            >
              View my pre-orders
            </button>
          </div>
        ) : (
          <>
            <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">Pre-order</h2>

            <div className="mb-4 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
              <p className="font-medium text-gray-900 dark:text-white">{productTitle}</p>
              {variantTitle && (
                <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{variantTitle}</p>
              )}
              <p className="mt-1 text-sm font-semibold text-gray-700 dark:text-gray-300">
                GH₵{price.toLocaleString()} each
              </p>
            </div>

            {/* Quantity */}
            <div className="mb-4 flex items-center gap-3">
              <span className="text-sm text-gray-700 dark:text-gray-300">Quantity</span>
              <div className="flex items-center rounded-lg border border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="px-3 py-1.5 text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800"
                >
                  −
                </button>
                <span className="min-w-[2rem] text-center text-sm font-medium">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  className="px-3 py-1.5 text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800"
                >
                  +
                </button>
              </div>
            </div>

            {/* Total */}
            <div className="mb-5 flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-800">
              <span className="text-sm text-gray-600 dark:text-gray-400">Total</span>
              <span className="text-base font-bold text-gray-900 dark:text-white">
                GH₵{total.toLocaleString()}
              </span>
            </div>

            {status === "error" && (
              <p className="mb-3 rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-400">
                {errorMsg}
              </p>
            )}

            <button
              onClick={handlePay}
              disabled={status === "paying" || status === "saving"}
              className="w-full rounded-lg bg-black py-3 text-sm font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-black"
            >
              {status === "paying"
                ? "Opening payment…"
                : status === "saving"
                  ? "Saving pre-order…"
                  : `Pay GH₵${total.toLocaleString()}`}
            </button>

            <p className="mt-3 text-center text-xs text-gray-400 dark:text-gray-500">
              Your payment is processed securely via Paystack. Your item will be reserved once stock arrives.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

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
  const [showPreorderModal, setShowPreorderModal] = useState(false);

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

  // Similar products — use the product handle so the recommender can look it up
  const { data: similarProducts } = useSimilarProducts(product?.handle ?? "", 6);

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
  const canPreorder = !inStock && (active?.preorder_enabled ?? false);

  const variantTitle = active
    ? [active.option1_value, active.option2_value, active.option3_value]
        .filter(Boolean)
        .join(" / ") || null
    : null;

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
        <ImageGallery images={product.product_images || []} activeImageId={active?.image_id} />

        {/* Product info */}
        <div className="space-y-6">
          <div>
            {/* Merchandising badges */}
            {(product.is_new_arrival || product.is_best_seller || product.is_featured) && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {product.is_new_arrival && (
                  <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800 dark:bg-green-900/30 dark:text-green-300">
                    New Arrival
                  </span>
                )}
                {product.is_best_seller && (
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                    Best Seller
                  </span>
                )}
                {product.is_featured && (
                  <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                    Featured
                  </span>
                )}
              </div>
            )}
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
            {inStock ? "In stock" : canPreorder ? "Out of stock — pre-order available" : "Out of stock"}
          </p>

          {/* CTA */}
          {canPreorder ? (
            <button
              onClick={() => setShowPreorderModal(true)}
              className="w-full rounded-lg bg-black py-3 text-sm font-semibold text-white dark:bg-white dark:text-black"
            >
              Pre-order Now
            </button>
          ) : (
            <button
              onClick={handleAddToCart}
              disabled={!inStock}
              className="w-full rounded-lg bg-black py-3 text-sm font-semibold text-white disabled:bg-gray-300 disabled:cursor-not-allowed dark:bg-white dark:text-black dark:disabled:bg-gray-700 dark:disabled:text-gray-500"
            >
              {!inStock ? "Sold out" : added ? "Added!" : "Add to cart"}
            </button>
          )}

          {/* Description */}
          {(product.description || product.gsm) && (
            <div className="border-t border-gray-200 pt-6 dark:border-gray-700">
              <h2 className="mb-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                Description
              </h2>
              {product.description && (
                <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                  {product.description}
                </p>
              )}
              {product.gsm && (
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {product.gsm}gsm fabric
                </p>
              )}
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

      {/* You May Also Like */}
      {similarProducts && similarProducts.length > 0 && (
        <div className="mt-16 border-t border-gray-200 pt-12 dark:border-gray-700">
          <h2 className="mb-6 text-xs font-semibold uppercase tracking-widest text-gray-900 dark:text-white">
            You May Also Like
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {similarProducts.map((p) => (
              <div key={p.id} className="w-48 shrink-0">
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pre-order modal */}
      {showPreorderModal && active && displayPrice != null && (
        <PreorderModal
          productTitle={product.title}
          variantTitle={variantTitle}
          variantId={active.id}
          price={displayPrice}
          onClose={() => setShowPreorderModal(false)}
        />
      )}
    </div>
  );
}
