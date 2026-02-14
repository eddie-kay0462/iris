"use client";

import { useState } from "react";
import type { ProductImage } from "@/lib/api/products";

interface ImagesEditorProps {
  images: ProductImage[];
  onAdd: (url: string, altText?: string) => void;
  onDelete: (imageId: string) => void;
  onReorder: (imageIds: string[]) => void;
}

export function ImagesEditor({
  images,
  onAdd,
  onDelete,
}: ImagesEditorProps) {
  const [adding, setAdding] = useState(false);
  const [url, setUrl] = useState("");
  const [altText, setAltText] = useState("");

  const sorted = [...images].sort((a, b) => a.position - b.position);

  function handleAdd() {
    if (!url.trim()) return;
    onAdd(url.trim(), altText.trim() || undefined);
    setUrl("");
    setAltText("");
    setAdding(false);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-700">Images</h3>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          + Add image
        </button>
      </div>

      {sorted.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {sorted.map((img) => (
            <div
              key={img.id}
              className="group relative overflow-hidden rounded-lg border border-slate-200"
            >
              <img
                src={img.url}
                alt={img.alt_text || "Product image"}
                className="aspect-square w-full object-cover"
              />
              <button
                type="button"
                onClick={() => onDelete(img.id)}
                className="absolute right-1 top-1 hidden rounded-full bg-red-500 p-1 text-white group-hover:block"
              >
                <svg
                  className="h-3 w-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {adding && (
        <div className="rounded-lg border border-slate-200 p-3 space-y-2">
          <input
            placeholder="Image URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm"
          />
          <input
            placeholder="Alt text (optional)"
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
            className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAdd}
              className="rounded bg-slate-900 px-3 py-1 text-xs text-white"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="text-xs text-slate-500"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
