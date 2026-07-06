import type { ProductVariant } from "@/lib/api/products";

/** True when a variant can be sold right now (has stock and isn't switched off). */
export function isVariantInStock(v: ProductVariant): boolean {
  return v.inventory_quantity > 0 && v.available !== false;
}

/** The variant option slot that holds the size value. */
export type OptionSlotKey =
  | "option1_value"
  | "option2_value"
  | "option3_value";

/**
 * Work out which option slot (1/2/3) carries the "Size" axis for a product.
 * Prefers an explicitly-named "Size" option, else falls back to the first slot
 * that actually has values.
 */
export function getSizeSlot(variants: ProductVariant[]): OptionSlotKey | null {
  const first = variants[0];
  if (!first) return null;
  if (first.option1_name?.toLowerCase() === "size") return "option1_value";
  if (first.option2_name?.toLowerCase() === "size") return "option2_value";
  if (first.option3_name?.toLowerCase() === "size") return "option3_value";
  if (first.option2_value) return "option2_value";
  if (first.option1_value) return "option1_value";
  return null;
}

/**
 * Canonical apparel size order. Values are matched case-insensitively and with
 * surrounding whitespace trimmed; anything not listed (e.g. numeric sizes or
 * one-off labels) sorts after the known letter sizes, alphabetically.
 */
const SIZE_ORDER = [
  "XXXS",
  "XXS",
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "XXXL",
  "4XL",
  "5XL",
];

function sizeRank(size: string): number {
  const key = size.trim().toUpperCase();
  const idx = SIZE_ORDER.indexOf(key);
  return idx === -1 ? SIZE_ORDER.length : idx;
}

/** Sort size labels into canonical apparel order (XXS, XS, S, M, L, …). */
export function sortSizes(sizes: string[]): string[] {
  return [...sizes].sort((a, b) => {
    const ra = sizeRank(a);
    const rb = sizeRank(b);
    if (ra !== rb) return ra - rb;
    return a.localeCompare(b, undefined, { numeric: true });
  });
}

/** Unique size values, ordered canonically (XXS, XS, S, M, L, …). */
export function extractSizes(variants: ProductVariant[]): string[] {
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
  return sortSizes(sizes);
}

/** The variant matching a given size value, if any. */
export function findVariantBySize(
  variants: ProductVariant[],
  size: string,
): ProductVariant | undefined {
  const slot = getSizeSlot(variants);
  if (!slot) return undefined;
  return variants.find((v) => v[slot] === size);
}
