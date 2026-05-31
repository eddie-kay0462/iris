"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import type { ProductImage } from "@/lib/api/products";

export function ImageGallery({
  images,
  activeImageId,
}: {
  images: ProductImage[];
  activeImageId?: string | null;
}) {
  const sorted = [...images].sort((a, b) => a.position - b.position);
  const [selected, setSelected] = useState(0);

  // Jump to the variant's image when activeImageId changes
  useEffect(() => {
    if (!activeImageId) return;
    const idx = sorted.findIndex((img) => img.id === activeImageId);
    if (idx !== -1 && idx !== selected) setSelected(idx);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeImageId]);

  if (sorted.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-lg bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500">
        No images
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
        <Image
          src={sorted[selected].src}
          alt={sorted[selected].alt_text || "Product image"}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
          priority
        />
      </div>
      {sorted.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {sorted.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setSelected(i)}
              className={`relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border-2 ${
                i === selected
                  ? "border-black dark:border-white"
                  : "border-transparent"
              }`}
            >
              <Image
                src={img.src}
                alt={img.alt_text || "Thumbnail"}
                fill
                sizes="64px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
