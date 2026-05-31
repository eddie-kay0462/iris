"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Trash2, Plus, RefreshCw } from "lucide-react";
import {
  usePromoCodes,
  useCreatePromo,
  useUpdatePromo,
  useDeletePromo,
  DiscountType,
  PromoCode,
  CreatePromoPayload,
} from "@/lib/api/promos";

function generateCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

const DISCOUNT_TYPE_LABELS: Record<DiscountType, string> = {
  fixed: "Fixed amount (GH₵)",
  percentage: "Percentage (%)",
  free_shipping: "Free shipping",
  product: "Product discount (GH₵)",
};

function statusBadge(promo: PromoCode) {
  const now = new Date();
  if (!promo.is_active) return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">Inactive</span>;
  if (promo.expires_at && new Date(promo.expires_at) < now) return <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-600">Expired</span>;
  if (promo.max_uses !== null && promo.used_count >= promo.max_uses) return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-600">Used up</span>;
  if (promo.starts_at && new Date(promo.starts_at) > now) return <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-600">Scheduled</span>;
  return <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">Active</span>;
}

function valueLabel(promo: PromoCode) {
  switch (promo.discount_type) {
    case "fixed": return `GH₵ ${promo.discount_value} off`;
    case "percentage": return `${promo.discount_value}% off${promo.max_discount_amount ? ` (max GH₵ ${promo.max_discount_amount})` : ""}`;
    case "free_shipping": return "Free shipping";
    case "product": return `GH₵ ${promo.discount_value} off (products)`;
  }
}

const emptyForm = (): CreatePromoPayload => ({
  code: "",
  description: "",
  discount_type: "fixed",
  discount_value: 0,
  is_active: true,
});

