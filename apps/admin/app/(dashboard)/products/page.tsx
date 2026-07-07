"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronRight, ChevronDown, Download, MoreHorizontal, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { StatusBadge } from "../../components/StatusBadge";
import { Pagination } from "../../components/Pagination";
import { SearchInput } from "../../components/SearchInput";
import { StatsCard } from "../../components/StatsCard";
import { AdjustStockModal } from "../../components/inventory/AdjustStockModal";
import { MovementHistory } from "../../components/inventory/MovementHistory";
import {
  useAdminProducts,
  useSetProductStatus,
  type Product,
  type ProductVariant,
} from "@/lib/api/products";

type ProductStatus = "draft" | "active" | "archived";

const STATUS_ACTIONS: { value: ProductStatus; label: string; hint: string }[] = [
  { value: "active", label: "Active", hint: "Live on the site" },
  { value: "draft", label: "Draft", hint: "Hidden from the site" },
  { value: "archived", label: "Archived", hint: "Discontinued, hidden" },
];

/** Per-row menu to quickly move a product between draft / active / archived. */
function RowStatusMenu({ product }: { product: Product }) {
  const [open, setOpen] = useState(false);
  const setStatus = useSetProductStatus();

  async function change(status: ProductStatus) {
    setOpen(false);
    if (status === product.status) return;
    try {
      await setStatus.mutateAsync({ id: product.id, status });
      const action = STATUS_ACTIONS.find((s) => s.value === status)!;
      toast.success(`"${product.title}" → ${action.label} (${action.hint.toLowerCase()})`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status", { duration: 6000 });
    }
  }

  return (
    <div className="relative inline-block text-left" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={setStatus.isPending}
        aria-label="Change status"
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
      >
        {setStatus.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
            <p className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-slate-400">Set status</p>
            {STATUS_ACTIONS.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => change(s.value)}
                className={`flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                  s.value === product.status ? "bg-slate-50" : ""
                }`}
              >
                <span className="font-medium text-slate-800">
                  {s.label}
                  {s.value === product.status && <span className="ml-1 text-xs text-slate-400">(current)</span>}
                </span>
                <span className="text-xs text-slate-400">{s.hint}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
import {
  useInventoryStats,
  type InventoryItem,
} from "@/lib/api/inventory";
import { getToken } from "@/lib/api/client";

function toInventoryItem(variant: ProductVariant, product: Product): InventoryItem {
  return {
    id: variant.id,
    product_id: variant.product_id,
    sku: variant.sku,
    option1_name: variant.option1_name,
    option1_value: variant.option1_value,
    option2_name: variant.option2_name,
    option2_value: variant.option2_value,
    inventory_quantity: variant.inventory_quantity,
    price: variant.price,
    product: { id: product.id, title: product.title, status: product.status },
  };
}

function variantLabel(variant: ProductVariant): string {
  return [variant.option1_value, variant.option2_value, variant.option3_value]
    .filter(Boolean)
    .join(" / ") || "Default";
}

function stockClass(qty: number): string {
  if (qty === 0) return "text-red-600 font-semibold";
  if (qty < 10) return "text-yellow-600 font-medium";
  return "";
}

export default function AdminProductsPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState<"all" | "active" | "draft" | "archived">("all");
  const [gender, setGender] = useState("");
  const [brand, setBrand] = useState<"" | "Unlikely Alliances" | "1NRI">("");
  const [category, setCategory] = useState("");
  const [productType, setProductType] = useState("");
  const [page, setPage] = useState(1);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
  const [showMovements, setShowMovements] = useState(false);

  const statusParam = statusTab === "all" ? undefined : statusTab;

  const SUBCATEGORY_MAP: Record<string, string[]> = {
    Tops: ["T-Shirts", "Shirts", "Sweatshirts & Tracksuits"],
    Bottoms: ["Shorts", "Pants"],
    Accessories: ["Bags", "Caps", "Socks"],
    Footwear: ["Mules"],
  };

  const { data, isLoading } = useAdminProducts({
    search,
    status: statusParam,
    gender: gender || undefined,
    vendor: brand || undefined,
    category: category || undefined,
    product_type: productType || undefined,
    page,
    limit: 20,
  });

  const { data: stats, isLoading: statsLoading } = useInventoryStats();

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleAdjustClose() {
    setAdjustItem(null);
    qc.invalidateQueries({ queryKey: ["admin-products"] });
  }

  const products: Product[] = (data?.data as unknown as Product[]) || [];

  const COL_COUNT = 7; // chevron | product | sku | status | price | stock | actions

  const tableColGroup = (
    <colgroup>
      <col style={{ width: 40 }} />
      <col />
      <col style={{ width: 150 }} />
      <col style={{ width: 110 }} />
      <col style={{ width: 120 }} />
      <col style={{ width: 90 }} />
      <col style={{ width: 90 }} />
    </colgroup>
  );

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Products</h1>
          <p className="text-sm text-slate-500">
            Manage product catalog, pricing, and inventory.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const url = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"}/export/products`;
              fetch(url, { headers: { Authorization: `Bearer ${getToken()}` } })
                .then((r) => r.blob())
                .then((blob) => {
                  const link = document.createElement("a");
                  link.href = URL.createObjectURL(blob);
                  link.download = `products-${new Date().toISOString().slice(0, 10)}.csv`;
                  link.click();
                });
            }}
            className="flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
          <Link
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            href="/products/new"
          >
            New product
          </Link>
        </div>
      </header>

      {/* Inventory stat cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-slate-100" />
          ))
        ) : (
          <>
            <StatsCard label="Total SKUs" value={stats?.totalSkus ?? 0} />
            <StatsCard
              label="Low Stock"
              value={stats?.lowStock ?? 0}
              color="text-yellow-600"
            />
            <StatsCard
              label="Out of Stock"
              value={stats?.outOfStock ?? 0}
              color="text-red-600"
            />
            <StatsCard
              label="Total Value"
              value={`GH₵${(stats?.totalValue ?? 0).toLocaleString()}`}
            />
          </>
        )}
      </div>

      {/* Search + brand switch + gender filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-64">
          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Search products..."
          />
        </div>

        {/* 3-state brand switch */}
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
          {(["", "1NRI", "Unlikely Alliances"] as const).map((b) => (
            <button
              key={b || "both"}
              onClick={() => { setBrand(b); setPage(1); }}
              className={`rounded-md px-3 py-1 text-sm font-medium transition-colors whitespace-nowrap ${
                brand === b
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {b === "" ? "Both" : b}
            </button>
          ))}
        </div>

        <select
          value={gender}
          onChange={(e) => {
            setGender(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="">All genders</option>
          <option value="men">Men</option>
          <option value="women">Women</option>
          <option value="all">All</option>
        </select>

        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setProductType("");
            setPage(1);
          }}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="">All categories</option>
          <option value="Tops">Tops</option>
          <option value="Bottoms">Bottoms</option>
          <option value="Accessories">Accessories</option>
          <option value="Footwear">Footwear</option>
        </select>

        {category && (
          <select
            value={productType}
            onChange={(e) => {
              setProductType(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">All types</option>
            {(SUBCATEGORY_MAP[category] ?? []).map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        )}

        <button
          onClick={() => setShowMovements(!showMovements)}
          className="ml-auto text-sm text-slate-600 hover:text-slate-900"
        >
          {showMovements ? "Hide" : "Show"} movement history
        </button>
      </div>

      {/* Status tab bar */}
      <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 w-fit">
        {(["all", "active", "draft", "archived"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => { setStatusTab(tab); setPage(1); }}
            className={`rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
              statusTab === tab
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab === "all" ? "All" : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Products accordion table */}
      <div className="overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full border-collapse text-sm" style={{ tableLayout: "fixed" }}>
          {tableColGroup}
          <thead className="bg-slate-100 text-left text-slate-600">
            <tr>
              <th className="w-8 px-3 py-3" />
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">SKU</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Stock</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse border-t border-slate-200">
                  {Array.from({ length: COL_COUNT }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 w-3/4 rounded bg-slate-200" />
                    </td>
                  ))}
                </tr>
              ))
            ) : products.length === 0 ? (
              <tr>
                <td
                  colSpan={COL_COUNT}
                  className="px-4 py-6 text-center text-slate-500"
                >
                  No products found.
                </td>
              </tr>
            ) : (
              products.map((product) => {
                const isExpanded = expandedIds.has(product.id);
                const totalStock =
                  product.product_variants?.reduce(
                    (sum, v) => sum + (v.inventory_quantity || 0),
                    0,
                  ) ?? 0;

                return (
                  <>
                    {/* Product row */}
                    <tr
                      key={product.id}
                      className="border-t border-slate-200 hover:bg-slate-50"
                    >
                      <td className="px-3 py-3">
                        <button
                          onClick={() => toggleExpanded(product.id)}
                          className="rounded p-0.5 text-slate-400 hover:text-slate-700"
                          aria-label={isExpanded ? "Collapse" : "Expand"}
                        >
                          <motion.span
                            animate={{ rotate: isExpanded ? 90 : 0 }}
                            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
                            style={{ display: "inline-flex" }}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </motion.span>
                        </button>
                      </td>
                      <td
                        className="cursor-pointer px-4 py-3"
                        onClick={() => router.push(`/products/${product.id}`)}
                      >
                        <div className="flex items-center gap-3">
                          {product.product_images?.[0] ? (
                            <img
                              src={product.product_images[0].src}
                              alt={product.title}
                              className="h-10 w-10 rounded object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded bg-slate-100 text-xs text-slate-400">
                              No img
                            </div>
                          )}
                          <div>
                            <span className="font-medium">{product.title}</span>
                            {product.product_type && (
                              <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                                {product.product_type}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td
                        className="cursor-pointer px-4 py-3 text-slate-600"
                        onClick={() => router.push(`/products/${product.id}`)}
                      >
                        {product.product_variants?.[0]?.sku || "—"}
                      </td>
                      <td
                        className="cursor-pointer px-4 py-3"
                        onClick={() => router.push(`/products/${product.id}`)}
                      >
                        <StatusBadge status={product.status} />
                      </td>
                      <td
                        className="cursor-pointer px-4 py-3"
                        onClick={() => router.push(`/products/${product.id}`)}
                      >
                        {product.base_price != null
                          ? `GH₵${product.base_price.toLocaleString()}`
                          : "—"}
                      </td>
                      <td
                        className="cursor-pointer px-4 py-3"
                        onClick={() => router.push(`/products/${product.id}`)}
                      >
                        <span
                          className={totalStock === 0 ? "font-medium text-red-600" : ""}
                        >
                          {totalStock}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <RowStatusMenu product={product} />
                      </td>
                    </tr>

                    {/* Variant sub-rows — animated accordion */}
                    <tr key={`${product.id}-variants`} className="border-0">
                      <td colSpan={COL_COUNT} className="p-0">
                        <AnimatePresence initial={false}>
                          {isExpanded && (
                            <motion.div
                              key="variants"
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                              style={{ overflow: "hidden" }}
                            >
                              <table className="w-full border-collapse text-sm" style={{ tableLayout: "fixed" }}>
                                {tableColGroup}
                                <tbody>
                                  {product.product_variants?.length ? (
                                    product.product_variants.map((variant) => (
                                      <tr
                                        key={variant.id}
                                        className="border-t border-slate-100 bg-slate-50"
                                      >
                                        <td className="px-3 py-2" />
                                        <td className="py-2 pl-[68px] pr-4 text-slate-500">
                                          {variantLabel(variant)}
                                        </td>
                                        <td className="px-4 py-2 text-slate-500">
                                          {variant.sku || "—"}
                                        </td>
                                        <td className="px-4 py-2" />
                                        <td className="px-4 py-2 text-slate-600">
                                          {variant.price != null
                                            ? `GH₵${variant.price.toLocaleString()}`
                                            : "—"}
                                        </td>
                                        <td className="px-4 py-2">
                                          <span className={stockClass(variant.inventory_quantity)}>
                                            {variant.inventory_quantity}
                                          </span>
                                        </td>
                                        <td className="px-4 py-2 text-right">
                                          <button
                                            onClick={() =>
                                              setAdjustItem(toInventoryItem(variant, product))
                                            }
                                            className="text-xs text-blue-600 hover:text-blue-800"
                                          >
                                            Adjust
                                          </button>
                                        </td>
                                      </tr>
                                    ))
                                  ) : (
                                    <tr className="border-t border-slate-100 bg-slate-50">
                                      <td />
                                      <td
                                        colSpan={COL_COUNT - 1}
                                        className="px-4 py-2 text-xs text-slate-400"
                                      >
                                        No variants
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </td>
                    </tr>
                  </>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {data && (
        <Pagination
          page={data.page}
          totalPages={data.totalPages}
          onPageChange={setPage}
        />
      )}

      {/* Movement history */}
      {showMovements && (
        <div className="rounded-lg border border-slate-200 p-4">
          <h3 className="mb-3 text-sm font-medium text-slate-700">
            Recent Stock Movements
          </h3>
          <MovementHistory />
        </div>
      )}

      {adjustItem && (
        <AdjustStockModal item={adjustItem} onClose={handleAdjustClose} />
      )}
    </section>
  );
}
