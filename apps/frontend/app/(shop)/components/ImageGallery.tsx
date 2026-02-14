"use client";

import { useState } from "react";
import type { ProductImage } from "@/lib/api/products";

export function ImageGallery({ images }: { images: ProductImage[] }) {
  const sorted = [...images].sort((a, b) => a.position - b.position);
  const [selected, setSelected] = useState(0);

  if (sorted.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-lg bg-gray-100 text-gray-400">
        No images
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
        <img
          src={sorted[selected].src}
          alt={sorted[selected].alt_text || "Product image"}
          className="h-full w-full object-cover"
        />
      </div>
      {sorted.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {sorted.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setSelected(i)}
              className={`h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border-2 ${
                i === selected ? "border-black" : "border-transparent"
              }`}
            >
              <img
                src={img.src}
                alt={img.alt_text || "Thumbnail"}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
