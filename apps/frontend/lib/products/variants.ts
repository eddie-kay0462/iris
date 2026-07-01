import type { ProductVariant } from "@/lib/api/products";

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

/** Unique size values, in order of first appearance. */
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
  return sizes;
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
