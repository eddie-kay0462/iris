"use client";

import { use, useState, useMemo, useCallback, useEffect, useRef, Suspense } from "react";
import { useProduct, useProducts, type ProductVariant } from "@/lib/api/products";
import { useBundleOfferFor } from "@/lib/api/promos";
import { describeTiers } from "@/lib/bundles/tier-label";
import { useCart } from "@/lib/cart";
import { motion } from "framer-motion";
import { prefetchImage } from "@/hooks/useImagePrefetch";
import {
  findMatchingVariant,
  type OptionSlot,
} from "../../components/VariantSelector";
import { sortSizes, isVariantInStock } from "@/lib/products/variants";
import { useSimilarProducts } from "@/lib/api/recommendations";
import { addRecentlyViewed, useRecentlyViewed } from "@/lib/recently-viewed";
import { ProductCard } from "../../components/ProductCard";
import { useToggleFavourite } from "@/lib/favourites";
import { useSearchParams } from "next/navigation";
import { useLocale } from "@/lib/locale/locale-provider";
import { useImagePrefetch } from "@/hooks/useImagePrefetch";
import Image from "next/image";
import Link from "next/link";
import {
  Heart,
  ChevronLeft,
  ChevronRight,
  Truck,
  RotateCcw,
} from "lucide-react";

// ─── Option group helpers ─────────────────────────────────────────────────────
interface OptionGroup {
  name: string;
  values: string[];
  slot: 1 | 2 | 3;
}

function extractOptionGroups(variants: ProductVariant[]): OptionGroup[] {
  const groups: OptionGroup[] = [];
  const slots = [
    { nameKey: "option1_name" as const, valueKey: "option1_value" as const, slot: 1 as const },
    { nameKey: "option2_name" as const, valueKey: "option2_value" as const, slot: 2 as const },
    { nameKey: "option3_name" as const, valueKey: "option3_value" as const, slot: 3 as const },
  ];
  for (const { nameKey, valueKey, slot } of slots) {
    const name = variants[0]?.[nameKey];
    if (!name) continue;
    const seen = new Set<string>();
    const values: string[] = [];
    for (const v of variants) {
      const val = v[valueKey];
      if (val && !seen.has(val)) { seen.add(val); values.push(val); }
    }
    if (values.length > 0) {
      const isSize = name.toLowerCase() === "size";
      groups.push({ name, values: isSize ? sortSizes(values) : values, slot });
    }
  }
  return groups;
}

function isValueInStock(
  variants: ProductVariant[],
  groups: OptionGroup[],
  selected: Record<string, string>,
  targetGroup: OptionGroup,
  targetValue: string,
): boolean {
  const testSelected = { ...selected, [targetGroup.name]: targetValue };
  const matching = variants.filter((v) =>
    groups.every((g) => {
      const val = testSelected[g.name];
      if (!val) return true;
      const key =
        g.slot === 1 ? "option1_value" : g.slot === 2 ? "option2_value" : "option3_value";
      return v[key] === val;
    }),
  );
  return matching.some(isVariantInStock);
}

function isValuePreorderable(
  variants: ProductVariant[],
  groups: OptionGroup[],
  selected: Record<string, string>,
  targetGroup: OptionGroup,
  targetValue: string,
): boolean {
  const testSelected = { ...selected, [targetGroup.name]: targetValue };
  const matching = variants.filter((v) =>
    groups.every((g) => {
      const val = testSelected[g.name];
      if (!val) return true;
      const key =
        g.slot === 1 ? "option1_value" : g.slot === 2 ? "option2_value" : "option3_value";
      return v[key] === val;
    }),
  );
  return matching.some(
    (v) => (v.inventory_quantity <= 0 || v.available === false) && v.preorder_enabled === true,
  );
}

function isValueAvailable(
  variants: ProductVariant[],
  groups: OptionGroup[],
  selected: Record<string, string>,
  targetGroup: OptionGroup,
  targetValue: string,
): boolean {
  const testSelected = { ...selected, [targetGroup.name]: targetValue };
  return variants.some((v) =>
    groups.every((g) => {
      const val = testSelected[g.name];
      if (!val) return true;
      const key =
        g.slot === 1 ? "option1_value" : g.slot === 2 ? "option2_value" : "option3_value";
      return v[key] === val;
    }),
  );
}

