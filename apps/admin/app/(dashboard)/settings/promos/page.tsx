"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Trash2, Plus, RefreshCw, Receipt, X } from "lucide-react";
import {
  usePromoCodes,
  useCreatePromo,
  useUpdatePromo,
  useDeletePromo,
  DiscountType,
  PromoCode,
  CreatePromoPayload,
  PairingTier,
  SalesChannel,
} from "@/lib/api/promos";
import ProductPicker from "./ProductPicker";

function generateCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

const DISCOUNT_TYPE_LABELS: Record<DiscountType, string> = {
  fixed: "Fixed amount (GH₵)",
  percentage: "Percentage (%)",
  free_shipping: "Free shipping",
  product: "Product discount (GH₵)",
  pairing: "Bundle / pairing rule (automatic)",
  volume: "Volume discount (item count)",
};

const CHANNEL_LABELS: Record<SalesChannel, string> = {
  online: "Online store",
  popup: "Pop-up sales",
  walkin: "Walk-in sales",
};

const ALL_CHANNELS: SalesChannel[] = ["online", "popup", "walkin"];

function statusBadge(promo: PromoCode) {
  const now = new Date();
  if (!promo.is_active) return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">Inactive</span>;
  if (promo.expires_at && new Date(promo.expires_at) < now) return <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-600">Expired</span>;
  if (promo.max_uses !== null && promo.used_count >= promo.max_uses) return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-600">Used up</span>;
  if (promo.starts_at && new Date(promo.starts_at) > now) return <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-600">Scheduled</span>;
  return <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">Active</span>;
}

function tierLabel(t: PairingTier) {
  const value = t.value_type === "percentage" ? `${t.value}%` : `GH₵ ${t.value}`;
  const cap = t.max_discount_amount ? ` (max GH₵ ${t.max_discount_amount})` : "";
  return `${t.min_paired_count}+ → ${value}${cap}`;
}

function valueLabel(promo: PromoCode) {
  switch (promo.discount_type) {
    case "fixed": return `GH₵ ${promo.discount_value} off`;
    case "percentage": return `${promo.discount_value}% off${promo.max_discount_amount ? ` (max GH₵ ${promo.max_discount_amount})` : ""}`;
    case "free_shipping": return "Free shipping";
    case "product": return `GH₵ ${promo.discount_value} off (products)`;
    case "pairing":
    case "volume":
      return (promo.promo_pairing_tiers ?? []).length
        ? (promo.promo_pairing_tiers ?? []).map(tierLabel).join(", ")
        : "No tiers set";
  }
}

const emptyForm = (): CreatePromoPayload => ({
  code: "",
  description: "",
  discount_type: "fixed",
  discount_value: 0,
  is_active: true,
  channels: [...ALL_CHANNELS],
});

const emptyTier = (min: number): PairingTier => ({
  min_paired_count: min,
  value_type: "percentage",
  value: 10,
  max_discount_amount: null,
});

