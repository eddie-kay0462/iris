"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminCustomers, useCustomerStats, type AdminCustomer } from "@/lib/api/orders";
import { DataTable, type Column } from "../../components/DataTable";
import { SearchInput } from "../../components/SearchInput";
import { Pagination } from "../../components/Pagination";
import { StatsCard } from "../../components/StatsCard";
import { Users, UserPlus, ShoppingCart, Crown } from "lucide-react";

type Segment = "all" | "new" | "returning";

const columns: Column<AdminCustomer>[] = [
  {
    key: "name",
    header: "Customer",
    render: (row) => {
      const name = [row.first_name, row.last_name].filter(Boolean).join(" ");
      return (
        <div>
          <p className="font-medium text-slate-900">{name || "—"}</p>
          <p className="text-xs text-slate-500">{row.email}</p>
        </div>
      );
    },
  },
  {
    key: "order_count",
    header: "Orders",
    render: (row) => String(row.order_count),
  },
  {
    key: "total_spent",
    header: "Total Spent",
    render: (row) =>
      `GH₵${row.total_spent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  },
  {
    key: "last_order_date",
    header: "Last Order",
    render: (row) =>
      row.last_order_date
        ? new Date(row.last_order_date).toLocaleDateString()
        : "—",
  },
  {
    key: "created_at",
    header: "Joined",
    render: (row) => new Date(row.created_at).toLocaleDateString(),
  },
];

export default function AdminCustomersPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [segment, setSegment] = useState<Segment>("all");

  const segmentFilters =
    segment === "new"
      ? { max_orders: 1 }
      : segment === "returning"
        ? { min_orders: 2 }
        : {};

  const { data, isLoading } = useAdminCustomers({ search, page, ...segmentFilters });
  const { data: stats } = useCustomerStats();

  const segments: { key: Segment; label: string }[] = [
    { key: "all", label: "All" },
    { key: "new", label: "New (≤1 order)" },
    { key: "returning", label: "Returning (2+)" },
  ];

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Customers</h1>
        <p className="text-sm text-slate-500">
          {data ? `${data.total} registered customer${data.total !== 1 ? "s" : ""}` : "Manage customer profiles and engagement history."}
        </p>
      </header>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          label="Total Customers"
          value={String(stats?.totalCustomers ?? "—")}
          icon={Users}
        />
        <StatsCard
          label="New This Month"
          value={String(stats?.newThisMonth ?? "—")}
          icon={UserPlus}
        />
        <StatsCard
          label="Avg Order Value"
          value={
            stats
              ? `GH₵${stats.avgOrderValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : "—"
          }
          icon={ShoppingCart}
        />
        <StatsCard
          label="Top Spender"
          value={stats?.topSpender?.name ?? "—"}
          icon={Crown}
          helperText={
            stats?.topSpender
              ? `GH₵${stats.topSpender.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : undefined
          }
        />
      </div>

      {/* Segment filter + search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-slate-200 overflow-hidden">
          {segments.map((s) => (
            <button
              key={s.key}
              onClick={() => {
                setSegment(s.key);
                setPage(1);
              }}
              className={`px-3 py-1.5 text-sm transition-colors ${
                segment === s.key
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="flex-1 min-w-[200px]">
          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Search by name or email..."
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={data?.data || []}
        loading={isLoading}
        emptyMessage="No customers found."
        onRowClick={(row) => router.push(`/customers/${row.id}`)}
      />

      {data && data.totalPages > 1 && (
        <Pagination
          page={data.page}
          totalPages={data.totalPages}
          onPageChange={setPage}
        />
      )}
    </section>
  );
}