// ─── PDPGallery ───────────────────────────────────────────────────────────────

interface GalleryImage {
  id: string;
  src: string;
  alt_text?: string | null;
  position: number;
  option1_value?: string | null;
  option2_value?: string | null;
  color_tags?: string[];
}

function PDPGallery({
  images,
  activeImageId,
  colorFilter,
}: {
  images: GalleryImage[];
  activeImageId?: string | null;
  colorFilter?: string | null;
}) {
  // Images for the selected colour. color_tags = [] means "show for all colours"
  // (shared / lifestyle shots). Fall back to the full set when nothing is tagged.
  const sorted = useMemo(() => {
    const allSorted = [...images].sort((a, b) => a.position - b.position);
    const anyTagged = allSorted.some((img) => (img.color_tags ?? []).length > 0);
    const cfLower = colorFilter?.toLowerCase();
    if (!anyTagged || !cfLower) return allSorted;
    const forColor = allSorted.filter((img) => {
      const tags = img.color_tags ?? [];
      return tags.length === 0 || tags.some((t) => t.toLowerCase() === cfLower);
    });
    // A colour with no tagged image of its own would otherwise leave the gallery
    // empty (a bare grey box that reads as a broken page) — show the full set
    // instead of nothing.
    return forColor.length > 0 ? forColor : allSorted;
  }, [images, colorFilter]);

  // Index of the variant's representative image within a set (0 when none).
  const indexOfActive = useCallback(
    (set: GalleryImage[]) => {
      if (!activeImageId) return 0;
      const i = set.findIndex((img) => img.id === activeImageId);
      return i === -1 ? 0 : i;
    },
    [activeImageId],
  );

  const [idx, setIdx] = useState(() => indexOfActive(sorted));
  const [displaySrc, setDisplaySrc] = useState(() => sorted[indexOfActive(sorted)]?.src ?? "");
  // Incoming image layered over the base while it loads.
  const [pendingSrc, setPendingSrc] = useState<string | null>(null);
  const [pendingReady, setPendingReady] = useState(false);
  // Whether the incoming image was slow enough to warrant an animated fade.
  const [shouldFade, setShouldFade] = useState(false);
  const pendingStartRef = useRef(0);
  // Guards markReady against the duplicate calls an inline ref callback makes.
  const readyForRef = useRef<string | null>(null);
  const touchStartX = useRef<number | null>(null);

  useImagePrefetch(images, colorFilter ?? "", { maxPriority: 6, width: 1080, quality: 80 });

  // Colour change → hard-cut straight to the variant's main image in the new set.
  useEffect(() => {
    const resolved = indexOfActive(sorted);
    setIdx(resolved);
    setDisplaySrc(sorted[resolved]?.src ?? "");
    setPendingSrc(null);
    setPendingReady(false);
    setShouldFade(false);
    readyForRef.current = null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colorFilter]);

  // Variant change within the same colour (e.g. a size mapped to another image).
  useEffect(() => {
    if (!activeImageId) return;
    const i = sorted.findIndex((img) => img.id === activeImageId);
    if (i !== -1) setIdx(i);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeImageId]);

  // Begin a swap whenever the active image changes. Keyed on `idx` only: `sorted`
  // is memoised and colour resets are driven by the effects above, so depending on
  // `sorted` here would spuriously fire mid-colour-switch (when `sorted` is the new
  // set but `idx` is still the old value) and crossfade to the wrong image.
  // Readiness is detected on the real incoming <Image> below (ref + onLoad), so a
  // cached image — whose load event can fire before React attaches the handler —
  // never leaves the gallery stuck on the previous picture.
  useEffect(() => {
    const target = sorted[idx]?.src;
    if (!target || target === displaySrc) return;
    pendingStartRef.current = performance.now();
    readyForRef.current = null;
    setPendingSrc(target);
    setPendingReady(false);
    setShouldFade(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  // Mark the incoming image painted. Called from both a completeness ref check
  // (covers cache hits) and onLoad (covers network loads); the ref guards against
  // the duplicate invocations an inline ref callback makes across renders.
  const markReady = useCallback((src: string) => {
    if (readyForRef.current === src) return;
    readyForRef.current = src;
    // Effectively-instant loads (warm cache) hard-cut; real loads fade in.
    setShouldFade(performance.now() - pendingStartRef.current > 80);
    setPendingReady(true);
  }, []);

  // Eagerly warm adjacent images so the next click is a cache hit.
  useEffect(() => {
    if (sorted.length <= 1) return;
    const prev = sorted[(idx - 1 + sorted.length) % sorted.length];
    const next = sorted[(idx + 1) % sorted.length];
    if (prev) prefetchImage(prev.src, 1080, 80);
    if (next) prefetchImage(next.src, 1080, 80);
  }, [idx, sorted]);

  if (sorted.length === 0) {
    return (
      <div className="aspect-[4/5] bg-fill" />
    );
  }

  return (
    <div className="grid gap-4 grid-cols-1 lg:grid-cols-[64px_1fr]">
      {/* Thumbnail strip — desktop only */}
      <div className="hidden lg:flex flex-col gap-2.5 sticky top-[90px] self-start">
        {sorted.map((img, i) => (
          <button
            key={img.id}
            onClick={() => setIdx(i)}
            className={`relative w-16 h-20 overflow-hidden border transition-all duration-200 ${
              i === idx ? "border-invert-bg opacity-100" : "border-transparent opacity-60 hover:opacity-100"
            }`}
          >
            <Image
              src={img.src}
              alt={img.alt_text || "1NRI product thumbnail"}
              fill
              sizes="64px"
              className="object-cover"
            />
          </button>
        ))}
      </div>

      {/* Main stage */}
      <div>
        <div
          className="relative aspect-[4/5] bg-fill overflow-hidden"
          onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => {
            if (touchStartX.current === null) return;
            const delta = touchStartX.current - e.changedTouches[0].clientX;
            if (Math.abs(delta) > 40) {
              setIdx(delta > 0
                ? (idx + 1) % sorted.length
                : (idx - 1 + sorted.length) % sorted.length);
            }
            touchStartX.current = null;
          }}
        >
          {/* Base layer — stays visible while the next image loads */}
          {displaySrc && (
            <Image
              src={displaySrc}
              alt={sorted[idx]?.alt_text || "Product image"}
              fill
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
              quality={80}
              className="object-cover"
            />
          )}
          {/* Incoming layer — hard-cuts when cached, fades when slow to load */}
          {pendingSrc && pendingSrc !== displaySrc && (
            <motion.div
              key={pendingSrc}
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: pendingReady ? 1 : 0 }}
              transition={shouldFade ? { duration: 0.35, ease: [0.4, 0, 0.2, 1] } : { duration: 0 }}
              onAnimationComplete={() => {
                if (pendingReady) {
                  setDisplaySrc(pendingSrc);
                  setPendingSrc(null);
                  setPendingReady(false);
                  setShouldFade(false);
                }
              }}
            >
              <Image
                src={pendingSrc}
                alt={sorted[idx]?.alt_text || "Product image"}
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                quality={80}
                ref={(el) => { if (el && el.complete && el.naturalWidth > 0) markReady(pendingSrc); }}
                onLoad={() => markReady(pendingSrc)}
                className="object-cover"
              />
            </motion.div>
          )}

          {/* Counter */}
          <div className="absolute left-4 bottom-4 bg-surface/85 backdrop-blur-[4px] px-2.5 py-1 text-[13px] font-bold text-text">
            {String(idx + 1).padStart(2, "0")} / {String(sorted.length).padStart(2, "0")}
          </div>

          {/* Navigation arrows */}
          {sorted.length > 1 && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2">
              <button
                onClick={() => setIdx((idx - 1 + sorted.length) % sorted.length)}
                className="w-9 h-9 bg-surface/85 backdrop-blur-[4px] flex items-center justify-center text-text hover:bg-invert-bg hover:text-invert-fg transition-colors duration-200"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIdx((idx + 1) % sorted.length)}
                className="w-9 h-9 bg-surface/85 backdrop-blur-[4px] flex items-center justify-center text-text hover:bg-invert-bg hover:text-invert-fg transition-colors duration-200"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Mobile dot indicators */}
        {sorted.length > 1 && (
          <div className="flex lg:hidden justify-center gap-2 mt-3">
            {sorted.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${i === idx ? "bg-invert-bg" : "bg-line-strong"}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── AccordionItem ────────────────────────────────────────────────────────────

function AccordionItem({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-line">
      <button
        onClick={onToggle}
        className="w-full py-4 flex justify-between items-center text-[12px] tracking-[0.16em] uppercase text-left"
      >
        <span dangerouslySetInnerHTML={{ __html: title }} />
        <span
          className="text-[18px] font-light transition-transform duration-200 flex-shrink-0"
          style={{ transform: open ? "rotate(45deg)" : "rotate(0deg)" }}
        >
          +
        </span>
      </button>
      {open && (
        <div className="pb-[18px] text-[13px] leading-[1.55] text-text-secondary">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type PageProps = { params: Promise<{ id: string }> };

function ProductDetailPageInner({ id, initialColor }: { id: string; initialColor: string | null }) {
  return <ProductDetailBody id={id} initialColor={initialColor} />;
}

function ProductDetailPageWrapper({ params }: PageProps) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const initialColor = searchParams.get("color");
  return <ProductDetailPageInner id={id} initialColor={initialColor} />;
}

export default function ProductDetailPage({ params }: PageProps) {
  return (
    <Suspense fallback={<ProductDetailSkeleton />}>
      <ProductDetailPageWrapper params={params} />
    </Suspense>
  );
}

function ProductDetailSkeleton() {
  return (
    <div className="bg-bg min-h-screen">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-8">
        <div className="grid gap-8 lg:gap-20 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_460px]">
          <div className="aspect-[4/5] animate-pulse bg-fill" />
          <div className="space-y-4 pt-6">
            <div className="h-3 w-1/3 animate-pulse bg-fill" />
            <div className="h-8 w-3/4 animate-pulse bg-fill" />
            <div className="h-6 w-1/4 animate-pulse bg-fill" />
            <div className="h-24 animate-pulse bg-fill" />
          </div>
        </div>
      </div>
    </div>
  );
}

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


// ─── Page ─────────────────────────────────────────────────────────────────────

function ProductDetailBody({ id, initialColor }: { id: string; initialColor: string | null }) {
  const { data: product, isLoading, error } = useProduct(id);
  const { formatPrice } = useLocale();
  const { addItem } = useCart();
  const { isFavourited, toggle: toggleFavourite } = useToggleFavourite(product?.id ?? "");
  // Only the option values the shopper has actively picked. The rest come from
  // `defaultOptions` below.
  const [pickedOptions, setPickedOptions] = useState<Record<string, string>>({});
  const [added, setAdded] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<string | null>("details");

  const variants = useMemo(
    () => product?.product_variants ?? [],
    [product?.product_variants],
  );
  const optionGroups = useMemo(() => extractOptionGroups(variants), [variants]);
  const images = useMemo(
    () => [...(product?.product_images ?? [])].sort((a, b) => a.position - b.position),
    [product?.product_images],
  );

  // Derived during render rather than assigned from an effect, so the very
  // first render that has variants already carries the right selection — no
  // second render with an empty gallery in between.
  const defaultOptions = useMemo(() => {
    const sel: Record<string, string> = {};
    if (variants.length === 0 || optionGroups.length === 0) return sel;
    const firstInStock = variants.find(isVariantInStock) ?? variants[0]!;
    for (const g of optionGroups) {
      if (g.name.toLowerCase() === "size" && g.values.length > 1) continue;
      const key = g.slot === 1 ? "option1_value" : g.slot === 2 ? "option2_value" : "option3_value";
      const isColorGroup = g.name.toLowerCase() === "color" || g.name.toLowerCase() === "colour";
      if (isColorGroup && initialColor) {
        const match = g.values.find((v) => v.toLowerCase() === initialColor.toLowerCase());
        if (match) { sel[g.name] = match; continue; }
      }
      const val = firstInStock[key];
      if (val) sel[g.name] = val;
    }
    return sel;
  }, [variants, optionGroups, initialColor]);

  const selectedOptions = useMemo(
    () => ({ ...defaultOptions, ...pickedOptions }),
    [defaultOptions, pickedOptions],
  );

  const activeVariant = useMemo(() => {
    if (variants.length === 0) return null;
    const slots = getOptionGroups(variants);
    if (slots.length === 0) return variants[0] || null;
    return findMatchingVariant(variants, selectedOptions, slots);
  }, [variants, selectedOptions]);

  const handleOptionSelect = useCallback((optionName: string, value: string) => {
    const group = optionGroups.find((g) => g.name === optionName);
    if (group && !isValueAvailable(variants, optionGroups, selectedOptions, group, value)) {
      return;
    }
    setPickedOptions((prev) => ({ ...prev, [optionName]: value }));
  }, [optionGroups, variants, selectedOptions]);

  const { data: similarProducts } = useSimilarProducts(product?.handle ?? "", 6);
  const { data: allProducts } = useProducts({ limit: 8, sort_by: "created_at", sort_order: "desc" });
  const { items: recentlyViewed } = useRecentlyViewed(product?.id);
  // Automatic bundle deal on this product, if it's the anchor of one. Must stay
  // above the early returns below — it's a hook, and a cold load renders once
  // while loading and again with data, so calling it later changes the hook
  // count between those renders and throws.
  const bundleOffer = useBundleOfferFor(product?.id);

  useEffect(() => {
    if (product) addRecentlyViewed(product);
  }, [product?.id]);

  if (isLoading) return <ProductDetailSkeleton />;

  if (error || !product) {
    return (
      <div className="bg-bg min-h-screen flex items-center justify-center">
        <p className="text-[13px] tracking-[0.14em] uppercase text-text-secondary">Product not found.</p>
      </div>
    );
  }

  const hasSizeOption = optionGroups.some((g) => g.name.toLowerCase() === "size" && g.values.length > 1);
  const sizeSelected = !hasSizeOption || !!selectedOptions[optionGroups.find((g) => g.name.toLowerCase() === "size")?.name ?? ""];
  // Resolve the active variant regardless of stock so OOS variants surface the
  // correct "Sold Out" / preorder state on the CTA. No fallback to variants[0]
  // here: an unmatched option combination (e.g. a color/size pair with no
  // variant row) must resolve to null, not a substituted unrelated variant.
  const active = sizeSelected ? activeVariant : null;
  // Price display should reflect the product's pricing even before a size is
  // picked (mirrors ProductCard, which reads from the first variant). Stock and
  // CTA state still key off `active`, so an unselected size can't be purchased.
  const priceVariant = active ?? activeVariant ?? variants[0] ?? null;
  const displayPrice = priceVariant?.price ?? product.base_price;
  const comparePrice = priceVariant?.compare_at_price ?? null;
  const inStock = active ? isVariantInStock(active) : false;
  const lowStock = active && inStock && active.inventory_quantity <= 3;
  const canPreorder = active ? (!inStock && (active.preorder_enabled ?? false)) : false;

  function handleAddToCart() {
    // Allow adding when either in stock or pre-orderable; block only genuine
    // out-of-stock (not pre-orderable) variants.
    if (!active || !product || (!inStock && !canPreorder)) return;
    const image = product.product_images?.[0]?.src ?? null;
    const variantParts = [active.option1_value, active.option2_value, active.option3_value].filter(Boolean);
    addItem({
      variantId: active.id,
      productId: product.id,
      productTitle: product.title,
      variantTitle: variantParts.length > 0 ? variantParts.join(" / ") : null,
      price: active.price ?? product.base_price ?? 0,
      image,
      isPreorder: canPreorder,
      preorderLimit: canPreorder ? active.preorder_limit : null,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <div className="bg-bg text-text min-h-screen">
      {/* Breadcrumbs */}
      <nav className="max-w-[1400px] mx-auto px-4 sm:px-8 pt-5 text-[11px] tracking-[0.14em] uppercase text-text-muted">
        <Link href="/" className="hover:text-text transition-colors">Home</Link>
        <span className="mx-2.5 text-text-placeholder">›</span>
        <Link href="/products" className="hover:text-text transition-colors">Products</Link>
        <span className="mx-2.5 text-text-placeholder">›</span>
        <span className="text-text">{product.title}</span>
      </nav>

      {/* Main PDP grid */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 pt-6 pb-16 grid gap-8 lg:gap-20 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_460px]">
        {/* Gallery */}
        <PDPGallery
          images={images}
          activeImageId={active?.image_id}
          colorFilter={optionGroups.find((g) => g.name.toLowerCase() === "color" || g.name.toLowerCase() === "colour")
            ? selectedOptions[optionGroups.find((g) => g.name.toLowerCase() === "color" || g.name.toLowerCase() === "colour")!.name] ?? null
            : null}
        />

        {/* Info column */}
        <aside className="lg:sticky lg:top-[90px] lg:self-start flex flex-col gap-[18px]">
          {/* Eyebrow */}
          {product.vendor && (
            <div className="text-[10px] tracking-[0.22em] uppercase text-text-secondary">
              {product.vendor}
            </div>
          )}

          {/* Title */}
          <h1 className="text-[28px] leading-[1.05] font-light mt-1.5">
            {product.title}
          </h1>

          {/* Price */}
          <div className="flex flex-nowrap items-center gap-3 whitespace-nowrap">
            {displayPrice != null && (
              <span className="text-[22px] font-light">{formatPrice(displayPrice)}</span>
            )}
            {comparePrice != null && comparePrice > (displayPrice || 0) && (
              <>
                <span className="text-base text-text-muted line-through">{formatPrice(comparePrice)}</span>
                <span className="text-[10px] tracking-[0.18em] uppercase px-2 py-[3px] bg-invert-bg text-invert-fg flex-shrink-0">
                  −{Math.round((1 - (displayPrice || 0) / comparePrice) * 100)}%
                </span>
              </>
            )}
          </div>

          {/* Bundle deal */}
          {bundleOffer && (
            <div className="mt-3.5 border border-line-strong px-3.5 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-invert-bg px-2 py-[3px] text-[10px] font-bold uppercase tracking-[0.18em] text-invert-fg">
                  {bundleOffer.headline}
                </span>
                <span className="text-[12px] tracking-[0.04em] text-text-secondary">
                  {bundleOffer.label}
                </span>
              </div>
              <ul className="mt-2.5 space-y-1">
                {describeTiers(bundleOffer.tiers, bundleOffer.basis).map(({ tier, rangeLabel }) => (
                  <li
                    key={tier.minPairedCount}
                    className="text-[12px] leading-relaxed text-text-secondary"
                  >
                    Add{" "}
                    <strong className="font-medium text-text">{rangeLabel}</strong>{" "}
                    &rarr;{" "}
                    <strong className="font-medium text-text">
                      {tier.valueType === "percentage"
                        ? `${tier.value}% off`
                        : `${formatPrice(tier.value)} off`}
                    </strong>{" "}
                    {bundleOffer.appliesTo === "cart" ? "your basket" : "this item"}
                  </li>
                ))}
              </ul>
              <p className="mt-2.5 text-[11px] leading-relaxed text-text-placeholder">
                Applied automatically at checkout - no code needed.
              </p>
            </div>
          )}

          {/* Stock status */}
          <div className="flex items-center gap-2.5 py-3.5 border-t border-b border-line">
            {!sizeSelected ? (
              <span className="text-[12px] tracking-[0.06em] uppercase text-text-secondary">
                Select a size to check availability
              </span>
            ) : (
              <>
                <span
                  className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: inStock ? "#9AF16E" : "#FF5454" }}
                />
                <span className="text-[12px] tracking-[0.06em] uppercase">
                  {inStock
                    ? lowStock
                      ? `Only ${active!.inventory_quantity} left`
                      : "In stock"
                    : canPreorder
                      ? "Pre-order - ships in 10-15 working days"
                      : "Out of stock"}
                </span>
              </>
            )}
          </div>

          {/* Variant options */}
          {optionGroups.map((group) => {
            const isSize = group.name.toLowerCase() === "size";
            if (isSize && group.values.length === 1) return null;
            return (
              <div key={group.name} className="flex flex-col gap-2.5">
                <div className="flex justify-between items-baseline">
                  <span className="text-[11px] tracking-[0.18em] uppercase text-text">
                    {group.name}
                  </span>
                  {selectedOptions[group.name] && (
                    <span className="text-[11px] tracking-[0.12em] uppercase text-text-secondary">
                      {selectedOptions[group.name]}
                    </span>
                  )}
                </div>
                <div
                  className={isSize ? "grid gap-1.5 grid-cols-5 sm:grid-cols-7" : "flex flex-wrap gap-2"}
                >
                  {group.values.map((val) => {
                    const isSelected = selectedOptions[group.name] === val;
                    const inStockForVal = isValueInStock(variants, optionGroups, selectedOptions, group, val);
                    const preorderableForVal = !inStockForVal && isValuePreorderable(variants, optionGroups, selectedOptions, group, val);
                    const availableForVal = isValueAvailable(variants, optionGroups, selectedOptions, group, val);
                    return (
                      <button
                        key={val}
                        onClick={() => handleOptionSelect(group.name, val)}
                        disabled={!availableForVal}
                        aria-disabled={!availableForVal}
                        className={`${isSize ? "h-11" : "h-11 px-4"} border font-light text-[13px] tracking-[0.06em] transition-all duration-[160ms] disabled:cursor-not-allowed ${
                          isSelected && inStockForVal
                            ? "bg-invert-bg text-invert-fg border-invert-bg"
                            : isSelected && preorderableForVal
                              ? "bg-invert-bg text-invert-fg border-dashed border-invert-bg"
                              : isSelected && !inStockForVal
                                ? "bg-invert-bg text-invert-fg border-invert-bg line-through opacity-60"
                                : preorderableForVal
                                  ? "border-dashed border-line-strong bg-surface text-text-secondary hover:border-invert-bg"
                                  : !inStockForVal
                                    ? "border-line bg-surface text-text-muted line-through hover:border-line-strong"
                                    : "border-line-strong bg-surface text-text hover:border-invert-bg"
                        }`}
                      >
                        {val}
                        {isSelected && preorderableForVal && (
                          <span className="block text-[9px] tracking-[0.08em] opacity-75 leading-none mt-0.5">PRE-ORDER</span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {group.values.some((val) =>
                  isValuePreorderable(variants, optionGroups, selectedOptions, group, val)
                ) && (
                  <p className="text-[11px] text-text-muted tracking-[0.06em]">
                    Dashed options are available for pre-order
                  </p>
                )}
              </div>
            );
          })}

          {/* Size guide */}
          {optionGroups.some((g) => g.name.toLowerCase() === "size") && (
            <div className="flex justify-between text-[11px] tracking-[0.12em] uppercase text-text-secondary">
              <span>Size</span>
              <span className="underline underline-offset-[3px] text-text cursor-pointer">
                Size &amp; fit guide
              </span>
            </div>
          )}

          {/* CTAs */}
          <div className="flex flex-col gap-2.5 mt-1">
            {!sizeSelected ? (
              <button
                disabled
                className="w-full h-[54px] bg-invert-bg text-invert-fg text-[13px] tracking-[0.18em] uppercase opacity-40 cursor-not-allowed"
                style={{ fontFamily: "Inter, sans-serif", fontWeight: 700 }}
              >
                Select a Size
              </button>
            ) : canPreorder ? (
              <button
                onClick={handleAddToCart}
                className="w-full h-[54px] bg-invert-bg text-invert-fg text-[13px] tracking-[0.18em] uppercase transition-transform duration-[140ms] active:scale-[0.99]"
                style={{ fontFamily: "Inter, sans-serif", fontWeight: 700 }}
              >
                {added ? "Added to Cart" : "Pre-order - Add to Cart"}
              </button>
            ) : (
              <button
                onClick={handleAddToCart}
                disabled={!inStock}
                className="w-full h-[54px] bg-invert-bg text-invert-fg text-[13px] tracking-[0.18em] uppercase disabled:opacity-40 disabled:cursor-not-allowed transition-transform duration-[140ms] active:scale-[0.99]"
                style={{ fontFamily: "Inter, sans-serif", fontWeight: 700 }}
              >
                {!inStock
                  ? "Sold Out"
                  : added
                    ? "Added to Cart"
                    : displayPrice != null
                      ? `Add to Cart - ${formatPrice(displayPrice)}`
                      : "Add to Cart"}
              </button>
            )}

            <button
              onClick={toggleFavourite}
              className="w-full h-[46px] bg-transparent text-text border border-invert-bg flex items-center justify-center gap-2.5 text-[12px] tracking-[0.16em] uppercase hover:bg-invert-bg hover:text-invert-fg transition-colors duration-[140ms]"
              style={{ fontFamily: "Inter, sans-serif", fontWeight: 700 }}
            >
              <Heart
                className="w-[18px] h-[18px]"
                strokeWidth={1.5}
                fill={isFavourited ? "currentColor" : "none"}
              />
              {isFavourited ? "Saved" : "Save to Favourites"}
            </button>
          </div>

          {/* Model note */}
          <p className="text-xs text-text-muted italic leading-[1.4] mt-1">
            For an oversized fit, size up one size.
          </p>

          {/* Accordion */}
          <div className="border-t border-line">
            {(product.description || product.gsm) && (
              <AccordionItem
                title="Product details"
                open={openAccordion === "details"}
                onToggle={() => setOpenAccordion(openAccordion === "details" ? null : "details")}
              >
                {product.description && <p>{product.description}</p>}
                {product.gsm && <p className="mt-2">{product.gsm} GSM fabric</p>}
                {product.tags && product.tags.length > 0 && (
                  <ul className="mt-2 list-disc ml-4 space-y-1">
                    {product.tags.map((tag) => <li key={tag}>{tag}</li>)}
                  </ul>
                )}
              </AccordionItem>
            )}
            <AccordionItem
              title="Shipping &amp; returns"
              open={openAccordion === "shipping"}
              onToggle={() => setOpenAccordion(openAccordion === "shipping" ? null : "shipping")}
            >
              <p>
                {/* Free standard shipping on orders over GH₵500.  */}
                Accra &amp; Tema delivery in 1-5
                business days; rest of Ghana 3-5 days; international 7-14 days via DHL. 30-day
                returns on unworn, tagged items.
              </p>
            </AccordionItem>
          </div>

          {/* Delivery bar */}
          <div className="flex gap-6 py-3.5 text-[11px] tracking-[0.14em] uppercase text-text-secondary">
            <div className="flex items-center gap-2">
              <Truck className="w-3.5 h-3.5" strokeWidth={1.5} />
              Express to Accra
            </div>
            <div className="flex items-center gap-2">
              <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.5} />
              30-day returns
            </div>
          </div>
        </aside>
      </div>

      {/* You May Also Like */}
      {(() => {
        const recs =
          similarProducts && similarProducts.length > 0
            ? similarProducts
            : (allProducts?.data ?? []).filter((p) => p.id !== product.id);
        if (recs.length === 0) return null;
        const shown = recs.slice(0, 5);
        return (
          <section className="max-w-[1400px] mx-auto px-4 sm:px-8 py-14 border-t border-line">
            <div className="flex justify-between items-baseline mb-7">
              <h2 className="text-[14px] tracking-[0.22em] uppercase font-medium">
                You May Also Like
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
              {shown.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        );
      })()}

      {/* Recently Viewed */}
      {recentlyViewed.length > 0 && (
        <section className="max-w-[1400px] mx-auto px-4 sm:px-8 py-14 border-t border-line">
          <div className="flex justify-between items-baseline mb-7">
            <h2 className="text-[14px] tracking-[0.22em] uppercase font-medium">
              Recently Viewed
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
            {recentlyViewed.slice(0, 5).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