export default function PromosSettingsPage() {
  const { data: promos = [], isLoading } = usePromoCodes();
  const createPromo = useCreatePromo();
  const updatePromo = useUpdatePromo();
  const deletePromo = useDeletePromo();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreatePromoPayload>(emptyForm());
  const [tiers, setTiers] = useState<PairingTier[]>([emptyTier(1)]);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const isPairing = form.discount_type === "pairing";
  const isVolume = form.discount_type === "volume";
  // Both types carry their value in promo_pairing_tiers rather than discount_value.
  const isTiered = isPairing || isVolume;
  // A volume rule chooses its own trigger; a pairing rule always auto-applies.
  const autoApply = isVolume ? form.auto_apply !== false : isPairing;

  function setField<K extends keyof CreatePromoPayload>(key: K, value: CreatePromoPayload[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setTier(index: number, patch: Partial<PairingTier>) {
    setTiers((prev) => prev.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  }

  function toggleChannel(channel: SalesChannel) {
    const current = form.channels ?? [...ALL_CHANNELS];
    const next = current.includes(channel)
      ? current.filter((c) => c !== channel)
      : [...current, channel];
    setField("channels", next);
  }

  function resetForm() {
    setForm(emptyForm());
    setTiers([emptyTier(1)]);
    setFormError(null);
    setFormSuccess(false);
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(promo: PromoCode) {
    setForm({
      code: promo.code ?? "",
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
      channels: promo.channels ?? [...ALL_CHANNELS],
      auto_apply: promo.auto_apply,
      anchor_product_id: promo.anchor_product_id ?? undefined,
      pairing_basis: promo.pairing_basis ?? "units",
      applies_to: promo.applies_to ?? "anchor",
    });
    setTiers(
      (promo.promo_pairing_tiers ?? []).length
        ? [...promo.promo_pairing_tiers].sort((a, b) => a.min_paired_count - b.min_paired_count)
        : [emptyTier(1)],
    );
    setEditingId(promo.id);
    setShowForm(true);
    setFormError(null);
  }

  async function handleSubmit() {
    if (isTiered) {
      if (isPairing && !form.anchor_product_id) { setFormError("Pick the anchor product this rule is built around"); return; }
      if (tiers.length === 0) { setFormError("Add at least one tier"); return; }
      const thresholds = tiers.map((t) => t.min_paired_count);
      if (new Set(thresholds).size !== thresholds.length) {
        setFormError("Each tier needs a distinct item count"); return;
      }
      if (tiers.some((t) => t.value_type === "percentage" && t.value > 100)) {
        setFormError("A percentage tier cannot exceed 100%"); return;
      }
      // A volume rule that waits for a code still needs one.
      if (isVolume && !autoApply && !form.code?.trim()) {
        setFormError("A rule that does not apply automatically needs a code"); return;
      }
    } else {
      if (!form.code?.trim()) { setFormError("Code is required"); return; }
      if (form.discount_type !== "free_shipping" && !form.discount_value) { setFormError("Discount value is required"); return; }
    }

    if (!form.channels?.length) { setFormError("Pick at least one sales channel"); return; }

    const payload: CreatePromoPayload = {
      ...form,
      code: autoApply ? undefined : form.code?.trim().toUpperCase(),
      applicable_product_ids:
        (form.discount_type === "product" || isVolume) && form.applicable_product_ids?.length
          ? form.applicable_product_ids
          : undefined,
      max_discount_amount: form.discount_type === "percentage" ? form.max_discount_amount : undefined,
      auto_apply: isVolume ? autoApply : undefined,
      anchor_product_id: isPairing ? form.anchor_product_id : undefined,
      pairing_basis: isPairing ? (form.pairing_basis ?? "units") : undefined,
      applies_to: isPairing ? (form.applies_to ?? "anchor") : undefined,
      tiers: isTiered ? tiers : undefined,
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
  const labelCls = "mb-1 block text-xs font-medium text-slate-600";

  return (
    <section className="space-y-6">
      <Link href="/settings" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Settings
      </Link>
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Discounts &amp; Promo Codes</h1>
          <p className="text-sm text-slate-500">
            Codes and automatic bundle rules, applied across the online store, pop-up sales and walk-in sales.
          </p>
        </div>
        <Link
          href="/settings/promos/redemptions"
          className="flex shrink-0 items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
        >
          <Receipt className="h-4 w-4" /> Usage log
        </Link>
      </header>

      {/* Create / Edit Form */}
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">
            {editingId ? "Edit discount" : "New discount"}
          </h2>
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
            >
              <Plus className="h-4 w-4" /> New discount
            </button>
          ) : (
            <button onClick={resetForm} className="text-sm text-slate-500 hover:text-slate-700">
              Cancel
            </button>
          )}
        </div>

        {showForm && (
          <div className="mt-5 space-y-4">
            {/* Discount Type first — it decides what the rest of the form asks for */}
            <div>
              <label className={labelCls}>Discount type *</label>
              <select
                value={form.discount_type}
                onChange={(e) => setField("discount_type", e.target.value as DiscountType)}
                className={inputCls}
              >
                {(Object.entries(DISCOUNT_TYPE_LABELS) as [DiscountType, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
              {isPairing && (
                <p className="mt-1.5 text-xs text-slate-500">
                  A bundle rule applies on its own — no code to type. When the anchor product is in a
                  basket, the discount level is set by how many other items are alongside it.
                </p>
              )}
              {isVolume && (
                <p className="mt-1.5 text-xs text-slate-500">
                  The discount level is set by how many individual items are in the basket — three of
                  the same product counts as three. No anchor product needed.
                </p>
              )}
            </div>

            {/* Trigger — a volume rule can fire on its own or wait for a code */}
            {isVolume && (
              <label className="flex cursor-pointer items-start gap-2">
                <input
                  type="checkbox"
                  checked={autoApply}
                  onChange={(e) => setField("auto_apply", e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300"
                />
                <span className="text-sm text-slate-700">
                  Apply automatically
                  <span className="ml-1 text-xs text-slate-500">
                    (no code needed — uncheck to require one)
                  </span>
                </span>
              </label>
            )}

            {/* Code — rules that auto-apply have none */}
            {!autoApply && (
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className={labelCls}>Code *</label>
                  <input
                    type="text"
                    value={form.code ?? ""}
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
            )}

            {/* Description */}
            <div>
              <label className={labelCls}>
                {isTiered ? "Name *" : "Description"}
              </label>
              <input
                type="text"
                value={form.description ?? ""}
                onChange={(e) => setField("description", e.target.value)}
                placeholder={isPairing ? "e.g. Signature Tee bundle" : isVolume ? "e.g. Buy more, save more" : "Internal note about this code"}
                className={inputCls}
              />
            </div>

            {/* Value — hidden for free_shipping and tiered rules (tiers carry the value) */}
            {!isTiered && form.discount_type !== "free_shipping" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>
                    {form.discount_type === "percentage" ? "Discount %" : "Amount (GH₵)"} *
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.discount_value ?? 0}
                    onChange={(e) => setField("discount_value", parseFloat(e.target.value) || 0)}
                    className={inputCls}
                  />
                </div>
                {form.discount_type === "percentage" && (
                  <div>
                    <label className={labelCls}>Max discount amount (GH₵)</label>
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
              </div>
            )}

            {/* Product-type targeting */}
            {form.discount_type === "product" && (
              <div>
                <label className={labelCls}>Applies to these products</label>
                <ProductPicker
                  multiple
                  value={form.applicable_product_ids ?? []}
                  onChange={(ids) => setField("applicable_product_ids", ids)}
                />
              </div>
            )}

            {/* ── Tiered rule configuration (pairing, volume) ───────────────── */}
            {isTiered && (
              <div className="space-y-4 rounded-md border border-slate-200 bg-slate-50/60 p-4">
                {isVolume && (
                  <div>
                    <label className={labelCls}>Count only these products</label>
                    <ProductPicker
                      multiple
                      value={form.applicable_product_ids ?? []}
                      onChange={(ids) => setField("applicable_product_ids", ids)}
                      placeholder="Leave empty to count everything in the basket"
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      Narrows what <em>counts</em> toward the threshold. The discount always comes off
                      the whole basket.
                    </p>
                  </div>
                )}

                {isPairing && (
                <div>
                  <label className={labelCls}>Anchor product *</label>
                  <ProductPicker
                    value={form.anchor_product_id ? [form.anchor_product_id] : []}
                    onChange={(ids) => setField("anchor_product_id", ids[0])}
                    placeholder="Which product triggers this bundle?"
                  />
                </div>
                )}

                {isPairing && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>Count paired items by</label>
                    <select
                      value={form.pairing_basis ?? "units"}
                      onChange={(e) => setField("pairing_basis", e.target.value as "units" | "products")}
                      className={inputCls}
                    >
                      <option value="units">Total quantity of other items</option>
                      <option value="products">Number of different other products</option>
                    </select>
                    <p className="mt-1 text-xs text-slate-500">
                      {form.pairing_basis === "products"
                        ? "Anchor + 2× hoodie counts as 1."
                        : "Anchor + 2× hoodie counts as 2."}
                    </p>
                  </div>
                  <div>
                    <label className={labelCls}>Discount applies to</label>
                    <select
                      value={form.applies_to ?? "anchor"}
                      onChange={(e) => setField("applies_to", e.target.value as "anchor" | "cart")}
                      className={inputCls}
                    >
                      <option value="anchor">The anchor product only</option>
                      <option value="cart">The whole basket</option>
                    </select>
                    <p className="mt-1 text-xs text-slate-500">
                      {form.applies_to === "cart"
                        ? "Everything in the basket is discounted."
                        : "Other items stay at full price."}
                    </p>
                  </div>
                </div>
                )}

                {/* Tier editor — thresholds are paired items, or cart units */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className={`${labelCls} mb-0`}>Tiers *</label>
                    <button
                      type="button"
                      onClick={() =>
                        setTiers((prev) => [
                          ...prev,
                          emptyTier(Math.max(0, ...prev.map((t) => t.min_paired_count)) + 1),
                        ])
                      }
                      className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add tier
                    </button>
                  </div>

                  <div className="space-y-2">
                    {tiers.map((tier, i) => (
                      <div key={i} className="flex flex-wrap items-end gap-2 rounded-md border border-slate-200 bg-white p-2.5">
                        <div className="w-28">
                          <label className="mb-1 block text-[11px] text-slate-500">
                            {isVolume ? "Items" : "Other items"}
                          </label>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min={1}
                              value={tier.min_paired_count}
                              onChange={(e) => setTier(i, { min_paired_count: parseInt(e.target.value) || 1 })}
                              className="w-16 rounded-md border border-slate-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                            />
                            <span className="text-xs text-slate-400">or more</span>
                          </div>
                        </div>
                        <div className="w-32">
                          <label className="mb-1 block text-[11px] text-slate-500">Discount</label>
                          <select
                            value={tier.value_type}
                            onChange={(e) => setTier(i, { value_type: e.target.value as "percentage" | "fixed" })}
                            className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                          >
                            <option value="percentage">Percentage</option>
                            <option value="fixed">Fixed GH₵</option>
                          </select>
                        </div>
                        <div className="w-24">
                          <label className="mb-1 block text-[11px] text-slate-500">
                            {tier.value_type === "percentage" ? "%" : "GH₵"}
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={tier.value}
                            onChange={(e) => setTier(i, { value: parseFloat(e.target.value) || 0 })}
                            className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                          />
                        </div>
                        <div className="w-28">
                          <label className="mb-1 block text-[11px] text-slate-500">Cap (GH₵)</label>
                          <input
                            type="number"
                            min={0}
                            value={tier.max_discount_amount ?? ""}
                            onChange={(e) =>
                              setTier(i, {
                                max_discount_amount: e.target.value ? parseFloat(e.target.value) : null,
                              })
                            }
                            placeholder="None"
                            className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setTiers((prev) => prev.filter((_, idx) => idx !== i))}
                          disabled={tiers.length === 1}
                          className="ml-auto rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                          title="Remove tier"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    The highest tier the basket qualifies for is the one that applies.
                  </p>
                </div>
              </div>
            )}

            {/* Channels */}
            <div>
              <label className={labelCls}>Available on *</label>
              <div className="flex flex-wrap gap-4">
                {ALL_CHANNELS.map((c) => (
                  <label key={c} className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={(form.channels ?? []).includes(c)}
                      onChange={() => toggleChannel(c)}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    <span className="text-sm text-slate-700">{CHANNEL_LABELS[c]}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Min order / Max uses */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Minimum order amount (GH₵)</label>
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
                <label className={labelCls}>Max total uses</label>
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
                <label className={labelCls}>Starts at</label>
                <input
                  type="datetime-local"
                  value={form.starts_at ?? ""}
                  onChange={(e) => setField("starts_at", e.target.value || undefined)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Expires at</label>
                <input
                  type="datetime-local"
                  value={form.expires_at ?? ""}
                  onChange={(e) => setField("expires_at", e.target.value || undefined)}
                  className={inputCls}
                />
              </div>
            </div>

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
              {createPromo.isPending || updatePromo.isPending
                ? "Saving…"
                : editingId
                  ? "Update"
                  : "Create"}
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold">All discounts</h2>
        </div>

        {isLoading ? (
          <div className="p-6 text-sm text-slate-500">Loading…</div>
        ) : promos.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">No discounts yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3 text-left">Code / name</th>
                  <th className="px-5 py-3 text-left">Type</th>
                  <th className="px-5 py-3 text-left">Value</th>
                  <th className="px-5 py-3 text-left">Channels</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-left">Uses</th>
                  <th className="px-5 py-3 text-left">Expires</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {promos.map((promo) => (
                  <tr key={promo.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      {promo.code ? (
                        <span className="font-mono font-semibold tracking-wide">{promo.code}</span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <span className="font-medium">{promo.description || "Untitled rule"}</span>
                          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-indigo-600">
                            Auto
                          </span>
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate-600">{DISCOUNT_TYPE_LABELS[promo.discount_type]}</td>
                    <td className="px-5 py-3 text-slate-600">{valueLabel(promo)}</td>
                    <td className="px-5 py-3 text-xs text-slate-500">
                      {(promo.channels ?? ALL_CHANNELS).length === 3
                        ? "All"
                        : (promo.channels ?? []).map((c) => CHANNEL_LABELS[c].split(" ")[0]).join(", ")}
                    </td>
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
                            if (confirm(`Delete "${promo.code || promo.description || "this rule"}"?`)) {
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
