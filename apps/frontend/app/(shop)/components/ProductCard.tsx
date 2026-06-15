"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { Product, ProductImage, ProductVariant } from "@/lib/api/products";
import { useCart } from "@/lib/cart";
import { useLocale } from "@/lib/locale/locale-provider";
import { prefetchImage } from "@/hooks/useImagePrefetch";

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

/* ── Colour hex lookup ───────────────────────────────── */

const COLOR_HEX: Record<string, string> = {
  // ── Neutrals ──────────────────────────────────────────
  black:          "#111111",
  "off-black":    "#1c1c1c",
  "off black":    "#1c1c1c",
  obsidian:           "#111111",
  "black and pink":   "#111111",
  "black-and-pink":   "#111111",
  onyx:               "#353839",
  charcoal:       "#3c3c3c",
  "dark grey":    "#555555",
  "dark gray":    "#555555",
  grey:           "#909090",
  gray:           "#909090",
  "mid grey":     "#7a7a7a",
  "mid gray":     "#7a7a7a",
  "light grey":   "#c8c8c8",
  "light gray":   "#c8c8c8",
  "heather grey":  "#b0b0b0",
  "heather gray":  "#b0b0b0",
  "heather-grey":  "#b0b0b0",
  "heather-gray":  "#b0b0b0",
  silver:         "#c0c0c0",
  white:          "#f5f5f5",
  "off-white":    "#f0ede8",
  "off white":    "#f0ede8",
  ivory:          "#fffff0",
  ecru:           "#e8e0d0",
  cream:          "#f0ebe0",
  oatmeal:        "#e8ddd0",
  linen:          "#e8dcc8",

  // ── Warm neutrals ─────────────────────────────────────
  beige:          "#d4c5a9",
  sand:           "#c8b89a",
  tan:            "#c9a882",
  camel:          "#c19a6b",
  khaki:          "#c3b091",
  stone:          "#b5a898",
  taupe:          "#b5a99a",
  "warm grey":    "#a09590",
  "warm gray":    "#a09590",
  parchment:      "#f2e8d8",
  wheat:          "#dcc090",

  // ── Browns ────────────────────────────────────────────
  brown:          "#6b4226",
  "dark brown":   "#3e2010",
  chocolate:      "#4a2c17",
  espresso:       "#3a1f10",
  mocha:          "#5c3317",
  walnut:         "#5a3820",
  clay:           "#9b6b4a",
  "coffee brown": "#4a2f1a",
  "coffee-brown": "#4a2f1a",
  coffee:         "#4a2f1a",
  cognac:         "#9b4e20",
  rust:           "#b45309",
  terracotta:     "#c1440e",
  sienna:         "#a0522d",
  "burnt orange": "#cc5500",

  // ── Blues ─────────────────────────────────────────────
  navy:           "#1b2a4a",
  "dark navy":    "#0d1a30",
  "navy blue":    "#1b2a4a",
  blue:           "#1565c0",
  "cobalt blue":  "#0047ab",
  cobalt:         "#0047ab",
  "royal blue":   "#2444b0",
  "french blue":  "#0072bb",
  "powder blue":  "#b0c4de",
  "sky blue":     "#87ceeb",
  "baby blue":    "#89cff0",
  "pale blue":    "#aec6cf",
  "dusty blue":   "#6e9bb5",
  "slate blue":   "#6a7fa8",
  slate:          "#708090",
  denim:          "#1560bd",
  "washed blue":  "#4a7fa5",
  teal:           "#008080",
  "dark teal":    "#005f5f",
  turquoise:      "#40e0d0",
  "pale teal":    "#7eb8b8",

  // ── Greens ────────────────────────────────────────────
  green:          "#2e7d32",
  "dark green":   "#1a4a1a",
  "forest green": "#228b22",
  forest:         "#228b22",
  "hunter green": "#355e3b",
  hunter:         "#355e3b",
  olive:          "#6b7145",
  "olive green":  "#6b7145",
  "olive grove":  "#6b7145",
  "dark olive":   "#4a4f28",
  sage:           "#8fa880",
  "sage green":   "#8fa880",
  mint:           "#98d4c0",
  "mint green":   "#98d4c0",
  seafoam:        "#71c5a0",
  "army green":   "#4b5320",
  army:           "#4b5320",
  moss:           "#7b8b3c",
  khaki_green:    "#8a8c5a",
  pistachio:      "#93c572",
  lime:           "#a8cc52",

  // ── Reds & Pinks ──────────────────────────────────────
  red:            "#c0392b",
  "dark red":     "#8b0000",
  crimson:        "#dc143c",
  "bright red":   "#e61c1c",
  burgundy:       "#6e1423",
  wine:           "#722f37",
  bordeaux:       "#5c1a2a",
  maroon:         "#800000",
  "deep red":     "#9b1c1c",
  coral:          "#ff7f6e",
  salmon:         "#fa8072",
  "dusty rose":   "#c49a9a",
  blush:          "#de98a8",
  pink:           "#e8a0b0",
  "baby pink":    "#f4c2c2",
  "hot pink":     "#e0306a",
  fuchsia:        "#c8185f",
  mauve:          "#b07890",
  rose:           "#e8809a",

  // ── Purples ───────────────────────────────────────────
  purple:         "#6a0dad",
  "dark purple":  "#4b0082",
  violet:         "#7f00ff",
  lavender:       "#c89fd4",
  lilac:          "#c8a0d0",
  plum:           "#7a3b5a",
  mulberry:       "#7a3060",
  grape:          "#6f2da8",
  eggplant:       "#614051",

  // ── Yellows & Oranges ─────────────────────────────────
  mustard:        "#d4a017",
  "mustard yellow": "#d4a017",
  yellow:         "#f5c518",
  "pale yellow":  "#f5e6a3",
  gold:           "#cfb53b",
  amber:          "#ffbf00",
  tangerine:      "#f28500",
  orange:         "#e07820",
  "dark orange":  "#c05808",
  "burnt sienna": "#e97451",
  apricot:        "#fbceb1",
  peach:          "#ffcba4",

  // ── Patterns ──────────────────────────────────────────
  "real tree":    "#4a5235",
  realtree:       "#4a5235",
  camo:           "#4a5235",
  camouflage:     "#4a5235",

  // ── Misc fashion ──────────────────────────────────────
  "dark indigo":  "#1a1a4a",
  indigo:         "#3f3f9f",
  "washed black": "#2c2c2c",
  "faded black":  "#2c2c2c",
  "vintage black":"#2a2626",
  "washed grey":  "#9a9490",
  "washed gray":  "#9a9490",
  caramel:        "#c68642",
  latte:          "#c8a478",
  "natural":      "#e8ddd0",
  "undyed":       "#e8ddd0",
  "raw":          "#dfd5c5",
  stripe:         "#808080",
  multi:          "#808080",
};

function hashColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (Math.imul(31, h) + name.charCodeAt(i)) | 0;
  const hue = Math.abs(h) % 360;
  return `hsl(${hue}, 25%, 60%)`;
}

function colorToHex(name: string): string {
  const lc = name.toLowerCase();
  return COLOR_HEX[lc] ?? hashColor(lc);
}

/* ── Helpers ─────────────────────────────────────────── */

type OptionSlotKey = "option1_value" | "option2_value" | "option3_value";

function getSizeSlot(variants: ProductVariant[]): OptionSlotKey | null {
  const first = variants[0];
  if (!first) return null;
  if (first.option1_name?.toLowerCase() === "size") return "option1_value";
  if (first.option2_name?.toLowerCase() === "size") return "option2_value";
  if (first.option3_name?.toLowerCase() === "size") return "option3_value";
  if (first.option2_value) return "option2_value";
  if (first.option1_value) return "option1_value";
  return null;
}

function extractSizes(variants: ProductVariant[]): string[] {
  const slot = getSizeSlot(variants);
  if (!slot) return [];
  const seen = new Set<string>();
  const sizes: string[] = [];
  for (const v of variants) {
    const val = v[slot];
    if (val && !seen.has(val)) { seen.add(val); sizes.push(val); }
  }
  return sizes;
}

function findVariantBySize(variants: ProductVariant[], size: string): ProductVariant | undefined {
  const slot = getSizeSlot(variants);
  if (!slot) return undefined;
  return variants.find((v) => v[slot] === size);
}

/** Unique colors derived from image color_tags, in order of first appearance. */
function extractColorsFromTags(images: ProductImage[]): string[] {
  const seen = new Set<string>();
  const colors: string[] = [];
  for (const img of images) {
    for (const tag of img.color_tags ?? []) {
      const key = tag.toLowerCase();
      if (tag && !seen.has(key)) {
        seen.add(key);
        colors.push(tag);
      }
    }
  }
  return colors;
}

/** Index of the first image whose color_tags include colorName. */
function findImageIndexByTag(images: ProductImage[], colorName: string): number {
  if (!colorName) return 0;
  const lc = colorName.toLowerCase();
  const idx = images.findIndex((img) =>
    img.color_tags?.some((t) => t.toLowerCase() === lc),
  );
  return idx === -1 ? 0 : idx;
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

  const inStockVariants = variants.filter(
    (v) => v.inventory_quantity > 0 && v.available !== false,
  );
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
      setAddingSize(size);
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
                  {sizes.map((size, i) => (
                    <motion.button
                      key={size}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: i * 0.03 }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!addingSize && successSize !== size) handleAddToCart(size);
                      }}
                      disabled={!!addingSize}
                      className={`flex h-7 min-w-[30px] items-center justify-center px-2 text-[10px] font-semibold uppercase tracking-widest transition-all duration-200 ${
                        addingSize === size
                          ? "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
                          : successSize === size
                            ? "bg-black text-white dark:bg-white dark:text-black"
                            : "bg-transparent text-gray-900 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-800"
                      }`}
                    >
                      {addingSize === size ? <SpinnerIcon /> : successSize === size ? <CheckIcon /> : size}
                    </motion.button>
                  ))}
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
