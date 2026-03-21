"use client";

import { useState, useEffect } from "react";
import type { ProductVariant, ProductImage } from "@/lib/api/products";

// ─── Types ────────────────────────────────────────────────────────────────────

/** A locally-held variant draft (before the product exists in the DB) */
export interface LocalVariantDraft {
  localId: string;
  option1_name?: string;
  option1_value?: string;
  option2_name?: string;
  option2_value?: string;
  price?: number;
  sku?: string;
  image_id?: string;
  inventory_quantity: number;
}


interface VariantsEditorProps {
  /**
   * Saved variants from the DB (edit mode).
   * Pass an empty array and use localVariants for create mode.
   */
  variants?: ProductVariant[];
  /** Locally available images to associate with variants (only in edit mode typically) */
  productImages?: ProductImage[];
  /** Local-only drafts shown before the product exists */
  localVariants?: LocalVariantDraft[];
  /** Current product title (for auto SKU generation) */
  productTitle?: string;
  /** Product base price (to seed new variants) */
  basePrice?: number | string;
  onAdd: (variant: Record<string, unknown>) => void;
  onUpdate?: (variantId: string, data: Record<string, unknown>) => void;
  onDelete?: (variantId: string) => void;
  onDeleteLocal?: (localId: string) => void;
}

// Shared options
const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL", "One Size"];
const COLOR_OPTIONS = ["Black", "White", "Grey", "Navy", "Brown", "Beige", "Olive", "Red"];

// ─── Component ────────────────────────────────────────────────────────────────

