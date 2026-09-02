"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Minus, Plus, X, Check, ShoppingBag, Loader2 } from "lucide-react";
import { useCart } from "@/lib/cart";
import { useLocale } from "@/lib/locale/locale-provider";
import { usePersonalisedProducts } from "@/lib/api/recommendations";
import { apiClient } from "@/lib/api/client";
import { extractSizes, filterVariantsByColor, findVariantByColorAndSize } from "@/lib/products/variants";
import {
  colorToHex,
  extractColorsFromTags,
  findImageIndexByTag,
} from "@/lib/products/colors";
import { prefetchRawImage } from "@/hooks/useImagePrefetch";
import VolumeNudge from "./VolumeNudge";
import type { Product, ProductVariant, PaginatedResponse } from "@/lib/api/products";

/**
 * First in-stock variant for a given color, falling back to the first
 * preorderable one. Scoping to `color` keeps a "+" quick-add from silently
 * substituting a different color's variant when the shown swatch is out of
 * stock for the one actually selected.
 */
function defaultVariant(product: Product, color?: string): ProductVariant | null {
  const variants = filterVariantsByColor(product.product_variants ?? [], color);
  const inStock = variants.find(
    (v) => v.inventory_quantity > 0 && v.available !== false,
  );
  if (inStock) return inStock;
  const preorder = variants.find((v) => v.preorder_enabled === true);
  return preorder ?? variants[0] ?? null;
}

function variantLabel(v: ProductVariant): string | null {
  return v.option1_value ?? v.option2_value ?? v.option3_value ?? null;
}

