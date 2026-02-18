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
                  /* Plus button — sharp square */
                  <motion.button
                    key="plus-btn"
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setQuickAddOpen(true);
                    }}
                    className="flex h-9 w-9 items-center justify-center bg-white/90 text-gray-900 shadow-md backdrop-blur-sm transition-colors hover:bg-black hover:text-white dark:bg-black/80 dark:text-white dark:hover:bg-white dark:hover:text-black"
                    aria-label="Quick add to cart"
                  >
                    <PlusIcon />
                  </motion.button>
                ) : (
                  /* Size selector row — sharp edges */
                  <motion.div
                    key="size-row"
                    initial={{ width: 36, opacity: 0 }}
                    animate={{ width: "auto", opacity: 1 }}
                    exit={{ width: 36, opacity: 0 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className="flex items-center gap-0.5 overflow-hidden bg-white/95 p-1 shadow-lg backdrop-blur-md dark:bg-black/90"
                  >
                    {sizes.map((size, i) => (
                      <motion.button
                        key={size}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          duration: 0.3,
                          delay: i * 0.04,
                          ease: [0.16, 1, 0.3, 1],
                        }}

                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (!addingSize && successSize !== size) {
                            handleAddToCart(size);
                          }
                        }}
                        disabled={!!addingSize}
                        className={`flex h-7 min-w-[30px] items-center justify-center px-2 text-[10px] font-semibold uppercase tracking-widest transition-all duration-200 ${addingSize === size
                            ? "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
                            : successSize === size
                              ? "bg-black text-white dark:bg-white dark:text-black"
                              : "bg-transparent text-gray-900 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-800"
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
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square">
      <line x1="7" y1="2" x2="7" y2="12" />
      <line x1="2" y1="7" x2="12" y2="7" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg className="h-3 w-3 animate-spin" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="2" width="12" height="12" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.2" />
      <path d="M8 2h6v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter">
      <polyline points="2.5,6 5,8.5 9.5,3.5" />
    </svg>
  );
}