export function VariantsEditor({
  productTitle = "",
  basePrice,
  variants = [],
  productImages = [],
  localVariants = [],
  onAdd,
  onUpdate,
  onDelete,
  onDeleteLocal,
}: VariantsEditorProps) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [autoSku, setAutoSku] = useState(true);

  // Moved defaultForm up so it can be used in useState initialization without ESLint complaining
  const defaultForm = (seedPrice?: string | number) => ({
    option1_name: "Color",
    option1_value: "",
    option2_name: "Size",
    option2_value: "",
    price: seedPrice != null ? String(seedPrice) : "",
    sku: "",
    image_id: "",
    inventory_quantity: "0",
  });

  const [form, setForm] = useState(defaultForm(basePrice));

  // ── Auto SKU Logic ──────────────────────────────────────────────
  useEffect(() => {
    if (adding && autoSku) {
      setForm((f) => ({ ...f, sku: generateSku(productTitle, f.option1_value, f.option2_value) }));
    }
  }, [productTitle, form.option1_value, form.option2_value, adding, autoSku]);

  function generateSku(title: string, color?: string, size?: string) {
    // 1. Title prefix (e.g. "Varsity Jacket" -> "VJ")
    const titleParts = title.trim().split(/\s+/).filter(Boolean);
    let prefix = "PRD";
    if (titleParts.length === 1) {
      prefix = titleParts[0].substring(0, 3).toUpperCase();
    } else if (titleParts.length > 1) {
      prefix = titleParts.map((w) => w[0]).join("").toUpperCase().substring(0, 3);
    }

    const parts = [prefix];

    // 2. Color abbreviations
    if (color) {
      const cmap: Record<string, string> = {
        Black: "BLK", White: "WHT", Grey: "GRY", Navy: "NVY", Brown: "BRN",
        Beige: "BEI", Olive: "OLV", Red: "RED", Blue: "BLU", Green: "GRN"
      };
      parts.push(cmap[color] || color.substring(0, 3).toUpperCase());
    }

    // 3. Size
    if (size) {
      parts.push(size.toUpperCase().replace(/\s+/g, ""));
    }

    return parts.join("-");
  }

  // ────────────────────────────────────────────────────────────────

  function handleAdd() {
    if (!form.option1_value && !form.option2_value) return;
    onAdd({
      option1_name: form.option1_value ? form.option1_name : undefined,
      option1_value: form.option1_value || undefined,
      option2_name: form.option2_value ? form.option2_name : undefined,
      option2_value: form.option2_value || undefined,
      price: form.price ? Number(form.price) : undefined,
      sku: form.sku || undefined,
      image_id: form.image_id || undefined,
      inventory_quantity: Number(form.inventory_quantity) || 0,
    });
    setForm(defaultForm(basePrice));
    setAutoSku(true);
    // Keep the add form open for rapid entry
  }

  function startEdit(v: ProductVariant) {
    setEditing(v.id);
    setForm({
      option1_name: v.option1_name || "Color",
      option1_value: v.option1_value || "",
      option2_name: v.option2_name || "Size",
      option2_value: v.option2_value || "",
      price: v.price != null ? String(v.price) : "",
      sku: v.sku || "",
      image_id: v.image_id || "",
      inventory_quantity: String(v.inventory_quantity || 0),
    });
  }

  function handleUpdate(variantId: string) {
    onUpdate?.(variantId, {
      option1_name: form.option1_value ? form.option1_name : undefined,
      option1_value: form.option1_value || undefined,
      option2_name: form.option2_value ? form.option2_name : undefined,
      option2_value: form.option2_value || undefined,
      price: form.price ? Number(form.price) : undefined,
      sku: form.sku || undefined,
      image_id: form.image_id || undefined,
      inventory_quantity: Number(form.inventory_quantity) || 0,
    });
    setEditing(null);
    setForm(defaultForm(basePrice));
  }

  const hasAny = variants.length > 0 || localVariants.length > 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-700">Variants</h3>
        <button
          type="button"
          onClick={() => { setAdding(!adding); setForm(defaultForm(basePrice)); }}
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          {adding ? "− Close" : "+ Add variant"}
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-3">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">New variant</p>
          {/* Option 1 — Color */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs text-slate-500">Color</label>
              <div className="flex gap-1 flex-wrap">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, option1_value: form.option1_value === c ? "" : c })}
                    className={[
                      "rounded border px-2 py-0.5 text-xs transition-colors",
                      form.option1_value === c
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 text-slate-600 hover:border-slate-400",
                    ].join(" ")}
                  >
                    {c}
                  </button>
                ))}
                {/* Custom color input */}
                <input
                  placeholder="Other…"
                  value={COLOR_OPTIONS.includes(form.option1_value) ? "" : form.option1_value}
                  onChange={(e) => setForm({ ...form, option1_value: e.target.value })}
                  className="rounded border border-slate-200 px-2 py-0.5 text-xs w-20"
                />
              </div>
            </div>
            {/* Option 2 — Size */}
            <div>
              <label className="mb-1 block text-xs text-slate-500">Size</label>
              <div className="flex gap-1 flex-wrap">
                {SIZE_OPTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm({ ...form, option2_value: form.option2_value === s ? "" : s })}
                    className={[
                      "rounded border px-2 py-0.5 text-xs transition-colors",
                      form.option2_value === s
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 text-slate-600 hover:border-slate-400",
                    ].join(" ")}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Price / SKU / Qty / Image */}
          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="mb-1 block text-xs text-slate-500">Price (GH₵)</label>
              <input
                type="number"
                placeholder="0.00"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs text-slate-500">SKU</label>
                <button
                  type="button"
                  onClick={() => {
                    setAutoSku(true);
                    setForm(f => ({ ...f, sku: generateSku(productTitle, f.option1_value, f.option2_value) }));
                  }}
                  className="text-[10px] text-blue-600 hover:text-blue-800"
                  title="Auto-generate SKU"
                >
                  ✨ Auto
                </button>
              </div>
              <input
                placeholder="e.g. BLK-M"
                value={form.sku}
                onChange={(e) => {
                  setAutoSku(false);
                  setForm({ ...form, sku: e.target.value });
                }}
                className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Quantity</label>
              <input
                type="number"
                value={form.inventory_quantity}
                onChange={(e) => setForm({ ...form, inventory_quantity: e.target.value })}
                className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm"
              />
            </div>
            {productImages.length > 0 && (
              <div>
                <label className="mb-1 block text-xs text-slate-500">Image</label>
                <select
                  value={form.image_id}
                  onChange={(e) => setForm({ ...form, image_id: e.target.value })}
                  className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm bg-white"
                >
                  <option value="">None</option>
                  {productImages.map((img, i) => (
                    <option key={img.id} value={img.id}>Image {img.position || i + 1}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAdd}
              disabled={!form.option1_value && !form.option2_value}
              className="rounded bg-slate-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
            >
              Add variant
            </button>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="text-xs text-slate-500 hover:text-slate-700"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Variant table */}
      {hasAny && (
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 text-left text-xs text-slate-500">
            <tr>
              <th className="pb-2 font-medium w-8"></th>
              <th className="pb-2 font-medium">Color</th>
              <th className="pb-2 font-medium">Size</th>
              <th className="pb-2 font-medium">SKU</th>
              <th className="pb-2 font-medium">Price</th>
              <th className="pb-2 font-medium">Stock</th>
              <th className="pb-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {/* Local drafts (create mode) */}
            {localVariants.map((v) => (
              <tr key={v.localId} className="border-b border-slate-100">
                <td className="py-2">
                  <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-300">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </div>
                </td>
                <td className="py-2 text-slate-600">{v.option1_value || "—"}</td>
                <td className="py-2 text-slate-600">{v.option2_value || "—"}</td>
                <td className="py-2 text-slate-400 text-xs">{v.sku || "—"}</td>
                <td className="py-2">{v.price != null ? `GH₵${v.price}` : "—"}</td>
                <td className="py-2">{v.inventory_quantity}</td>
                <td className="py-2 text-right">
                  <span className="mr-2 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-600">
                    pending
                  </span>
                  <button
                    type="button"
                    onClick={() => onDeleteLocal?.(v.localId)}
                    className="text-xs text-red-400 hover:text-red-600"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
            {/* Saved variants (edit mode) */}
            {variants.map((v) => {
              const image = productImages.find(i => i.id === v.image_id);

              return editing === v.id ? (
                <tr key={v.id} className="border-b border-slate-100 bg-slate-50">
                  <td className="py-2 pr-2" colSpan={2}>
                    <input
                      value={form.option1_value}
                      placeholder="Color"
                      onChange={(e) => setForm({ ...form, option1_value: e.target.value })}
                      className="w-full rounded border border-slate-200 px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      value={form.option2_value}
                      onChange={(e) => setForm({ ...form, option2_value: e.target.value })}
                      className="w-full rounded border border-slate-200 px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      value={form.sku}
                      onChange={(e) => setForm({ ...form, sku: e.target.value })}
                      className="w-full rounded border border-slate-200 px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      type="number"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                      className="w-24 rounded border border-slate-200 px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      type="number"
                      value={form.inventory_quantity}
                      onChange={(e) => setForm({ ...form, inventory_quantity: e.target.value })}
                      className="w-20 rounded border border-slate-200 px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="py-2 text-right">
                    <button type="button" onClick={() => handleUpdate(v.id)} className="mr-2 text-xs text-blue-600 font-medium">
                      Save
                    </button>
                    <button type="button" onClick={() => setEditing(null)} className="text-xs text-slate-400">
                      Cancel
                    </button>
                  </td>
                </tr>
              ) : (
                <tr key={v.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-2">
                    {image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={image.src} alt="" className="w-8 h-8 rounded object-cover border border-slate-200" />
                    ) : (
                      <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-300">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      </div>
                    )}
                  </td>
                  <td className="py-2">{v.option1_value || "—"}</td>
                  <td className="py-2">{v.option2_value || "—"}</td>
                  <td className="py-2 text-xs text-slate-400">{v.sku || "—"}</td>
                  <td className="py-2">{v.price != null ? `GH₵${v.price.toLocaleString()}` : "—"}</td>
                  <td className="py-2">
                    <span className={
                      v.inventory_quantity === 0 ? "text-red-600 font-medium"
                        : v.inventory_quantity < 10 ? "text-yellow-600" : ""
                    }>
                      {v.inventory_quantity}
                    </span>
                  </td>
                  <td className="py-2 text-right">
                    <button type="button" onClick={() => startEdit(v)} className="mr-2 text-xs text-slate-500 hover:text-slate-700">
                      Edit
                    </button>
                    <button type="button" onClick={() => onDelete?.(v.id)} className="text-xs text-red-500 hover:text-red-700">
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {!hasAny && !adding && (
        <p className="text-xs text-slate-400 italic">No variants yet. Click "+ Add variant" to create the first one.</p>
      )}
    </div>
  );
}
