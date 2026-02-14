"use client";

import type { ProductVariant } from "@/lib/api/products";

interface VariantSelectorProps {
  variants: ProductVariant[];
  selectedId: string | null;
  onSelect: (variant: ProductVariant) => void;
}

export function VariantSelector({
  variants,
  selectedId,
  onSelect,
}: VariantSelectorProps) {
  if (variants.length <= 1 && !variants[0]?.option1_value) {
    return null;
  }

  // Group by option name
  const optionName = variants[0]?.option1_name || "Option";

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">{optionName}</h3>
      <div className="flex flex-wrap gap-2">
        {variants.map((v) => {
          const isSelected = v.id === selectedId;
          const outOfStock = v.inventory_quantity === 0;
          return (
            <button
              key={v.id}
              onClick={() => onSelect(v)}
              disabled={outOfStock}
              className={`rounded-md border px-4 py-2 text-sm font-medium transition ${
                isSelected
                  ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                  : outOfStock
                    ? "border-gray-200 text-gray-300 cursor-not-allowed dark:border-gray-700 dark:text-gray-600"
                    : "border-gray-300 text-gray-700 hover:border-gray-500 dark:border-gray-600 dark:text-gray-300 dark:hover:border-gray-400"
              }`}
            >
              {v.option1_value || "Default"}
              {outOfStock && " (Sold out)"}
            </button>
          );
        })}
      </div>
    </div>
  );
}
