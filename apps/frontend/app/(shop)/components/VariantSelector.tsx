"use client";

import { useMemo } from "react";
import type { ProductVariant } from "@/lib/api/products";

/** An option group like "Color" with its unique values ["Red", "Blue"] */
interface OptionGroup {
  name: string;
  values: string[];
  /** Which option slot: 1, 2, or 3 */
  slot: 1 | 2 | 3;
}

export interface VariantSelectorProps {
  variants: ProductVariant[];
  /** Currently selected value per option name, e.g. { Color: "Red", Size: "M" } */
  selected: Record<string, string>;
  onSelect: (optionName: string, value: string) => void;
}

/** Extract up to 3 option groups from the variant list */
function extractOptionGroups(variants: ProductVariant[]): OptionGroup[] {
  const groups: OptionGroup[] = [];
  const slots = [
    { nameKey: "option1_name", valueKey: "option1_value", slot: 1 },
    { nameKey: "option2_name", valueKey: "option2_value", slot: 2 },
    { nameKey: "option3_name", valueKey: "option3_value", slot: 3 },
  ] as const;

  for (const { nameKey, valueKey, slot } of slots) {
    const name = variants[0]?.[nameKey];
    if (!name) continue;

    const seen = new Set<string>();
    const values: string[] = [];
    for (const v of variants) {
      const val = v[valueKey];
      if (val && !seen.has(val)) {
        seen.add(val);
        values.push(val);
      }
    }
    if (values.length > 0) {
      groups.push({ name, values, slot });
    }
  }
  return groups;
}

/** Minimal option group info needed for variant matching */
export type OptionSlot = { name: string; slot: 1 | 2 | 3 };

/** Find the variant matching the full set of selected options */
export function findMatchingVariant(
  variants: ProductVariant[],
  selected: Record<string, string>,
  groups: OptionSlot[],
): ProductVariant | null {
  return (
    variants.find((v) =>
      groups.every((g) => {
        const key =
          g.slot === 1
            ? "option1_value"
            : g.slot === 2
              ? "option2_value"
              : "option3_value";
        return v[key] === selected[g.name];
      }),
    ) ?? null
  );
}

/** Check if a value for a given option group is available given the other selected options */
function isValueAvailable(
  variants: ProductVariant[],
  groups: OptionGroup[],
  selected: Record<string, string>,
  targetGroup: OptionGroup,
  targetValue: string,
): { available: boolean; inStock: boolean } {
  // Build a test selection with the target value
  const testSelected = { ...selected, [targetGroup.name]: targetValue };

  // Find variants that match all the selected options we have
  const matching = variants.filter((v) =>
    groups.every((g) => {
      const val = testSelected[g.name];
      if (!val) return true; // No selection for this group yet, skip
      const key =
        g.slot === 1
          ? "option1_value"
          : g.slot === 2
            ? "option2_value"
            : "option3_value";
      return v[key] === val;
    }),
  );

  if (matching.length === 0) return { available: false, inStock: false };
  return { available: true, inStock: matching.some((v) => v.inventory_quantity > 0) };
}

export function VariantSelector({
  variants,
  selected,
  onSelect,
}: VariantSelectorProps) {
  const groups = useMemo(() => extractOptionGroups(variants), [variants]);

  if (groups.length === 0) return null;

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.name} className="space-y-2">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {group.name}
            {selected[group.name] && (
              <span className="ml-2 font-normal text-gray-500 dark:text-gray-400">
                — {selected[group.name]}
              </span>
            )}
          </h3>
          <div className="flex flex-wrap gap-2">
            {group.values.map((value) => {
              const isSelected = selected[group.name] === value;
              const { available, inStock } = isValueAvailable(
                variants,
                groups,
                selected,
                group,
                value,
              );
              const disabled = !available || !inStock;

              return (
                <button
                  key={value}
                  onClick={() => onSelect(group.name, value)}
                  disabled={!available}
                  className={`rounded-md border px-4 py-2 text-sm font-medium transition ${
                    isSelected
                      ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                      : !available
                        ? "border-gray-200 text-gray-300 cursor-not-allowed dark:border-gray-700 dark:text-gray-600"
                        : !inStock
                          ? "border-gray-200 text-gray-400 cursor-not-allowed dark:border-gray-700 dark:text-gray-500"
                          : "border-gray-300 text-gray-700 hover:border-gray-500 dark:border-gray-600 dark:text-gray-300 dark:hover:border-gray-400"
                  }`}
                >
                  {value}
                  {available && !inStock && " (Sold out)"}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
