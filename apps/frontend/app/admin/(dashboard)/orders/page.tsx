"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminOrders, type Order } from "@/lib/api/orders";
import { DataTable, type Column } from "../../components/DataTable";
import { StatusBadge } from "../../components/StatusBadge";
import { SearchInput } from "../../components/SearchInput";
import { Pagination } from "../../components/Pagination";

const ORDER_STATUSES = [
  "",
  "pending",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
];

const columns: Column<Order>[] = [
  { key: "order_number", header: "Order" },
  { key: "email", header: "Customer" },
  {
    key: "status",
    header: "Status",
    render: (row) => <StatusBadge status={row.status} />,
  },
  {
    key: "total",
    header: "Total",
    render: (row) => `GH₵${Number(row.total).toLocaleString()}`,
  },
  {
    key: "created_at",
    header: "Date",
    render: (row) => new Date(row.created_at).toLocaleDateString(),
  },
];

export default function AdminOrdersPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useAdminOrders({ search, status, page });

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Orders</h1>
        <p className="text-sm text-slate-500">
          Track payments, fulfillment, and delivery status.
        </p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Search by order # or email..."
          />
        </div>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
        >
          <option value="">All statuses</option>
          {ORDER_STATUSES.filter(Boolean).map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        rows={data?.data || []}
        loading={isLoading}
        emptyMessage="No orders found."
        onRowClick={(row) => router.push(`/admin/orders/${row.id}`)}
      />

      {data && (
        <Pagination
          page={data.page}
          totalPages={data.totalPages}
          onPageChange={setPage}
        />
      )}
    </section>
  );
}
