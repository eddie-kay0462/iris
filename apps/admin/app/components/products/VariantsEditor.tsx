"use client";

import { useState, useEffect, useMemo } from "react";
import type { ProductVariant } from "@/lib/api/products";

// ─── Types ────────────────────────────────────────────────────────────────────

/** A locally-held variant draft (before the product exists in the DB) */
export interface LocalVariantDraft {
  localId: string;
  option1_name?: string;
  option1_value?: string;
  option2_name?: string;
  option2_value?: string;
  price?: number;
  compare_at_price?: number | null;
  sku?: string;
  image_id?: string;
  inventory_quantity: number;
  preorder_enabled?: boolean;
  preorder_limit?: number | null;
}

interface VariantsEditorProps {
  /** Saved variants from the DB (edit mode). */
  variants?: ProductVariant[];
  /** Local-only drafts shown before the product exists (create mode) */
  localVariants?: LocalVariantDraft[];
  /** Current product title (for auto SKU generation) */
  productTitle?: string;
  /** Product base price (to seed new variants) */
  basePrice?: number | string;
  /** Product category — drives the size set (Footwear → numeric sizes) */
  category?: string;
  onAdd: (variant: Record<string, unknown>) => void;
  onUpdate?: (variantId: string, data: Record<string, unknown>) => void;
  onDelete?: (variantId: string) => void;
  /** Update a local draft in place (create mode) */
  onUpdateLocal?: (localId: string, data: Record<string, unknown>) => void;
  onDeleteLocal?: (localId: string) => void;
}

// ─── Shared options ─────────────────────────────────────────────────────────

const APPAREL_SIZES = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "3XL", "One Size"];
const FOOTWEAR_SIZES = ["38", "39", "40", "41", "42", "43", "44", "45"];

const COLOR_OPTIONS = [
  // Blacks & greys
  "Black", "Black and Pink", "Obsidian", "Charcoal", "Grey", "White", "Cream", "Off-White",
  // Blues
  "Navy", "Blue", "Cobalt", "Teal",
  // Greens
  "Olive", "Olive Grove", "Sage", "Forest Green",
  // Browns & neutrals
  "Brown", "Coffee-Brown", "Clay", "Camel", "Tan", "Beige", "Stone", "Khaki",
  // Reds & pinks
  "Red", "Burgundy", "Pink", "Coral",
  // Warm tones
  "Tangerine", "Mustard", "Yellow",
];

function isFootwear(category?: string) {
  return (category || "").trim().toLowerCase() === "footwear";
}

function isNumericSize(s: string) {
  return /^\d+$/.test(s.trim());
}

/**
 * Normalise a colour value for display: case-insensitive input, but always
 * shown with the first letter of each word capitalised (e.g. "off-white" → "Off-White").
 */