export default function CartDrawer() {
  const {
    items,
    subtotal,
    itemCount,
    drawerOpen,
    closeDrawer,
    removeItem,
    updateQuantity,
  } = useCart();
  const { formatPrice } = useLocale();

  // Lock body scroll + escape-to-close while open.
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeDrawer();
    }
    if (drawerOpen) window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [drawerOpen, closeDrawer]);

  return (
    <>
      {/* Scrim */}
      <div
        onClick={closeDrawer}
        aria-hidden
        className={`fixed inset-0 z-[80] bg-scrim transition-opacity duration-300 ${
          drawerOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Panel */}
      <aside
        aria-hidden={!drawerOpen}
        aria-label="Shopping bag"
        className={`fixed inset-y-0 right-0 z-[90] flex w-[92vw] max-w-[420px] flex-col bg-bg transition-transform duration-300 ease-out ${
          drawerOpen
            ? "translate-x-0 shadow-[-20px_0_60px_rgba(0,0,0,0.16)]"
            : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="shrink-0 border-b border-line px-5 pb-4 pt-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-[15px] font-semibold tracking-tight text-text">
                Your Bag{" "}
                <span className="text-text-muted">
                  ({itemCount})
                </span>
              </h2>
            </div>
            <button
              onClick={closeDrawer}
              aria-label="Close bag"
              className="-mr-2 -mt-1 flex h-9 w-9 items-center justify-center text-text transition-colors duration-200 hover:bg-surface-subtle"
            >
              <X className="h-5 w-5" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Body */}
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <ShoppingBag
              className="h-8 w-8 text-text-placeholder"
              strokeWidth={1.25}
            />
            <p className="mt-4 text-[14px] font-medium text-text">
              Your bag is empty
            </p>
            <p className="mt-1 text-[12px] text-text-muted">
              Add something you love to get started.
            </p>
            <Link
              href="/products"
              onClick={closeDrawer}
              className="mt-6 inline-block bg-invert-bg px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-invert-fg"
            >
              Start shopping
            </Link>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {/* Line items */}
            <ul className="divide-y divide-line-subtle px-5">
              {items.map((item) => (
                <li key={item.variantId} className="flex gap-3.5 py-4">
                  <Link
                    href={`/product/${item.productId}`}
                    onClick={closeDrawer}
                    className="shrink-0"
                  >
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.image}
                        alt={item.productTitle}
                        className="h-[88px] w-[70px] object-cover"
                      />
                    ) : (
                      <div className="flex h-[88px] w-[70px] items-center justify-center bg-fill text-[9px] text-text-placeholder">
                        No image
                      </div>
                    )}
                  </Link>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/product/${item.productId}`}
                        onClick={closeDrawer}
                        className="text-[12px] font-medium uppercase leading-snug tracking-wide text-text hover:underline"
                      >
                        {item.productTitle}
                      </Link>
                      <span className="shrink-0 text-[12px] font-medium text-text">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>

                    {item.variantTitle && (
                      <p className="mt-0.5 text-[11px] text-text-muted">
                        {item.variantTitle}
                      </p>
                    )}

                    {item.isPreorder && (
                      <span className="mt-1 inline-flex w-fit items-center gap-1 border border-invert-bg px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-text">
                        Pre-order · ships in 10-15 working days
                      </span>
                    )}

                    <div className="mt-auto flex items-center justify-between pt-3">
                      {/* Quantity stepper */}
                      <div className="flex items-center border border-line">
                        <button
                          onClick={() =>
                            updateQuantity(item.variantId, item.quantity - 1)
                          }
                          aria-label="Decrease quantity"
                          className="flex h-7 w-7 items-center justify-center text-text-secondary transition-colors hover:bg-surface-subtle hover:text-text"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-7 text-center text-[12px] font-medium text-text">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateQuantity(item.variantId, item.quantity + 1)
                          }
                          aria-label="Increase quantity"
                          className="flex h-7 w-7 items-center justify-center text-text-secondary transition-colors hover:bg-surface-subtle hover:text-text"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      <button
                        onClick={() => removeItem(item.variantId)}
                        className="text-[11px] uppercase tracking-[0.12em] text-text-muted underline-offset-4 transition-colors hover:text-text hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <RecommendationsStrip />
          </div>
        )}

        {/* Footer — sticky checkout */}
        {items.length > 0 && (
          <div className="shrink-0 border-t border-line px-5 pb-5 pt-4">
            <VolumeNudge className="mb-3 text-[11px] uppercase tracking-[0.14em] text-text-secondary" />
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary">
                Subtotal
              </span>
              <span className="text-[15px] font-semibold text-text">
                {formatPrice(subtotal)}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-text-muted">
              Shipping &amp; taxes calculated at checkout.
            </p>

            <Link
              href="/checkout"
              onClick={closeDrawer}
              className="mt-4 flex w-full items-center justify-center gap-2 bg-invert-bg py-3.5 text-[12px] font-semibold uppercase tracking-[0.16em] text-invert-fg transition-opacity hover:opacity-90"
            >
              Checkout · {formatPrice(subtotal)}
            </Link>
            <button
              onClick={closeDrawer}
              className="mt-2.5 w-full text-center text-[11px] uppercase tracking-[0.14em] text-text-muted transition-colors hover:text-text"
            >
              Continue shopping
            </button>
          </div>
        )}
      </aside>
    </>
  );
}

/* ── "You might also like" — recommendations with quick-add ─────────── */

function RecommendationsStrip() {
  const { data, isLoading } = usePersonalisedProducts(8);
  const { items } = useCart();

  const personalised = data ?? [];
  const recsEmpty = !isLoading && personalised.length === 0;

  // Fallback: if the recommender is offline (or has nothing for this user/guest),
  // show a few catalogue products so the cross-sell strip still appears. Only
  // fetched once we know the personalised list came back empty.
  const { data: fallback, isLoading: fallbackLoading } = useQuery({
    queryKey: ["cart-drawer-fallback-products"],
    queryFn: () =>
      apiClient<PaginatedResponse<Product>>("/products?limit=12").catch(
        () => ({ data: [], total: 0, page: 1, limit: 12, totalPages: 0 }),
      ),
    enabled: recsEmpty,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  // Hide anything already in the bag so we never suggest a duplicate.
  const inCart = new Set(items.map((i) => i.productId));
  const source =
    personalised.length > 0 ? personalised : fallback?.data ?? [];
  const recs = source.filter((p) => !inCart.has(p.id)).slice(0, 8);

  if (isLoading || (recsEmpty && fallbackLoading)) {
    return (
      <div className="mt-2 border-t border-line-subtle px-5 py-4">
        <div className="mb-3 h-3 w-32 animate-pulse rounded bg-fill" />
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="w-[112px] shrink-0">
              <div className="aspect-[3/4] animate-pulse bg-fill" />
              <div className="mt-2 h-2.5 w-3/4 animate-pulse rounded bg-fill" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (recs.length === 0) return null;

  return (
    <div className="mt-2 border-t border-line-subtle px-5 py-4">
      <h3 className="mb-3 inline-block border-b-2 border-invert-bg pb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-text">
        Others Also Bought
      </h3>
      <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {recs.map((product) => (
          <RecCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}

function RecCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const { formatPrice } = useLocale();

  const variants = product.product_variants ?? [];
  const images = product.product_images ?? [];
  const sizes = extractSizes(variants);
  const hasSizes = sizes.length > 0;
  const colors = extractColorsFromTags(images);

  // Mirrors ProductCard's quick-add flow: pick a size, brief spinner, then ✓.
  const [pickerOpen, setPickerOpen] = useState(false);
  const [addingSize, setAddingSize] = useState<string | null>(null);
  const [successSize, setSuccessSize] = useState<string | null>(null);
  const [addedFlash, setAddedFlash] = useState(false);
  // Colour swatches swap the previewed image, just like on the shop page.
  const [selectedColor, setSelectedColor] = useState(colors[0] ?? "");
  const [imgIndex, setImgIndex] = useState(() =>
    findImageIndexByTag(images, colors[0] ?? ""),
  );

  const fallback = defaultVariant(product, selectedColor);

  const price = fallback?.price ?? product.base_price ?? 0;
  const compareAt = fallback?.compare_at_price ?? null;
  const isOnSale = compareAt != null && compareAt > price;

  const inStockVariants = variants.filter(
    (v) => v.inventory_quantity > 0 && v.available !== false,
  );
  const allOutOfStock = variants.length > 0 && inStockVariants.length === 0;
  const hasPreorder =
    allOutOfStock && variants.some((v) => v.preorder_enabled === true);
  const soldOut = (allOutOfStock && !hasPreorder) || !fallback;

  const image = images[imgIndex]?.src ?? images[0]?.src ?? null;

  function add(variant: ProductVariant, sizeLabel: string | null) {
    const isPreorder =
      !(variant.inventory_quantity > 0 && variant.available !== false) &&
      variant.preorder_enabled === true;
    addItem({
      variantId: variant.id,
      productId: product.id,
      productTitle: product.title,
      variantTitle: [selectedColor || null, sizeLabel ?? variantLabel(variant)]
        .filter(Boolean)
        .join(" / ") || null,
      price: variant.price ?? product.base_price ?? 0,
      image,
      isPreorder,
      preorderLimit: isPreorder ? variant.preorder_limit : null,
    });
  }

  function handlePickSize(size: string) {
    // Match on the selected color too — a size shared by another color must
    // never resolve to that other color's variant.
    const variant = findVariantByColorAndSize(variants, selectedColor, size);
    if (!variant) return;
    const inStock =
      variant.inventory_quantity > 0 && variant.available !== false;
    if (!inStock && !variant.preorder_enabled) return;
    setAddingSize(size);
    setTimeout(() => {
      add(variant, size);
      setAddingSize(null);
      setSuccessSize(size);
      setTimeout(() => {
        setSuccessSize(null);
        setPickerOpen(false);
      }, 800);
    }, 400);
  }

  function handlePlus(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (soldOut) return;
    // Sizeable products open the size picker; single-variant ones add directly.
    if (hasSizes) {
      setPickerOpen((o) => !o);
    } else if (fallback) {
      add(fallback, null);
      setAddedFlash(true);
      setTimeout(() => setAddedFlash(false), 1400);
    }
  }

  // Warm a colour's image on intent (hover / focus / touch-down) so selecting
  // that swatch swaps instantly instead of waiting on a fresh network load.
  function prefetchColor(color: string) {
    const src = images[findImageIndexByTag(images, color)]?.src;
    if (src) prefetchRawImage(src);
  }

  return (
    <div
      className="w-[112px] shrink-0"
      onMouseLeave={() => !addingSize && setPickerOpen(false)}
    >
      <Link href={`/product/${product.handle || product.id}`}>
        <div className="relative aspect-[3/4] overflow-hidden bg-fill">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt={product.title}
              className="h-full w-full object-cover object-top"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-[9px] text-text-placeholder">
              No image
            </div>
          )}

          {/* Sale badge */}
          {isOnSale && (
            <span className="absolute left-1.5 top-1.5 bg-surface/95 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] text-text">
              Sale
            </span>
          )}

          {/* Size picker — slides over the bottom of the image */}
          {hasSizes && pickerOpen && (
            <div
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              className="absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-center gap-0.5 bg-surface/95 p-1.5"
            >
              {sizes.map((size) => {
                const v = findVariantByColorAndSize(variants, selectedColor, size);
                const inStock =
                  !!v && v.inventory_quantity > 0 && v.available !== false;
                const canPreorder = !inStock && v?.preorder_enabled === true;
                const unavailable = !inStock && !canPreorder;
                return (
                  <button
                    key={size}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!addingSize && successSize !== size && !unavailable)
                        handlePickSize(size);
                    }}
                    disabled={!!addingSize || unavailable}
                    aria-disabled={unavailable}
                    className={`flex h-6 min-w-[22px] items-center justify-center px-1 text-[9px] font-semibold uppercase tracking-wide transition-colors duration-150 ${
                      unavailable
                        ? "cursor-not-allowed text-text-placeholder line-through"
                        : addingSize === size
                          ? "bg-fill text-text-muted"
                          : successSize === size
                            ? "bg-invert-bg text-invert-fg"
                            : "text-text hover:bg-fill"
                    }`}
                  >
                    {addingSize === size ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : successSize === size ? (
                      <Check className="h-3 w-3" strokeWidth={2.2} />
                    ) : (
                      size
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Quick-add button (hidden while the size picker is open) */}
          {!(hasSizes && pickerOpen) && (
            <button
              onClick={handlePlus}
              disabled={soldOut}
              aria-label={
                soldOut
                  ? "Sold out"
                  : hasSizes
                    ? `Choose a size for ${product.title}`
                    : `Quick add ${product.title}`
              }
              className={`absolute bottom-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-full shadow-sm transition-all duration-200 ${
                soldOut
                  ? "cursor-not-allowed bg-surface/70 text-text-placeholder"
                  : addedFlash
                    ? "bg-invert-bg text-invert-fg"
                    : "bg-surface text-text hover:bg-invert-bg hover:text-invert-fg"
              }`}
            >
              {addedFlash ? (
                <Check className="h-3.5 w-3.5" strokeWidth={2.2} />
              ) : (
                <Plus className="h-3.5 w-3.5" strokeWidth={2} />
              )}
            </button>
          )}
        </div>
      </Link>

      <Link href={`/product/${product.handle || product.id}`}>
        <p className="mt-2 truncate text-[10px] font-medium uppercase tracking-wide text-text">
          {product.title}
        </p>
      </Link>
      <div className="mt-0.5 flex items-center gap-1.5">
        <span
          className={`text-[10px] ${
            isOnSale
              ? "font-medium text-sale"
              : "text-text-muted"
          }`}
        >
          {formatPrice(price)}
        </span>
        {isOnSale && compareAt != null && (
          <span className="text-[10px] text-text-placeholder line-through">
            {formatPrice(compareAt)}
          </span>
        )}
      </div>

      {/* Colour swatches — swap the previewed image, like the shop page */}
      {colors.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {colors.map((color) => (
            <button
              key={color}
              title={color}
              aria-label={color}
              onMouseEnter={() => prefetchColor(color)}
              onFocus={() => prefetchColor(color)}
              onTouchStart={() => prefetchColor(color)}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setSelectedColor(color);
                setImgIndex(findImageIndexByTag(images, color));
              }}
              className={`h-3.5 w-3.5 rounded-full transition-transform duration-150 hover:scale-110 focus:outline-none ${
                selectedColor.toLowerCase() === color.toLowerCase()
                  ? "ring-1 ring-invert-bg ring-offset-1"
                  : "ring-1 ring-line"
              }`}
              style={{ backgroundColor: colorToHex(color) }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
