"use client";

import { use, useState, useMemo, useCallback, useEffect, Suspense } from "react";
import { useProduct, useProducts, type ProductVariant } from "@/lib/api/products";
import { useCart } from "@/lib/cart";
import {
  findMatchingVariant,
  type OptionSlot,
} from "../../components/VariantSelector";
import { useSimilarProducts } from "@/lib/api/recommendations";
import { addRecentlyViewed, useRecentlyViewed } from "@/lib/recently-viewed";
import { ProductCard } from "../../components/ProductCard";
import { createPreorder } from "@/lib/api/preorders";
import { getToken } from "@/lib/api/client";
import { useToggleFavourite } from "@/lib/favourites";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale } from "@/lib/locale/locale-provider";
import { useImagePrefetch } from "@/hooks/useImagePrefetch";
import Image from "next/image";
import Link from "next/link";
import {
  X,
  Heart,
  ChevronLeft,
  ChevronRight,
  Truck,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

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
    if (values.length > 0) groups.push({ name, values, slot });
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
  return matching.some((v) => v.inventory_quantity > 0);
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
  const [status, setStatus] = useState<"idle" | "paying" | "saving">("idle");

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
    if (!token) { router.push("/login"); return; }
    const pk = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;
    if (!pk || !window.PaystackPop) {
      toast.error("Payment unavailable. Please try again.", { duration: 6000 });
      return;
    }
    let email = "";
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      email = payload.email || "";
    } catch { email = ""; }
    if (!email) {
      toast.error("Could not read your account email. Please log in again.");
      return;
    }
    setStatus("paying");
    window.PaystackPop.setup({
      key: pk,
      email,
      amount: Math.round(total * 100),
      currency: "GHS",
      metadata: { variantId, quantity, productTitle },
      callback: async (response) => {
        setStatus("saving");
        try {
          const preorder = await createPreorder({
            item: { variantId, productTitle, variantTitle: variantTitle ?? undefined, quantity, price },
            paymentReference: response.reference,
          });
          router.push(`/preorders/confirmation?order=${encodeURIComponent(preorder.order_number)}`);
        } catch {
          toast.error(
            "Payment received but we couldn't record your pre-order. Please contact support with your reference: " + response.reference,
            { duration: 10000 },
          );
          setStatus("idle");
        }
      },
      onClose: () => setStatus("idle"),
    }).openIframe();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="relative w-full max-w-md bg-white p-6">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1 text-gray-400 hover:text-black transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="mb-4 text-[13px] tracking-[0.18em] uppercase font-bold text-black">Pre-order</h2>

        <div className="mb-4 bg-[#f4f3f1] p-3">
          <p className="font-medium text-black">{productTitle}</p>
          {variantTitle && <p className="mt-0.5 text-sm text-[#59626E]">{variantTitle}</p>}
          <p className="mt-1 text-sm text-[#3B414A]">GH₵{price.toLocaleString()} each</p>
        </div>

        <div className="mb-4 flex items-center gap-3">
          <span className="text-sm tracking-widest uppercase text-[#59626E]">Quantity</span>
          <div className="flex items-center border border-black">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="px-3 py-1.5 text-gray-600 hover:bg-[#f4f3f1] transition-colors"
            >−</button>
            <span className="min-w-[2rem] text-center text-sm font-medium">{quantity}</span>
            <button
              onClick={() => setQuantity((q) => q + 1)}
              className="px-3 py-1.5 text-gray-600 hover:bg-[#f4f3f1] transition-colors"
            >+</button>
          </div>
        </div>

        <div className="mb-5 flex items-center justify-between border-t border-black/10 pt-4">
          <span className="text-[11px] tracking-widest uppercase text-[#59626E]">Total</span>
          <span className="text-base font-bold text-black">GH₵{total.toLocaleString()}</span>
        </div>

        <button
          onClick={handlePay}
          disabled={status === "paying" || status === "saving"}
          className="w-full bg-black py-3 text-[13px] tracking-[0.18em] uppercase font-bold text-white disabled:opacity-60"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          {status === "paying"
            ? "Opening payment…"
            : status === "saving"
              ? "Saving pre-order…"
              : `Pay GH₵${total.toLocaleString()}`}
        </button>

        <p className="mt-3 text-center text-xs text-[#768293]">
          Processed securely via Paystack. Your item is reserved once stock arrives.
        </p>
      </div>
    </div>
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
  const allSorted = [...images].sort((a, b) => a.position - b.position);

  // Show only images tagged to the selected color.
  // color_tags = [] means "show for all colours" (shared / lifestyle shots).
  // Fall back to the full set when no image has any tags yet (untagged product).
  const anyTagged = allSorted.some((img) => (img.color_tags ?? []).length > 0);
  const sorted = anyTagged && colorFilter
    ? allSorted.filter((img) => {
        const tags = img.color_tags ?? [];
        return tags.length === 0 || tags.includes(colorFilter);
      })
    : allSorted;

  const [idx, setIdx] = useState(0);

  useImagePrefetch(images, colorFilter ?? "", { maxPriority: 6, width: 1080, quality: 80 });

  // When the color changes, jump to the first image in the new set.
  useEffect(() => {
    setIdx(0);
  }, [colorFilter]);

  useEffect(() => {
    if (!activeImageId) return;
    const i = sorted.findIndex((img) => img.id === activeImageId);
    if (i !== -1) setIdx(i);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeImageId]);

  if (sorted.length === 0) {
    return (
      <div className="aspect-[4/5] bg-[#f4f3f1]" />
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
              i === idx ? "border-black opacity-100" : "border-transparent opacity-60 hover:opacity-100"
            }`}
          >
            <Image
              src={img.src}
              alt={img.alt_text || ""}
              fill
              sizes="64px"
              className="object-cover"
            />
          </button>
        ))}
      </div>

      {/* Main stage */}
      <div>
        <div className="relative aspect-[4/5] bg-[#f4f3f1] overflow-hidden">
          <Image
            src={sorted[idx].src}
            alt={sorted[idx].alt_text || "Product image"}
            fill
            priority
            sizes="(min-width: 1024px) 50vw, 100vw"
            quality={80}
            className="object-cover"
          />

          {/* Counter */}
          <div className="absolute left-4 bottom-4 bg-white/85 backdrop-blur-[4px] px-2.5 py-1 text-[13px] font-bold text-black">
            {String(idx + 1).padStart(2, "0")} / {String(sorted.length).padStart(2, "0")}
          </div>

          {/* Navigation arrows */}
          {sorted.length > 1 && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2">
              <button
                onClick={() => setIdx((idx - 1 + sorted.length) % sorted.length)}
                className="w-9 h-9 bg-white/85 backdrop-blur-[4px] flex items-center justify-center text-black hover:bg-black hover:text-white transition-colors duration-200"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIdx((idx + 1) % sorted.length)}
                className="w-9 h-9 bg-white/85 backdrop-blur-[4px] flex items-center justify-center text-black hover:bg-black hover:text-white transition-colors duration-200"
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
                className={`w-1.5 h-1.5 rounded-full transition-colors ${i === idx ? "bg-black" : "bg-black/25"}`}
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
    <div className="border-b border-black/10">
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
        <div className="pb-[18px] text-[13px] leading-[1.55] text-[#3B414A]">
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
    <div className="bg-white min-h-screen">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-8">
        <div className="grid gap-8 lg:gap-20 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_460px]">
          <div className="aspect-[4/5] animate-pulse bg-[#f4f3f1]" />
          <div className="space-y-4 pt-6">
            <div className="h-3 w-1/3 animate-pulse bg-[#f4f3f1]" />
            <div className="h-8 w-3/4 animate-pulse bg-[#f4f3f1]" />
            <div className="h-6 w-1/4 animate-pulse bg-[#f4f3f1]" />
            <div className="h-24 animate-pulse bg-[#f4f3f1]" />
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

function selectedFromVariant(variant: ProductVariant, groups: OptionSlot[]): Record<string, string> {
  const sel: Record<string, string> = {};
  for (const g of groups) {
    const key = g.slot === 1 ? "option1_value" : g.slot === 2 ? "option2_value" : "option3_value";
    const val = variant[key];
    if (val) sel[g.name] = val;
  }
  return sel;
}


// ─── Page ─────────────────────────────────────────────────────────────────────

function ProductDetailBody({ id, initialColor }: { id: string; initialColor: string | null }) {
  const { data: product, isLoading, error } = useProduct(id);
  const { formatPrice } = useLocale();
  const { addItem } = useCart();
  const { isFavourited, toggle: toggleFavourite } = useToggleFavourite(product?.id ?? "");
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [initialized, setInitialized] = useState(false);
  const [added, setAdded] = useState(false);
  const [showPreorderModal, setShowPreorderModal] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<string | null>("details");

  const variants = product?.product_variants || [];
  const optionGroups = useMemo(() => extractOptionGroups(variants), [variants]);

  useEffect(() => {
    if (initialized || variants.length === 0) return;
    const groups = extractOptionGroups(variants);
    if (groups.length === 0) { setInitialized(true); return; }
    const firstInStock = variants.find((v) => v.inventory_quantity > 0) || variants[0];
    const sel: Record<string, string> = {};
    for (const g of groups) {
      if (g.name.toLowerCase() === "size") continue;
      const key = g.slot === 1 ? "option1_value" : g.slot === 2 ? "option2_value" : "option3_value";
      const isColorGroup = g.name.toLowerCase() === "color" || g.name.toLowerCase() === "colour";
      if (isColorGroup && initialColor) {
        const match = g.values.find((v) => v.toLowerCase() === initialColor.toLowerCase());
        if (match) { sel[g.name] = match; continue; }
      }
      const val = firstInStock[key];
      if (val) sel[g.name] = val;
    }
    setSelectedOptions(sel);
    setInitialized(true);
  }, [variants, initialized]);

  const activeVariant = useMemo(() => {
    if (variants.length === 0) return null;
    const slots = getOptionGroups(variants);
    if (slots.length === 0) return variants[0] || null;
    return findMatchingVariant(variants, selectedOptions, slots);
  }, [variants, selectedOptions]);

  const handleOptionSelect = useCallback((optionName: string, value: string) => {
    setSelectedOptions((prev) => ({ ...prev, [optionName]: value }));
  }, []);

  const { data: similarProducts } = useSimilarProducts(product?.handle ?? "", 6);
  const { data: allProducts } = useProducts({ published: "true", limit: 8, sort_by: "created_at", sort_order: "desc" });
  const { items: recentlyViewed } = useRecentlyViewed(product?.id);

  useEffect(() => {
    if (product) addRecentlyViewed(product);
  }, [product?.id]);

  if (isLoading) return <ProductDetailSkeleton />;

  if (error || !product) {
    return (
      <div className="bg-white min-h-screen flex items-center justify-center">
        <p className="text-[13px] tracking-[0.14em] uppercase text-[#59626E]">Product not found.</p>
      </div>
    );
  }

  const hasSizeOption = optionGroups.some((g) => g.name.toLowerCase() === "size");
  const sizeSelected = !hasSizeOption || !!selectedOptions[optionGroups.find((g) => g.name.toLowerCase() === "size")?.name ?? ""];
  // Resolve the active variant regardless of stock so OOS variants surface the
  // correct "Sold Out" / preorder state on the CTA.
  const active = sizeSelected ? (activeVariant || variants[0] || null) : null;
  const displayPrice = active?.price ?? product.base_price;
  const comparePrice = active?.compare_at_price ?? null;
  const inStock = active ? active.inventory_quantity > 0 : false;
  const lowStock = active && active.inventory_quantity > 0 && active.inventory_quantity <= 3;
  const canPreorder = active ? (!inStock && (active.preorder_enabled ?? false)) : false;

  const variantTitle = active
    ? [active.option1_value, active.option2_value, active.option3_value].filter(Boolean).join(" / ") || null
    : null;

  function handleAddToCart() {
    if (!active || !inStock || !product) return;
    const image = product.product_images?.[0]?.src ?? null;
    const variantParts = [active.option1_value, active.option2_value, active.option3_value].filter(Boolean);
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

  const images = [...(product.product_images || [])].sort((a, b) => a.position - b.position);

  return (
    <div className="bg-white text-black min-h-screen">
      {/* Breadcrumbs */}
      <nav className="max-w-[1400px] mx-auto px-4 sm:px-8 pt-5 text-[11px] tracking-[0.14em] uppercase text-[#6b7280]">
        <Link href="/" className="hover:text-black transition-colors">Home</Link>
        <span className="mx-2.5 text-[#d1d5db]">›</span>
        <Link href="/products" className="hover:text-black transition-colors">Products</Link>
        <span className="mx-2.5 text-[#d1d5db]">›</span>
        <span className="text-black">{product.title}</span>
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
            <div className="text-[10px] tracking-[0.22em] uppercase text-[#59626E]">
              {product.vendor}
            </div>
          )}

          {/* Title */}
          <h1 className="text-[28px] leading-[1.05] font-light mt-1.5">
            {product.title}
          </h1>

          {/* Price */}
          <div className="flex items-baseline gap-3">
            {displayPrice != null && (
              <span className="text-[22px] font-light">{formatPrice(displayPrice)}</span>
            )}
            {comparePrice != null && comparePrice > (displayPrice || 0) && (
              <>
                <span className="text-base text-[#59626E] line-through">{formatPrice(comparePrice)}</span>
                <span className="text-[10px] tracking-[0.18em] uppercase px-2 py-[3px] bg-black text-[#F4F3F1]">
                  −{Math.round((1 - (displayPrice || 0) / comparePrice) * 100)}%
                </span>
              </>
            )}
          </div>

          {/* Stock status */}
          <div className="flex items-center gap-2.5 py-3.5 border-t border-b border-black/10">
            {!sizeSelected ? (
              <span className="text-[12px] tracking-[0.06em] uppercase text-[#59626E]">
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
                      ? "Pre-order — ships when restocked"
                      : "Out of stock"}
                </span>
              </>
            )}
          </div>

          {/* Variant options */}
          {optionGroups.map((group) => {
            const isSize = group.name.toLowerCase() === "size";
            return (
              <div key={group.name} className="flex flex-col gap-2.5">
                <div className="flex justify-between items-baseline">
                  <span className="text-[11px] tracking-[0.18em] uppercase text-black">
                    {group.name}
                  </span>
                  {selectedOptions[group.name] && (
                    <span className="text-[11px] tracking-[0.12em] uppercase text-[#59626E]">
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
                    return (
                      <button
                        key={val}
                        onClick={() => handleOptionSelect(group.name, val)}
                        className={`${isSize ? "h-11" : "h-11 px-4"} border font-light text-[13px] tracking-[0.06em] transition-all duration-[160ms] ${
                          isSelected && inStockForVal
                            ? "bg-black text-[#F4F3F1] border-black"
                            : isSelected && !inStockForVal
                              ? "bg-black text-[#F4F3F1] border-black line-through"
                              : !inStockForVal
                                ? "text-[#A9B5C6] line-through border-black/25 hover:border-black/50"
                                : "border-black/25 hover:border-black bg-white text-black"
                        }`}
                      >
                        {val}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Size guide */}
          {optionGroups.some((g) => g.name.toLowerCase() === "size") && (
            <div className="flex justify-between text-[11px] tracking-[0.12em] uppercase text-[#59626E]">
              <span>Size</span>
              <span className="underline underline-offset-[3px] text-black cursor-pointer">
                Size &amp; fit guide
              </span>
            </div>
          )}

          {/* CTAs */}
          <div className="flex flex-col gap-2.5 mt-1">
            {!sizeSelected ? (
              <button
                disabled
                className="w-full h-[54px] bg-black text-[#F4F3F1] text-[13px] tracking-[0.18em] uppercase opacity-40 cursor-not-allowed"
                style={{ fontFamily: "Inter, sans-serif", fontWeight: 700 }}
              >
                Select a Size
              </button>
            ) : canPreorder ? (
              <button
                onClick={() => setShowPreorderModal(true)}
                className="w-full h-[54px] bg-black text-[#F4F3F1] text-[13px] tracking-[0.18em] uppercase transition-transform duration-[140ms] active:scale-[0.99]"
                style={{ fontFamily: "Inter, sans-serif", fontWeight: 700 }}
              >
                Pre-order Now
              </button>
            ) : (
              <button
                onClick={handleAddToCart}
                disabled={!inStock}
                className="w-full h-[54px] bg-black text-[#F4F3F1] text-[13px] tracking-[0.18em] uppercase disabled:opacity-40 disabled:cursor-not-allowed transition-transform duration-[140ms] active:scale-[0.99]"
                style={{ fontFamily: "Inter, sans-serif", fontWeight: 700 }}
              >
                {!inStock
                  ? "Sold Out"
                  : added
                    ? "Added to Cart"
                    : displayPrice != null
                      ? `Add to Cart — ${formatPrice(displayPrice)}`
                      : "Add to Cart"}
              </button>
            )}

            <button
              onClick={toggleFavourite}
              className="w-full h-[46px] bg-white text-black border border-black flex items-center justify-center gap-2.5 text-[12px] tracking-[0.16em] uppercase hover:bg-black hover:text-white transition-colors duration-[140ms]"
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
          <p className="text-xs text-[#59626E] italic leading-[1.4] mt-1">
            For an oversized fit, size up one size.
          </p>

          {/* Accordion */}
          <div className="border-t border-black/10">
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
                Accra &amp; Tema delivery in 1–2
                working days; rest of Ghana 3–5 days; international 7–14 days via DHL. 30-day
                returns on unworn, tagged items.
              </p>
            </AccordionItem>
          </div>

          {/* Delivery bar */}
          <div className="flex gap-6 py-3.5 text-[11px] tracking-[0.14em] uppercase text-[#59626E]">
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
          <section className="max-w-[1400px] mx-auto px-4 sm:px-8 py-14 border-t border-black">
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
        <section className="max-w-[1400px] mx-auto px-4 sm:px-8 py-14 border-t border-black">
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