export default function PromosSettingsPage() {
  const { data: promos = [], isLoading } = usePromoCodes();
  const createPromo = useCreatePromo();
  const updatePromo = useUpdatePromo();
  const deletePromo = useDeletePromo();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreatePromoPayload>(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  function setField<K extends keyof CreatePromoPayload>(key: K, value: CreatePromoPayload[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function resetForm() {
    setForm(emptyForm());
    setFormError(null);
    setFormSuccess(false);
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(promo: PromoCode) {
    setForm({
      code: promo.code,
      description: promo.description ?? "",
      discount_type: promo.discount_type,
      discount_value: promo.discount_value,
      applicable_product_ids: promo.applicable_product_ids ?? undefined,
      min_order_amount: promo.min_order_amount ?? undefined,
      max_discount_amount: promo.max_discount_amount ?? undefined,
      max_uses: promo.max_uses ?? undefined,
      starts_at: promo.starts_at ? promo.starts_at.slice(0, 16) : undefined,
      expires_at: promo.expires_at ? promo.expires_at.slice(0, 16) : undefined,
      is_active: promo.is_active,
    });
    setEditingId(promo.id);
    setShowForm(true);
    setFormError(null);
  }

  async function handleSubmit() {
    if (!form.code.trim()) { setFormError("Code is required"); return; }
    if (form.discount_type !== "free_shipping" && !form.discount_value) { setFormError("Discount value is required"); return; }

    const payload: CreatePromoPayload = {
      ...form,
      code: form.code.trim().toUpperCase(),
      applicable_product_ids:
        form.discount_type === "product" && form.applicable_product_ids?.length
          ? form.applicable_product_ids
          : undefined,
      max_discount_amount: form.discount_type === "percentage" ? form.max_discount_amount : undefined,
    };

    try {
      if (editingId) {
        await updatePromo.mutateAsync({ id: editingId, ...payload });
      } else {
        await createPromo.mutateAsync(payload);
      }
      setFormSuccess(true);
      setTimeout(resetForm, 1200);
    } catch (err: any) {
      setFormError(err?.message ?? "Failed to save promo code");
    }
  }

  const inputCls = "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400";

  return (
    <section className="space-y-6">
      <Link href="/settings" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Settings
      </Link>
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Promo Codes</h1>
        <p className="text-sm text-slate-500">
          Create and manage discount codes for customers at checkout.
        </p>
      </header>

      {/* Create / Edit Form */}
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">
            {editingId ? "Edit Promo Code" : "New Promo Code"}
          </h2>
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
            >
              <Plus className="h-4 w-4" /> New Promo Code
            </button>
          ) : (
            <button onClick={resetForm} className="text-sm text-slate-500 hover:text-slate-700">
              Cancel
            </button>
          )}
        </div>

        {showForm && (
          <div className="mt-5 space-y-4">
            {/* Code */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-slate-600">Code *</label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setField("code", e.target.value.toUpperCase())}
                  placeholder="e.g. SAVE20"
                  className={inputCls}
                />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => setField("code", generateCode())}
                  className="flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                  title="Generate random code"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Generate
                </button>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Description</label>
              <input
                type="text"
                value={form.description ?? ""}
                onChange={(e) => setField("description", e.target.value)}
                placeholder="Internal note about this code"
                className={inputCls}
              />
            </div>

            {/* Discount Type */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Discount type *</label>
                <select
                  value={form.discount_type}
                  onChange={(e) => setField("discount_type", e.target.value as DiscountType)}
                  className={inputCls}
                >
                  {(Object.entries(DISCOUNT_TYPE_LABELS) as [DiscountType, string][]).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>

              {/* Discount Value (hidden for free_shipping) */}
              {form.discount_type !== "free_shipping" && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    {form.discount_type === "percentage" ? "Discount %" : "Amount (GH₵)"} *
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.discount_value}
                    onChange={(e) => setField("discount_value", parseFloat(e.target.value) || 0)}
                    className={inputCls}
                  />
                </div>
              )}
            </div>

            {/* Percentage cap */}
            {form.discount_type === "percentage" && (
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Max discount amount (GH₵)</label>
                <input
                  type="number"
                  min={0}
                  value={form.max_discount_amount ?? ""}
                  onChange={(e) => setField("max_discount_amount", e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder="No cap"
                  className={inputCls}
                />
              </div>
            )}

            {/* Product IDs */}
            {form.discount_type === "product" && (
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Applicable product IDs (comma-separated UUIDs)</label>
                <input
                  type="text"
                  value={(form.applicable_product_ids ?? []).join(", ")}
                  onChange={(e) =>
                    setField(
                      "applicable_product_ids",
                      e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                    )
                  }
                  placeholder="uuid1, uuid2, ..."
                  className={inputCls}
                />
              </div>
            )}

            {/* Min order / Max uses */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Minimum order amount (GH₵)</label>
                <input
                  type="number"
                  min={0}
                  value={form.min_order_amount ?? ""}
                  onChange={(e) => setField("min_order_amount", e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder="No minimum"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Max total uses</label>
                <input
                  type="number"
                  min={1}
                  value={form.max_uses ?? ""}
                  onChange={(e) => setField("max_uses", e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="Unlimited"
                  className={inputCls}
                />
              </div>
            </div>

            {/* Date range */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Starts at</label>
                <input
                  type="datetime-local"
                  value={form.starts_at ?? ""}
                  onChange={(e) => setField("starts_at", e.target.value || undefined)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Expires at</label>
                <input
                  type="datetime-local"
                  value={form.expires_at ?? ""}
                  onChange={(e) => setField("expires_at", e.target.value || undefined)}
                  className={inputCls}
                />
              </div>
            </div>

            {/* Active toggle */}
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={form.is_active ?? true}
                onChange={(e) => setField("is_active", e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              <span className="text-sm text-slate-700">Active</span>
            </label>

            {formError && <p className="text-sm text-red-500">{formError}</p>}
            {formSuccess && <p className="text-sm text-green-600">Saved successfully!</p>}

            <button
              onClick={handleSubmit}
              disabled={createPromo.isPending || updatePromo.isPending}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {createPromo.isPending || updatePromo.isPending ? "Saving…" : editingId ? "Update Code" : "Create Code"}
            </button>
          </div>
        )}
      </div>

      {/* Promo Codes Table */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold">All Promo Codes</h2>
        </div>

        {isLoading ? (
          <div className="p-6 text-sm text-slate-500">Loading…</div>
        ) : promos.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">No promo codes yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3 text-left">Code</th>
                  <th className="px-5 py-3 text-left">Type</th>
                  <th className="px-5 py-3 text-left">Value</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-left">Uses</th>
                  <th className="px-5 py-3 text-left">Expires</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {promos.map((promo) => (
                  <tr key={promo.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-mono font-semibold tracking-wide">{promo.code}</td>
                    <td className="px-5 py-3 text-slate-600">{DISCOUNT_TYPE_LABELS[promo.discount_type]}</td>
                    <td className="px-5 py-3">{valueLabel(promo)}</td>
                    <td className="px-5 py-3">{statusBadge(promo)}</td>
                    <td className="px-5 py-3 text-slate-600">
                      {promo.used_count}{promo.max_uses !== null ? ` / ${promo.max_uses}` : ""}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {promo.expires_at ? new Date(promo.expires_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => updatePromo.mutate({ id: promo.id, is_active: !promo.is_active })}
                          className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
                        >
                          {promo.is_active ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          onClick={() => startEdit(promo)}
                          className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete promo code "${promo.code}"?`)) {
                              deletePromo.mutate(promo.id);
                            }
                          }}
                          className="rounded p-1 text-red-500 hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
