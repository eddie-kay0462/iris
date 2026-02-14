"use client";

import { useState } from "react";
import { DataTable, type Column } from "../../components/DataTable";
import { Pagination } from "../../components/Pagination";
import { SearchInput } from "../../components/SearchInput";
import {
  useInventory,
  useInventoryStats,
  type InventoryItem,
} from "@/lib/api/inventory";
import { AdjustStockModal } from "../../components/inventory/AdjustStockModal";
import { MovementHistory } from "../../components/inventory/MovementHistory";

function StatsCard({
  label,
  value,
  color = "text-slate-900",
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${color}`}>{value}</p>
    </div>
  );
}

export default function AdminInventoryPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
  const [showMovements, setShowMovements] = useState(false);

  const { data: stats, isLoading: statsLoading } = useInventoryStats();
  const { data, isLoading } = useInventory({
    search,
    low_stock: filter === "low" ? "true" : undefined,
    out_of_stock: filter === "out" ? "true" : undefined,
    page,
    limit: 20,
  });

  const columns: Column<InventoryItem>[] = [
    {
      key: "product",
      header: "Product",
      render: (row) => (
        <span className="font-medium">{row.product?.title || "—"}</span>
      ),
    },
    {
      key: "variant",
      header: "Variant",
      render: (row) => row.option1_value || "Default",
    },
    {
      key: "sku",
      header: "SKU",
      render: (row) => row.sku || "—",
    },
    {
      key: "inventory_quantity",
      header: "Stock",
      render: (row) => (
        <span
          className={
            row.inventory_quantity === 0
              ? "text-red-600 font-semibold"
              : row.inventory_quantity < 10
                ? "text-yellow-600 font-medium"
                : ""
          }
        >
          {row.inventory_quantity}
        </span>
      ),
    },
    {
      key: "price",
      header: "Value",
      render: (row) => {
        const val = (row.price || 0) * (row.inventory_quantity || 0);
        return val > 0 ? `₦${val.toLocaleString()}` : "—";
      },
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setAdjustItem(row);
          }}
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          Adjust
        </button>
      ),
    },
  ];

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Inventory</h1>
        <p className="text-sm text-slate-500">
          Monitor stock levels, reorder points, and warehouse status.
        </p>
      </header>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-lg bg-slate-100"
            />
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
              value={`₦${(stats?.totalValue ?? 0).toLocaleString()}`}
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
            placeholder="Search SKU or product..."
          />
        </div>
        <select
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="">All stock levels</option>
          <option value="low">Low stock (&lt;10)</option>
          <option value="out">Out of stock</option>
        </select>
        <button
          onClick={() => setShowMovements(!showMovements)}
          className="ml-auto text-sm text-slate-600 hover:text-slate-900"
        >
          {showMovements ? "Hide" : "Show"} movement history
        </button>
      </div>

      {/* Inventory table */}
      <DataTable
        columns={columns}
        rows={(data?.data as unknown as InventoryItem[]) || []}
        loading={isLoading}
      />

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

      {/* Adjust stock modal */}
      {adjustItem && (
        <AdjustStockModal
          item={adjustItem}
          onClose={() => setAdjustItem(null)}
        />
      )}
    </section>
  );
}
