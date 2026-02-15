"use client";

import { useState } from "react";
import type { ProductVariant } from "@/lib/api/products";

interface VariantsEditorProps {
  variants: ProductVariant[];
  onAdd: (variant: Record<string, unknown>) => void;
  onUpdate: (variantId: string, data: Record<string, unknown>) => void;
  onDelete: (variantId: string) => void;
}

export function VariantsEditor({
  variants,
  onAdd,
  onUpdate,
  onDelete,
}: VariantsEditorProps) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({
    option1_name: "Size",
    option1_value: "",
    price: "",
    sku: "",
    inventory_quantity: "0",
  });

  function resetForm() {
    setForm({
      option1_name: "Size",
      option1_value: "",
      price: "",
      sku: "",
      inventory_quantity: "0",
    });
  }

  function handleAdd() {
    onAdd({
      option1_name: form.option1_name || undefined,
      option1_value: form.option1_value || undefined,
      price: form.price ? Number(form.price) : undefined,
      sku: form.sku || undefined,
      inventory_quantity: Number(form.inventory_quantity) || 0,
    });
    resetForm();
    setAdding(false);
  }

  function startEdit(v: ProductVariant) {
    setEditing(v.id);
    setForm({
      option1_name: v.option1_name || "Size",
      option1_value: v.option1_value || "",
      price: v.price != null ? String(v.price) : "",
      sku: v.sku || "",
      inventory_quantity: String(v.inventory_quantity || 0),
    });
  }

  function handleUpdate(variantId: string) {
    onUpdate(variantId, {
      option1_name: form.option1_name || undefined,
      option1_value: form.option1_value || undefined,
      price: form.price ? Number(form.price) : undefined,
      sku: form.sku || undefined,
      inventory_quantity: Number(form.inventory_quantity) || 0,
    });
    setEditing(null);
    resetForm();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-700">Variants</h3>
        <button
          type="button"
          onClick={() => {
            setAdding(true);
            resetForm();
          }}
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          + Add variant
        </button>
      </div>

      {variants.length > 0 && (
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 text-left text-slate-500">
            <tr>
              <th className="pb-2 font-medium">Option</th>
              <th className="pb-2 font-medium">SKU</th>
              <th className="pb-2 font-medium">Price</th>
              <th className="pb-2 font-medium">Stock</th>
              <th className="pb-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {variants.map((v) =>
              editing === v.id ? (
                <tr key={v.id} className="border-b border-slate-100">
                  <td className="py-2 pr-2">
                    <input
                      value={form.option1_value}
                      onChange={(e) =>
                        setForm({ ...form, option1_value: e.target.value })
                      }
                      className="w-full rounded border border-slate-200 px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      value={form.sku}
                      onChange={(e) =>
                        setForm({ ...form, sku: e.target.value })
                      }
                      className="w-full rounded border border-slate-200 px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      type="number"
                      value={form.price}
                      onChange={(e) =>
                        setForm({ ...form, price: e.target.value })
                      }
                      className="w-24 rounded border border-slate-200 px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      type="number"
                      value={form.inventory_quantity}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          inventory_quantity: e.target.value,
                        })
                      }
                      className="w-20 rounded border border-slate-200 px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="py-2 text-right">
                    <button
                      type="button"
                      onClick={() => handleUpdate(v.id)}
                      className="mr-2 text-xs text-blue-600"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(null)}
                      className="text-xs text-slate-400"
                    >
                      Cancel
                    </button>
                  </td>
                </tr>
              ) : (
                <tr
                  key={v.id}
                  className="border-b border-slate-100 hover:bg-slate-50"
                >
                  <td className="py-2">
                    {v.option1_value || "Default"}
                  </td>
                  <td className="py-2 text-slate-500">{v.sku || "—"}</td>
                  <td className="py-2">
                    {v.price != null ? `GH₵${v.price.toLocaleString()}` : "—"}
                  </td>
                  <td className="py-2">
                    <span
                      className={
                        v.inventory_quantity === 0
                          ? "text-red-600 font-medium"
                          : v.inventory_quantity < 10
                            ? "text-yellow-600"
                            : ""
                      }
                    >
                      {v.inventory_quantity}
                    </span>
                  </td>
                  <td className="py-2 text-right">
                    <button
                      type="button"
                      onClick={() => startEdit(v)}
                      className="mr-2 text-xs text-slate-500 hover:text-slate-700"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(v.id)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      )}

      {adding && (
        <div className="rounded-lg border border-slate-200 p-3 space-y-2">
          <div className="grid grid-cols-4 gap-2">
            <input
              placeholder="Option value (e.g. Medium)"
              value={form.option1_value}
              onChange={(e) =>
                setForm({ ...form, option1_value: e.target.value })
              }
              className="rounded border border-slate-200 px-2 py-1.5 text-sm"
            />
            <input
              placeholder="SKU"
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
              className="rounded border border-slate-200 px-2 py-1.5 text-sm"
            />
            <input
              type="number"
              placeholder="Price"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="rounded border border-slate-200 px-2 py-1.5 text-sm"
            />
            <input
              type="number"
              placeholder="Quantity"
              value={form.inventory_quantity}
              onChange={(e) =>
                setForm({ ...form, inventory_quantity: e.target.value })
              }
              className="rounded border border-slate-200 px-2 py-1.5 text-sm"
            />
          </div>
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
