"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { Product } from "@/lib/api/products";
import { useCart } from "@/lib/cart";
import { useLocale } from "@/lib/locale/locale-provider";
import { prefetchImage } from "@/hooks/useImagePrefetch";
import { isVariantInStock } from "@/lib/products/variants";
import { extractSizes, findVariantBySize } from "@/lib/products/variants";
import {
  colorToHex,
  extractColorsFromTags,
  findImageIndexByTag,
} from "@/lib/products/colors";

const GRID_IMAGE_QUALITY = 70;
/** Responsive grid-cell widths — 2 cols (<640px), 3 (<1024px), else 4. */
const GRID_SIZES = "(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw";
/** next/image default deviceSizes — mirror them so a prefetch picks the same width. */
const DEVICE_SIZES = [640, 750, 828, 1080, 1200, 1920, 2048, 3840];

/**
 * Estimate the width next/image will request for a grid cell on the current
 * viewport, so the prefetch warms the *same* optimised URL the swap will render
 * (desktop ≈ 750, a 2-col phone ≈ 640). Cols mirror the grid `sizes`:
 * 2 (<640px), 3 (<1024px), else 4.
 */
function gridPrefetchWidth(): number {
  if (typeof window === "undefined") return 750;
  const vw = window.innerWidth;
  const cols = vw < 640 ? 2 : vw < 1024 ? 3 : 4;
  const target = (vw / cols) * (window.devicePixelRatio || 1);
  return DEVICE_SIZES.find((s) => s >= target) ?? DEVICE_SIZES[DEVICE_SIZES.length - 1];
}


/* ── Component ───────────────────────────────────────── */