function titleCaseColor(value: string) {
  return value.trim().toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function generateSku(title: string, color?: string, size?: string) {
  const titleParts = title.trim().split(/\s+/).filter(Boolean);
  let prefix = "PRD";
  if (titleParts.length === 1) {
    prefix = titleParts[0].substring(0, 3).toUpperCase();
  } else if (titleParts.length > 1) {
    prefix = titleParts.map((w) => w[0]).join("").toUpperCase().substring(0, 3);
  }

  const parts = [prefix];

  if (color) {
    const cmap: Record<string, string> = {
      Black: "BLK", "Black And Pink": "BKP", Obsidian: "OBS", Charcoal: "CHA",
      Grey: "GRY", White: "WHT", Cream: "CRM", "Off-White": "OFW",
      Navy: "NVY", Blue: "BLU", Cobalt: "COB", Teal: "TEL",
      Olive: "OLV", "Olive Grove": "OLG", Sage: "SGE", "Forest Green": "FGN",
      Brown: "BRN", "Coffee-Brown": "CFB", Clay: "CLY",
      Camel: "CML", Tan: "TAN", Beige: "BEI", Stone: "STN", Khaki: "KHK",
      Red: "RED", Burgundy: "BRG", Pink: "PNK", Coral: "CRL",
      Tangerine: "TNG", Mustard: "MUS", Yellow: "YLW", Green: "GRN",
    };
    const key = titleCaseColor(color);
    parts.push(cmap[key] || color.replace(/[^a-z0-9]/gi, "").substring(0, 3).toUpperCase());
  }

  if (size) parts.push(size.toUpperCase().replace(/\s+/g, ""));

  return parts.join("-");
}

// ─── Normalised row model (unifies saved variants + local drafts) ─────────────

interface Row {
  key: string;
  isLocal: boolean;
  color: string;
  size: string;
  price: string;
  compare_at_price: string;
  inventory_quantity: string;
  preorder_enabled: boolean;
  preorder_limit: string;
}

function buildRows(variants: ProductVariant[], localVariants: LocalVariantDraft[]): Row[] {
  const saved: Row[] = variants.map((v) => ({
    key: v.id,
    isLocal: false,
    color: v.option1_value || "",
    size: v.option2_value || "",
    price: v.price != null ? String(v.price) : "",
    compare_at_price: v.compare_at_price != null ? String(v.compare_at_price) : "",
    inventory_quantity: String(v.inventory_quantity ?? 0),
    preorder_enabled: v.preorder_enabled ?? false,
    preorder_limit: v.preorder_limit != null ? String(v.preorder_limit) : "",
  }));
  const drafts: Row[] = localVariants.map((v) => ({
    key: v.localId,
    isLocal: true,
    color: v.option1_value || "",
    size: v.option2_value || "",
    price: v.price != null ? String(v.price) : "",
    compare_at_price: v.compare_at_price != null ? String(v.compare_at_price) : "",
    inventory_quantity: String(v.inventory_quantity ?? 0),
    preorder_enabled: v.preorder_enabled ?? false,
    preorder_limit: v.preorder_limit != null ? String(v.preorder_limit) : "",
  }));
  return [...saved, ...drafts];
}

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

// ─── Small pill switch ────────────────────────────────────────────────────────

function Switch({
  on,
  mixed = false,
  small = false,
  onClick,
  title,
}: {
  on: boolean;
  mixed?: boolean;
  small?: boolean;
  onClick: () => void;
  title?: string;
}) {
  const track = small ? "h-4 w-7" : "h-5 w-9";
  const knob = small ? "h-3 w-3" : "h-3.5 w-3.5";
  const shift = small
    ? on ? "translate-x-3.5" : "translate-x-0.5"
    : on ? "translate-x-4" : "translate-x-0.5";
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`relative inline-flex ${track} shrink-0 items-center rounded-full transition-colors ${
        mixed ? "bg-slate-400" : on ? "bg-slate-900" : "bg-slate-200"
      }`}
    >
      <span className={`inline-block ${knob} transform rounded-full bg-white transition-transform ${shift}`} />
    </button>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function VariantsEditor({
  productTitle = "",
  basePrice,
  category,
  variants = [],
  localVariants = [],
  onAdd,
  onUpdate,
  onDelete,
  onUpdateLocal,
  onDeleteLocal,
}: VariantsEditorProps) {
  const footwear = isFootwear(category);

  const rows = useMemo(() => buildRows(variants, localVariants), [variants, localVariants]);

  // ── Controlled input mirror (stock / price / compare / limit) ──────────────
  // Rebuilds only when the *committed* values in props actually change, so typing
  // is never clobbered by a background refetch that returns the same data.
  const signature = useMemo(
    () =>
      JSON.stringify(
        rows.map((r) => [r.key, r.inventory_quantity, r.price, r.compare_at_price, r.preorder_limit]),
      ),
    [rows],
  );
  type DraftFields = { inventory_quantity: string; price: string; compare_at_price: string; preorder_limit: string };
  const initDraft = (rs: Row[]): Record<string, DraftFields> => {
    const d: Record<string, DraftFields> = {};
    for (const r of rs) {
      d[r.key] = {
        inventory_quantity: r.inventory_quantity,
        price: r.price,
        compare_at_price: r.compare_at_price,
        preorder_limit: r.preorder_limit,
      };
    }
    return d;
  };
  const [draft, setDraft] = useState<Record<string, DraftFields>>(() => initDraft(rows));
  useEffect(() => {
    setDraft(initDraft(rows));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  const patchDraft = (key: string, patch: Partial<DraftFields>) =>
    setDraft((d) => ({ ...d, [key]: { ...d[key], ...patch } }));

  // ── UI state ────────────────────────────────────────────────────────────────
  const [newColors, setNewColors] = useState<string[]>([]);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [openRowDetail, setOpenRowDetail] = useState<Set<string>>(new Set());
  const [colorEdits, setColorEdits] = useState<Record<string, { price?: string; compare?: string }>>({});
  const [addingColor, setAddingColor] = useState(false);
  const [pendingColor, setPendingColor] = useState("");

  // ── Commit helpers (route to saved vs local) ────────────────────────────────
  const commitRow = (row: Row, patch: Record<string, unknown>) => {
    if (row.isLocal) onUpdateLocal?.(row.key, patch);
    else onUpdate?.(row.key, patch);
  };
  const deleteRow = (row: Row) => {
    if (row.isLocal) onDeleteLocal?.(row.key);
    else onDelete?.(row.key);
  };

  // ── Grouping by colour ──────────────────────────────────────────────────────
  const universe = useMemo(() => {
    const present = uniq(rows.map((r) => r.size).filter(Boolean));
    if (footwear) {
      const nums = uniq([...FOOTWEAR_SIZES, ...present.filter(isNumericSize)]).sort(
        (a, b) => Number(a) - Number(b),
      );
      const nonNums = present.filter((s) => !isNumericSize(s));
      return [...nums, ...nonNums];
    }
    const extras = present.filter((s) => !APPAREL_SIZES.includes(s));
    return [...APPAREL_SIZES, ...extras];
  }, [rows, footwear]);

  const sizeRank = (s: string) => {
    const i = universe.indexOf(s);
    return i === -1 ? 999 : i;
  };

  const groups = useMemo(() => {
    const out: { key: string; display: string; rows: Row[] }[] = [];
    const seen = new Set<string>();
    for (const r of rows) {
      const k = r.color.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({
        key: k,
        display: r.color ? titleCaseColor(r.color) : "—",
        rows: rows
          .filter((x) => x.color.toLowerCase() === k)
          .sort((a, b) => sizeRank(a.size) - sizeRank(b.size)),
      });
    }
    for (const c of newColors) {
      const k = c.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({ key: k, display: titleCaseColor(c), rows: [] });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, newColors, universe]);

  // ── Seeds for new sizes in a group (price/compare/preorder inherit the group) ─
  const groupSeedPrice = (g: { key: string; rows: Row[] }) => {
    const edit = colorEdits[g.key]?.price;
    if (edit) return Number(edit);
    const prices = uniq(g.rows.map((r) => r.price)).filter(Boolean);
    if (prices.length === 1) return Number(prices[0]);
    return basePrice ? Number(basePrice) : 0;
  };
  const groupSeedCompare = (g: { key: string; rows: Row[] }) => {
    const edit = colorEdits[g.key]?.compare;
    if (edit) return Number(edit);
    const cs = uniq(g.rows.map((r) => r.compare_at_price)).filter(Boolean);
    if (cs.length === 1) return Number(cs[0]);
    return null;
  };
  const groupSeedPreorder = (g: { rows: Row[] }) =>
    g.rows.length > 0 && g.rows.every((r) => r.preorder_enabled);

  const addSize = (g: { key: string; display: string; rows: Row[] }, size: string) => {
    onAdd({
      option1_name: "Color",
      option1_value: g.display,
      option2_name: "Size",
      option2_value: size,
      price: groupSeedPrice(g),
      compare_at_price: groupSeedCompare(g),
      sku: generateSku(productTitle, g.display, size),
      inventory_quantity: 0,
      preorder_enabled: groupSeedPreorder(g),
      preorder_limit: null,
    });
  };

  // ── Colour-level fan-out (cascade + override) ───────────────────────────────
  const fanOutPrice = (g: { rows: Row[] }, raw: string) => {
    if (raw === "") return; // price is required — don't cascade an empty value
    const num = Number(raw);
    for (const r of g.rows) {
      if (String(r.price) !== String(num)) {
        commitRow(r, { price: num });
        patchDraft(r.key, { price: String(num) });
      }
    }
  };
  const fanOutCompare = (g: { rows: Row[] }, raw: string) => {
    const val = raw === "" ? null : Number(raw);
    for (const r of g.rows) {
      const cur = r.compare_at_price === "" ? null : Number(r.compare_at_price);
      if (cur !== val) {
        commitRow(r, { compare_at_price: val });
        patchDraft(r.key, { compare_at_price: val == null ? "" : String(val) });
      }
    }
  };
  const fanOutPreorder = (g: { rows: Row[] }, target: boolean) => {
    for (const r of g.rows) {
      if (r.preorder_enabled !== target) {
        commitRow(r, { preorder_enabled: target, ...(target ? {} : { preorder_limit: null }) });
        if (!target) patchDraft(r.key, { preorder_limit: "" });
      }
    }
  };

  // ── Add-colour handlers ─────────────────────────────────────────────────────
  const confirmAddColor = (value: string) => {
    const v = value.trim();
    if (!v) return;
    const k = v.toLowerCase();
    if (!groups.some((g) => g.key === k)) {
      setNewColors((prev) => [...prev, v]);
      setCollapsed((prev) => {
        const next = new Set(prev);
        next.delete(k);
        return next;
      });
    }
    setPendingColor("");
    setAddingColor(false);
  };

  const toggleCollapsed = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const toggleRowDetail = (key: string) =>
    setOpenRowDetail((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const usedColorNames = new Set(groups.map((g) => g.key));
  const nextFootwearSize = footwear
    ? String(Math.max(...universe.filter(isNumericSize).map(Number), 37) + 1)
    : "";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-slate-700">Variants</h3>
          <p className="text-[11px] text-slate-400">
            Pick a colour, then choose its sizes and stock. {footwear ? "Numeric sizes (footwear)." : ""}
          </p>
        </div>
      </div>

      {/* Colour groups */}
      <div className="space-y-3">
        {groups.map((g) => {
          const isOpen = !collapsed.has(g.key);
          const included = g.rows.map((r) => r.size);
          const addable = universe.filter((s) => !included.includes(s));

          // colour-level aggregates
          const prices = uniq(g.rows.map((r) => r.price)).filter(Boolean);
          const priceMixed = prices.length > 1;
          const derivedPrice = prices.length === 1 ? prices[0] : "";
          const compares = uniq(g.rows.map((r) => r.compare_at_price)).filter(Boolean);
          const compareMixed = compares.length > 1;
          const derivedCompare = compares.length === 1 ? compares[0] : "";
          const preAll = g.rows.length > 0 && g.rows.every((r) => r.preorder_enabled);
          const preNone = g.rows.every((r) => !r.preorder_enabled);
          const preMixed = !preAll && !preNone;

          const headerPrice = colorEdits[g.key]?.price ?? (priceMixed ? "" : derivedPrice);
          const headerCompare = colorEdits[g.key]?.compare ?? (compareMixed ? "" : derivedCompare);

          return (
            <div key={g.key} className="rounded-lg border border-slate-200 bg-white">
              {/* Header */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => toggleCollapsed(g.key)}
                  className="flex items-center gap-1.5 text-sm font-medium text-slate-800"
                >
                  <svg
                    className={`h-3.5 w-3.5 text-slate-400 transition-transform ${isOpen ? "rotate-90" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  {g.display}
                  <span className="text-xs font-normal text-slate-400">
                    ({included.length} {included.length === 1 ? "size" : "sizes"})
                  </span>
                </button>

                <div className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-2">
                  {/* Colour price */}
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-slate-400">GH₵</span>
                    <input
                      type="number"
                      placeholder={priceMixed ? "Mixed" : "Price"}
                      value={headerPrice}
                      onChange={(e) =>
                        setColorEdits((c) => ({ ...c, [g.key]: { ...c[g.key], price: e.target.value } }))
                      }
                      onBlur={(e) => {
                        fanOutPrice(g, e.target.value);
                        setColorEdits((c) => ({ ...c, [g.key]: { ...c[g.key], price: undefined } }));
                      }}
                      className="w-20 rounded border border-slate-200 px-2 py-1 text-sm"
                    />
                  </div>
                  {/* Colour compare-at */}
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-slate-400">Compare</span>
                    <input
                      type="number"
                      placeholder={compareMixed ? "Mixed" : "—"}
                      value={headerCompare}
                      onChange={(e) =>
                        setColorEdits((c) => ({ ...c, [g.key]: { ...c[g.key], compare: e.target.value } }))
                      }
                      onBlur={(e) => {
                        fanOutCompare(g, e.target.value);
                        setColorEdits((c) => ({ ...c, [g.key]: { ...c[g.key], compare: undefined } }));
                      }}
                      className="w-20 rounded border border-slate-200 px-2 py-1 text-sm"
                    />
                  </div>
                  {/* Colour pre-order */}
                  <div className="flex items-center gap-1.5" title="Toggle pre-orders for all sizes of this colour">
                    <span className="text-[11px] text-slate-500">Pre-order</span>
                    <Switch
                      on={preAll}
                      mixed={preMixed}
                      onClick={() => fanOutPreorder(g, !preAll)}
                    />
                  </div>
                  {/* Delete colour */}
                  <button
                    type="button"
                    onClick={() => {
                      if (g.rows.length && !confirm(`Remove all sizes of ${g.display}?`)) return;
                      g.rows.forEach((r) => deleteRow(r));
                      setNewColors((prev) => prev.filter((c) => c.toLowerCase() !== g.key));
                    }}
                    className="text-xs text-red-400 hover:text-red-600"
                  >
                    Remove
                  </button>
                </div>
              </div>

              {/* Body — sizes */}
              {isOpen && (
                <div className="border-t border-slate-100 px-3 py-2.5 space-y-2">
                  {/* Included size rows */}
                  {g.rows.length === 0 && (
                    <p className="text-[11px] italic text-slate-400">No sizes yet — add from below.</p>
                  )}
                  {g.rows.map((r) => {
                    const d = draft[r.key] ?? {
                      inventory_quantity: r.inventory_quantity,
                      price: r.price,
                      compare_at_price: r.compare_at_price,
                      preorder_limit: r.preorder_limit,
                    };
                    const overridden = priceMixed || (derivedPrice !== "" && d.price !== derivedPrice);
                    const detailOpen = openRowDetail.has(r.key);
                    return (
                      <div key={r.key} className="rounded border border-slate-100 bg-slate-50/60">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-2.5 py-1.5">
                          <span className="w-14 text-sm font-medium text-slate-700">{r.size || "—"}</span>

                          {/* Stock */}
                          <label className="flex items-center gap-1.5 text-xs text-slate-500">
                            Stock
                            <input
                              type="number"
                              min={0}
                              value={d.inventory_quantity}
                              onChange={(e) => patchDraft(r.key, { inventory_quantity: e.target.value })}
                              onBlur={() => {
                                if (String(d.inventory_quantity) !== String(r.inventory_quantity))
                                  commitRow(r, { inventory_quantity: Number(d.inventory_quantity) || 0 });
                              }}
                              className="w-16 rounded border border-slate-200 px-2 py-1 text-sm"
                            />
                          </label>

                          {/* Per-size pre-order */}
                          <div className="flex items-center gap-1.5" title="Pre-order for this size">
                            <span className="text-[11px] text-slate-400">Pre-order</span>
                            <Switch
                              small
                              on={r.preorder_enabled}
                              onClick={() =>
                                commitRow(r, {
                                  preorder_enabled: !r.preorder_enabled,
                                  ...(r.preorder_enabled ? { preorder_limit: null } : {}),
                                })
                              }
                            />
                          </div>

                          {r.preorder_enabled && (
                            <label className="flex items-center gap-1.5 text-[11px] text-slate-400">
                              Limit
                              <input
                                type="number"
                                min={1}
                                placeholder="∞"
                                value={d.preorder_limit}
                                onChange={(e) => patchDraft(r.key, { preorder_limit: e.target.value })}
                                onBlur={() => {
                                  if (String(d.preorder_limit) !== String(r.preorder_limit))
                                    commitRow(r, {
                                      preorder_limit: d.preorder_limit ? Number(d.preorder_limit) : null,
                                    });
                                }}
                                className="w-14 rounded border border-slate-200 px-1.5 py-1 text-sm"
                              />
                            </label>
                          )}

                          <button
                            type="button"
                            onClick={() => toggleRowDetail(r.key)}
                            className={`ml-auto text-[11px] ${overridden ? "text-slate-600 font-medium" : "text-slate-400"} hover:text-slate-700`}
                            title="Override price for this size"
                          >
                            {overridden ? `GH₵${d.price} ·` : ""} price
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (!r.isLocal && !confirm(`Remove ${g.display} · ${r.size}?`)) return;
                              deleteRow(r);
                            }}
                            className="text-slate-300 hover:text-red-500"
                            title="Remove size"
                          >
                            ✕
                          </button>
                        </div>

                        {/* Per-size price override */}
                        {detailOpen && (
                          <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 px-2.5 py-2">
                            <label className="flex items-center gap-1.5 text-xs text-slate-500">
                              Price GH₵
                              <input
                                type="number"
                                value={d.price}
                                onChange={(e) => patchDraft(r.key, { price: e.target.value })}
                                onBlur={() => {
                                  if (String(d.price) !== String(r.price))
                                    commitRow(r, { price: Number(d.price) || 0 });
                                }}
                                className="w-20 rounded border border-slate-200 px-2 py-1 text-sm"
                              />
                            </label>
                            <label className="flex items-center gap-1.5 text-xs text-slate-500">
                              Compare GH₵
                              <input
                                type="number"
                                value={d.compare_at_price}
                                onChange={(e) => patchDraft(r.key, { compare_at_price: e.target.value })}
                                onBlur={() => {
                                  const cur = r.compare_at_price;
                                  if (String(d.compare_at_price) !== String(cur))
                                    commitRow(r, {
                                      compare_at_price: d.compare_at_price ? Number(d.compare_at_price) : null,
                                    });
                                }}
                                className="w-20 rounded border border-slate-200 px-2 py-1 text-sm"
                              />
                            </label>
                            <span className="text-[11px] text-slate-400">Overrides the colour price for this size only.</span>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Add sizes */}
                  {(addable.length > 0 || footwear) && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[11px] text-slate-400">Add size:</span>
                      {addable.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => addSize(g, s)}
                          className="rounded border border-dashed border-slate-300 px-2 py-0.5 text-xs text-slate-500 hover:border-slate-500 hover:text-slate-800"
                        >
                          {s}
                        </button>
                      ))}
                      {footwear && (
                        <button
                          type="button"
                          onClick={() => addSize(g, nextFootwearSize)}
                          className="rounded border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 hover:bg-slate-200"
                        >
                          + Add {nextFootwearSize}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add colour */}
      {addingColor ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">New colour</p>
          <div className="flex flex-wrap gap-1">
            {COLOR_OPTIONS.filter((c) => !usedColorNames.has(c.toLowerCase())).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => confirmAddColor(c)}
                className="rounded border border-slate-200 px-2 py-0.5 text-xs text-slate-600 hover:border-slate-900 hover:bg-slate-900 hover:text-white"
              >
                {c}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              autoFocus
              placeholder="Other colour…"
              value={pendingColor}
              onChange={(e) => setPendingColor(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  confirmAddColor(pendingColor);
                }
              }}
              className="w-40 rounded border border-slate-200 px-2 py-1 text-sm"
            />
            <button
              type="button"
              onClick={() => confirmAddColor(pendingColor)}
              disabled={!pendingColor.trim()}
              className="rounded bg-slate-900 px-3 py-1 text-xs font-medium text-white disabled:opacity-40"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setAddingColor(false);
                setPendingColor("");
              }}
              className="text-xs text-slate-500 hover:text-slate-700"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAddingColor(true)}
          className="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-500 hover:border-slate-500 hover:text-slate-800"
        >
          + Add colour
        </button>
      )}
    </div>
  );
}
