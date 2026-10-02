"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminCustomers, useCustomerStats, type AdminCustomer } from "@/lib/api/orders";
import { DataTable, type Column } from "../../components/DataTable";
import { SearchInput } from "../../components/SearchInput";
import { Pagination } from "../../components/Pagination";
import { StatsCard } from "../../components/StatsCard";
import { Avatar } from "../../components/Avatar";
import { Users, UserPlus, ShoppingCart, Crown } from "lucide-react";
import { useIsNewUi } from "@/lib/ui/UiModeContext";
import { TabsUnderline } from "../../components/v2/primitives";

type Segment = "all" | "new" | "returning";

function buildColumns(isNew: boolean): Column<AdminCustomer>[] {
  return [
  {
    key: "name",
    header: "Customer",
    render: (row) => {
      const name = [row.first_name, row.last_name].filter(Boolean).join(" ");
      if (isNew) {
        // Kit row: avatar, bold name, grey secondary line.
        return (
          <div className="flex items-center gap-3">
            <Avatar name={name || row.email} size={32} />
            <div className="min-w-0 max-w-[11rem] sm:max-w-[14rem]">
              <p className="truncate font-semibold text-slate-900" title={name || undefined}>{name || "—"}</p>
              <p className="truncate text-[var(--iris-muted)]" title={row.email}>{row.email}</p>
            </div>
          </div>
        );
      }
      return (
        <div className="max-w-[16rem]">
          <p className="truncate font-medium text-slate-900" title={name || undefined}>{name || "—"}</p>
          <p className="truncate text-xs text-slate-500" title={row.email}>{row.email}</p>
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
    hideBelow: "md",
    render: (row) =>
      row.last_order_date
        ? new Date(row.last_order_date).toLocaleDateString()
        : "—",
  },
  {
    key: "created_at",
    header: "Joined",
    hideBelow: isNew ? "xl" : "lg",
    render: (row) => new Date(row.created_at).toLocaleDateString(),
  },
  {
    key: "last_login_at",
    header: "Last Seen",
    hideBelow: isNew ? "xl" : "lg",
    render: (row) =>
      row.last_login_at
        ? new Date(row.last_login_at).toLocaleDateString()
        : "—",
  },
  ];
}

export default function AdminCustomersPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [segment, setSegment] = useState<Segment>("all");
  const isNew = useIsNewUi();
  const columns = buildColumns(isNew);

  const segmentFilters =
    segment === "new"
      ? { max_orders: 1 }
      : segment === "returning"
        ? { min_orders: 2 }
        : {};

  const { data, isLoading, error } = useAdminCustomers({ search, page, ...segmentFilters });
  const { data: stats } = useCustomerStats();

  const segments: { key: Segment; label: string }[] = [
    { key: "all", label: "All" },
    { key: "new", label: "New (≤1 order)" },
    { key: "returning", label: "Returning (2+)" },
  ];

  return (
    <section className="space-y-6">
      {isNew && (
        <header className="flex flex-wrap items-end justify-between gap-4">
          <TabsUnderline
            tabs={segments.map((s) => ({ value: s.key, label: s.key === "all" ? "All Customers" : s.label }))}
            value={segment}
            onChange={(v) => {
              setSegment(v);
              setPage(1);
            }}
          />
          <p className="pb-1.5 text-xs text-[var(--iris-muted)]">
            {data ? `${data.total} registered customer${data.total !== 1 ? "s" : ""}` : ""}
          </p>
        </header>
      )}
      {!isNew && (
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Customers</h1>
        <p className="text-sm text-slate-500">
          {data ? `${data.total} registered customer${data.total !== 1 ? "s" : ""}` : "Manage customer profiles and engagement history."}
        </p>
      </header>
      )}

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 iris-stat-grid">
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
        {!isNew && (
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
        )}
        <div className={isNew ? "w-full sm:w-80" : "flex-1 min-w-[200px]"}>
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

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed to load customers: {(error as any)?.message || "Unknown error"}
        </div>
      )}

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
