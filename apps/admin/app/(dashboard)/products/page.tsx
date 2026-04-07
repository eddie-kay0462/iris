"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronRight, ChevronDown, Download } from "lucide-react";
import { StatusBadge } from "../../components/StatusBadge";
import { Pagination } from "../../components/Pagination";
import { SearchInput } from "../../components/SearchInput";
import { StatsCard } from "../../components/StatsCard";
import { AdjustStockModal } from "../../components/inventory/AdjustStockModal";
import { MovementHistory } from "../../components/inventory/MovementHistory";
import {
  useAdminProducts,
  type Product,
  type ProductVariant,
} from "@/lib/api/products";
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
  const [status, setStatus] = useState("");
  const [gender, setGender] = useState("");
  const [page, setPage] = useState(1);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
  const [showMovements, setShowMovements] = useState(false);

  const { data, isLoading } = useAdminProducts({
    search,
    status: status || undefined,
    gender: gender || undefined,
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

      {/* Filters */}
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
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
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
        <button
          onClick={() => setShowMovements(!showMovements)}
          className="ml-auto text-sm text-slate-600 hover:text-slate-900"
        >
          {showMovements ? "Hide" : "Show"} movement history
        </button>
      </div>

      {/* Products accordion table */}
      <div className="overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-slate-100 text-left text-slate-600">
            <tr>
              <th className="w-8 px-3 py-3" />
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">SKU</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Stock</th>
              <th className="px-4 py-3" />
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
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
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
                          <span className="font-medium">{product.title}</span>
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
                      <td className="px-4 py-3" />
                    </tr>

                    {/* Variant sub-rows */}
                    {isExpanded &&
                      (product.product_variants?.length ? (
                        product.product_variants.map((variant) => (
                          <tr
                            key={variant.id}
                            className="border-t border-slate-100 bg-slate-50"
                          >
                            <td className="px-3 py-2" />
                            <td className="px-4 py-2 pl-14 text-slate-600">
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
                            <td className="px-4 py-2">
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
                      ))}
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