export function ProductCard({
  product,
  priority = false,
}: {
  product: Product;
  priority?: boolean;
}) {
  const images = product.product_images || [];
  const image = images[0];
  const { addItem } = useCart();
  const { formatPrice } = useLocale();
  const queryClient = useQueryClient();

  const variants = product.product_variants || [];
  const firstVariant = variants[0] ?? null;
  const price = firstVariant?.price ?? product.base_price;
  const compareAtPrice = firstVariant?.compare_at_price ?? null;
  const isOnSale = compareAtPrice != null && compareAtPrice > (price ?? 0);
  const sizes = extractSizes(variants);
  const colors = extractColorsFromTags(images);
  const hasSizes = sizes.length > 0;

  const firstColor = colors[0] ?? "";

  const inStockVariants = variants.filter(isVariantInStock);
  const allOutOfStock = variants.length > 0 && inStockVariants.length === 0;
  const hasPreorder =
    allOutOfStock &&
    variants.some(
      (v) =>
        (v.inventory_quantity <= 0 || v.available === false) &&
        v.preorder_enabled === true,
    );

  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [addingSize, setAddingSize] = useState<string | null>(null);
  const [successSize, setSuccessSize] = useState<string | null>(null);
  const [imgIndex, setImgIndex] = useState(() => findImageIndexByTag(images, firstColor));
  const [selectedColor, setSelectedColor] = useState<string>(firstColor);
  const [imgLoaded, setImgLoaded] = useState(false);
  // Liquid colour swaps: keep the settled image as a base layer and fade the
  // newly selected colour's image in over it (once it has loaded), then promote
  // it to the base — so a swap never hard-cuts or flashes a half-loaded image.
  const [displaySrc, setDisplaySrc] = useState<string | undefined>(
    () => (images[findImageIndexByTag(images, firstColor)] ?? images[0])?.src,
  );
  const [pendingSrc, setPendingSrc] = useState<string | null>(null);
  const [pendingReady, setPendingReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePrefetch = useCallback(() => {
    const key = product.handle || product.id;
    queryClient.prefetchQuery({
      queryKey: ["product", key],
      queryFn: () => apiClient(`/products/${key}`),
      staleTime: 5 * 60 * 1000,
    });
  }, [queryClient, product.handle, product.id]);

  // Warm every colour's image (small AVIFs at the width this viewport renders) so
  // a colour switch ALWAYS has its crossfade target cached — letting the dissolve
  // start immediately and play identically every time.
  const warmAllColors = useCallback(() => {
    const w = gridPrefetchWidth();
    for (const color of extractColorsFromTags(images)) {
      const src = images[findImageIndexByTag(images, color)]?.src;
      if (src) prefetchImage(src, w, GRID_IMAGE_QUALITY);
    }
  }, [images]);

  // Preload all colours as soon as the card is idle — no hover/touch required, so
  // the swap animation is identical on mobile and desktop. requestIdleCallback keeps
  // these tiny prefetches off the critical path so they never compete with the
  // visible image.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (extractColorsFromTags(images).length < 2) return;
    let idleId: number | undefined;
    let timerId: ReturnType<typeof setTimeout> | undefined;
    if (typeof window.requestIdleCallback === "function") {
      idleId = window.requestIdleCallback(() => warmAllColors(), { timeout: 2500 });
    } else {
      timerId = setTimeout(() => warmAllColors(), 1200);
    }
    return () => {
      if (idleId !== undefined) window.cancelIdleCallback(idleId);
      if (timerId !== undefined) clearTimeout(timerId);
    };
  }, [warmAllColors, images]);

  // Entering the card (desktop) gives an immediate top-up before idle fires.
  const handleCardEnter = useCallback(() => {
    handlePrefetch();
    warmAllColors();
  }, [handlePrefetch, warmAllColors]);

  const currentImage = images[imgIndex] ?? image;

  const handleMouseLeave = useCallback(() => {
    if (selectedColor) setImgIndex(findImageIndexByTag(images, selectedColor));
    else setImgIndex(0);
    if (quickAddOpen && !addingSize) {
      setQuickAddOpen(false);
      setSuccessSize(null);
    }
  }, [quickAddOpen, addingSize, selectedColor, images]);

  useEffect(() => {
    if (!quickAddOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setQuickAddOpen(false);
        setSuccessSize(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [quickAddOpen]);

  // Start a crossfade whenever the selected image changes (swatch / hover-leave).
  useEffect(() => {
    const src = currentImage?.src;
    if (!src || src === displaySrc) {
      setPendingSrc(null);
      setPendingReady(false);
      return;
    }
    setPendingSrc(src);
    setPendingReady(false);
  }, [currentImage?.src, displaySrc]);

  const handleColorSelect = useCallback(
    (colorName: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setSelectedColor(colorName);
      setImgIndex(findImageIndexByTag(images, colorName));
    },
    [images],
  );

  // Warm a colour's first image on intent (hover / focus / touch-down) so the
  // swap is instant — and at the width this viewport will actually render.
  const handleColorPrefetch = useCallback(
    (colorName: string) => {
      const src = images[findImageIndexByTag(images, colorName)]?.src;
      if (src) prefetchImage(src, gridPrefetchWidth(), GRID_IMAGE_QUALITY);
    },
    [images],
  );

  const handleAddToCart = useCallback(
    (size: string) => {
      const variant = findVariantBySize(variants, size);
      if (!variant) return;
      const inStock = isVariantInStock(variant);
      if (!inStock && !variant.preorder_enabled) return;
      const isPreorder = !inStock && variant.preorder_enabled === true;
      setAddingSize(size);
      setTimeout(() => {
        addItem({
          variantId: variant.id,
          productId: product.id,
          productTitle: product.title,
          variantTitle: size,
          price: variant.price ?? product.base_price ?? 0,
          image: image?.src ?? null,
          isPreorder,
          preorderLimit: isPreorder ? variant.preorder_limit : null,
        });
        setAddingSize(null);
        setSuccessSize(size);
        setTimeout(() => {
          setSuccessSize(null);
          setQuickAddOpen(false);
        }, 800);
      }, 500);
    },
    [product, variants, image, addItem],
  );

  return (
    <div
      ref={containerRef}
      className="group block"
      onMouseLeave={handleMouseLeave}
      onMouseEnter={handleCardEnter}
    >
      <Link href={`/product/${product.handle || product.id}${selectedColor ? `?color=${encodeURIComponent(selectedColor)}` : ""}`}>
        {/* Image container */}
        <div
          className="relative aspect-[3/4] overflow-hidden bg-gray-50 dark:bg-gray-900"
          onMouseEnter={() => images.length > 1 && setImgIndex((prev) => {
            // Only auto-swap on hover if we haven't already changed via colour
            return prev;
          })}
        >
          {currentImage && displaySrc ? (
            <>
              {!imgLoaded && (
                <div className="absolute inset-0 animate-pulse bg-gray-100 dark:bg-gray-800" />
              )}
              {/* Base layer — the settled image */}
              <Image
                src={displaySrc}
                alt={product.title}
                fill
                sizes={GRID_SIZES}
                quality={GRID_IMAGE_QUALITY}
                priority={priority}
                onLoad={() => setImgLoaded(true)}
                className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
              />
              {/* Incoming layer — fades in over the base once loaded, then promotes */}
              {pendingSrc && pendingSrc !== displaySrc && (
                <motion.div
                  key={pendingSrc}
                  className="absolute inset-0"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: pendingReady ? 1 : 0 }}
                  transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
                  onAnimationComplete={() => {
                    if (pendingReady) {
                      setDisplaySrc(pendingSrc);
                      setPendingSrc(null);
                      setPendingReady(false);
                    }
                  }}
                >
                  <Image
                    src={pendingSrc}
                    alt={currentImage.alt_text || product.title}
                    fill
                    sizes={GRID_SIZES}
                    quality={GRID_IMAGE_QUALITY}
                    onLoad={() => setPendingReady(true)}
                    className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
                  />
                </motion.div>
              )}
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-gray-400 dark:text-gray-600">
              No image
            </div>
          )}

          {/* ── Stock / Pre-order badge ──────────────── */}
          {(allOutOfStock || hasPreorder) && (
            <div className="absolute bottom-2.5 left-2.5 z-10">
              {hasPreorder ? (
                <span className="bg-black px-2 py-[3px] text-[9px] font-bold tracking-[0.16em] uppercase text-white">
                  Pre-order
                </span>
              ) : (
                <span className="bg-white/90 px-2 py-[3px] text-[9px] font-bold tracking-[0.16em] uppercase text-[#59626E]">
                  Sold Out
                </span>
              )}
            </div>
          )}

          {/* ── Full-width Quick Add bar ──────────────── */}
          {hasSizes && (
            <div
              className="absolute bottom-0 left-0 right-0 z-10"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
            >
              {!quickAddOpen ? (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setQuickAddOpen(true);
                  }}
                  className="w-full bg-white/95 py-3 text-center text-[10px] font-medium uppercase tracking-widest text-gray-900 opacity-0 transition-opacity duration-200 group-hover:opacity-100 dark:bg-black/90 dark:text-white"
                  aria-label="Quick add to cart"
                >
                  Quick Add +
                </button>
              ) : (
                <motion.div
                  key="size-row"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.2 }}
                  className="flex w-full items-center justify-center gap-0.5 bg-white/95 py-2 dark:bg-black/90"
                >
                  {sizes.map((size, i) => {
                    const variant = findVariantBySize(variants, size);
                    const inStock = !!variant && isVariantInStock(variant);
                    const canPreorder = !inStock && variant?.preorder_enabled === true;
                    const unavailable = !inStock && !canPreorder;
                    return (
                      <motion.button
                        key={size}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: i * 0.03 }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (!addingSize && successSize !== size && !unavailable) handleAddToCart(size);
                        }}
                        disabled={!!addingSize || unavailable}
                        aria-disabled={unavailable}
                        className={`flex h-7 min-w-[30px] items-center justify-center px-2 text-[10px] font-semibold uppercase tracking-widest transition-all duration-200 ${
                          unavailable
                            ? "cursor-not-allowed bg-transparent text-gray-300 line-through dark:text-gray-700"
                            : addingSize === size
                              ? "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
                              : successSize === size
                                ? "bg-black text-white dark:bg-white dark:text-black"
                                : "bg-transparent text-gray-900 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-800"
                        }`}
                      >
                        {addingSize === size ? <SpinnerIcon /> : successSize === size ? <CheckIcon /> : size}
                      </motion.button>
                    );
                  })}
                </motion.div>
              )}
            </div>
          )}
        </div>

        {/* Info: title + price + colour swatches */}
        <div className="mt-3">
          <h3 className={`text-xs font-medium uppercase tracking-wide ${allOutOfStock && !hasPreorder ? "text-gray-400 dark:text-gray-600" : "text-gray-900 dark:text-gray-100"}`}>
            {product.title}
          </h3>
          {price != null && (
            <div className="mt-1 flex items-center gap-1.5">
              <p className={`text-xs ${isOnSale ? "font-medium text-red-600 dark:text-red-400" : "text-gray-500 dark:text-gray-400"}`}>
                {formatPrice(price)}
              </p>
              {isOnSale && compareAtPrice != null && (
                <p className="text-xs text-gray-400 line-through dark:text-gray-600">
                  {formatPrice(compareAtPrice)}
                </p>
              )}
            </div>
          )}
          {colors.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {colors.map((color) => (
                <button
                  key={color}
                  title={color}
                  onClick={(e) => handleColorSelect(color, e)}
                  onMouseEnter={() => handleColorPrefetch(color)}
                  onFocus={() => handleColorPrefetch(color)}
                  onTouchStart={() => handleColorPrefetch(color)}
                  className={`h-4 w-4 rounded-full transition-transform duration-150 hover:scale-110 focus:outline-none ${
                    selectedColor.toLowerCase() === color.toLowerCase()
                      ? "ring-1 ring-gray-900 ring-offset-1 dark:ring-white"
                      : "ring-1 ring-gray-200 dark:ring-gray-700"
                  }`}
                  style={{ backgroundColor: colorToHex(color) }}
                  aria-label={color}
                />
              ))}
            </div>
          )}
        </div>
      </Link>
    </div>
  );
}

/* ── Inline SVG Icons ────────────────────────────────── */

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
