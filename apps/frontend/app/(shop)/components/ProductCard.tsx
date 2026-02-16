"use client";

import Link from "next/link";
import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Product, ProductVariant } from "@/lib/api/products";
import { useCart } from "@/lib/cart";

/* ── Helpers ─────────────────────────────────────────── */

/** Detect which option slot holds "Size" (falls back to option2, then option1) */
type OptionSlotKey = "option1_value" | "option2_value" | "option3_value";

function getSizeSlot(variants: ProductVariant[]): OptionSlotKey | null {
  const first = variants[0];
  if (!first) return null;

  // Check each slot's name for "Size" (case-insensitive)
  if (first.option1_name?.toLowerCase() === "size") return "option1_value";
  if (first.option2_name?.toLowerCase() === "size") return "option2_value";
  if (first.option3_name?.toLowerCase() === "size") return "option3_value";

  // Fallback: prefer option2 if it exists, otherwise option1
  if (first.option2_value) return "option2_value";
  if (first.option1_value) return "option1_value";
  return null;
}

/** Extract unique size values from the detected size slot */
function extractSizes(variants: ProductVariant[]): string[] {
  const slot = getSizeSlot(variants);
  if (!slot) return [];

  const seen = new Set<string>();
  const sizes: string[] = [];
  for (const v of variants) {
    const val = v[slot];
    if (val && !seen.has(val)) {
      seen.add(val);
      sizes.push(val);
    }
  }
  return sizes;
}

/** Find the first variant matching a given size value */
function findVariantBySize(
  variants: ProductVariant[],
  size: string,
): ProductVariant | undefined {
  const slot = getSizeSlot(variants);
  if (!slot) return undefined;
  return variants.find((v) => v[slot] === size);
}

/* ── Component ───────────────────────────────────────── */

export function ProductCard({ product }: { product: Product }) {
  const image = product.product_images?.[0];
  const price = product.base_price;
  const { addItem } = useCart();

  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [addingSize, setAddingSize] = useState<string | null>(null);
  const [successSize, setSuccessSize] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const sizes = extractSizes(product.product_variants || []);
  const hasSizes = sizes.length > 0;

  /* Close overlay on mouse leave */
  const handleMouseLeave = useCallback(() => {
    if (quickAddOpen && !addingSize) {
      setQuickAddOpen(false);
      setSuccessSize(null);
    }
  }, [quickAddOpen, addingSize]);

  /* Close overlay on outside click */
  useEffect(() => {
    if (!quickAddOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setQuickAddOpen(false);
        setSuccessSize(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [quickAddOpen]);

  /* Add to cart handler */
  const handleAddToCart = useCallback(
    (size: string) => {
      const variant = findVariantBySize(product.product_variants || [], size);
      if (!variant) return;

      setAddingSize(size);

      // Simulate a brief delay for UX
      setTimeout(() => {
        addItem({
          variantId: variant.id,
          productId: product.id,
          productTitle: product.title,
          variantTitle: size,
          price: variant.price ?? product.base_price ?? 0,
          image: image?.src ?? null,
        });

        setAddingSize(null);
        setSuccessSize(size);

        // Revert to closed after showing success
        setTimeout(() => {
          setSuccessSize(null);
          setQuickAddOpen(false);
        }, 800);
      }, 500);
    },
    [product, image, addItem],
  );

  return (
    <div
      ref={containerRef}
      className="group block"
      onMouseLeave={handleMouseLeave}
    >
      <Link href={`/product/${product.handle || product.id}`}>
        {/* Image container */}
        <div className="relative aspect-[3/4] overflow-hidden bg-gray-50 dark:bg-gray-900">
          {image ? (
            <img
              src={image.src}
              alt={image.alt_text || product.title}
              className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-gray-400 dark:text-gray-600">
              No image
            </div>
          )}

          {/* ── Quick Add Overlay ─────────────────────── */}
          {hasSizes && (
            <div
              className="absolute bottom-3 right-3 z-10"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <AnimatePresence mode="wait">
                {!quickAddOpen ? (
                  /* Plus button */
                  <motion.button
                    key="plus-btn"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setQuickAddOpen(true);
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-gray-900 shadow-md backdrop-blur-sm transition-colors hover:bg-black hover:text-white dark:bg-black/80 dark:text-white dark:hover:bg-white dark:hover:text-black"
                    aria-label="Quick add to cart"
                  >
                    <PlusIcon />
                  </motion.button>
                ) : (
                  /* Size selector row */
                  <motion.div
                    key="size-row"
                    initial={{ width: 36, opacity: 0.8 }}
                    animate={{ width: "auto", opacity: 1 }}
                    exit={{ width: 36, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className="flex items-center gap-1 overflow-hidden rounded-full bg-white/95 px-1.5 py-1 shadow-lg backdrop-blur-sm dark:bg-black/90"
                  >
                    {sizes.map((size) => (
                      <motion.button
                        key={size}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (!addingSize && successSize !== size) {
                            handleAddToCart(size);
                          }
                        }}
                        disabled={!!addingSize}
                        className={`flex h-7 min-w-[28px] items-center justify-center rounded-full px-2 text-[10px] font-semibold uppercase tracking-wide transition-all ${addingSize === size
                          ? "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                          : successSize === size
                            ? "bg-green-500 text-white"
                            : "bg-transparent text-gray-800 hover:bg-black hover:text-white dark:text-gray-200 dark:hover:bg-white dark:hover:text-black"
                          }`}
                      >
                        {addingSize === size ? (
                          <SpinnerIcon />
                        ) : successSize === size ? (
                          <CheckIcon />
                        ) : (
                          size
                        )}
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Title + Price — untouched */}
        <div className="mt-3">
          <h3 className="text-xs font-medium uppercase tracking-wide text-gray-900 dark:text-gray-100">
            {product.title}
          </h3>
          {price != null && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              GH₵{price.toLocaleString()}
            </p>
          )}
        </div>
      </Link>
    </div>
  );
}

/* ── Inline SVG Icons ────────────────────────────────── */

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="8" y1="3" x2="8" y2="13" />
      <line x1="3" y1="8" x2="13" y2="8" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3" />
      <path d="M8 2a6 6 0 0 1 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3,7 6,10 11,4" />
    </svg>
  );
}
