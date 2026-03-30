"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminOrders, useUpdateOrderStatus, type Order } from "@/lib/api/orders";
import { usePaymentStats } from "@/lib/api/payments";
import { DataTable, type Column } from "../../components/DataTable";
import { StatusBadge } from "../../components/StatusBadge";
import { SearchInput } from "../../components/SearchInput";
import { Pagination } from "../../components/Pagination";
import { StatsCard } from "../../components/StatsCard";
import { Download, DollarSign, Clock, RotateCcw, CreditCard } from "lucide-react";
import { getToken } from "@/lib/api/client";

function fmt(n: number) {
  return `GH₵${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const ORDER_STATUSES = [
  "pending",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
];

function StatusDropdown({
  order,
  onUpdate,
}: {
  order: Order;
  onUpdate: (orderId: string, status: string) => void;
}) {
  const [pending, setPending] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    e.stopPropagation();
    const newStatus = e.target.value;
    if (newStatus === order.status) return;
    setPending(true);
    try {
      await onUpdate(order.id, newStatus);
    } finally {
      setPending(false);
    }
  }

  return (
    <select
      value={order.status}
      onChange={handleChange}
      onClick={(e) => e.stopPropagation()}
      disabled={pending}
      className="rounded border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 outline-none focus:border-slate-400 disabled:opacity-50"
    >
      {ORDER_STATUSES.map((s) => (
        <option key={s} value={s}>
          {s.charAt(0).toUpperCase() + s.slice(1)}
        </option>
      ))}
    </select>
  );
}

export default function AdminOrdersPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useAdminOrders({ search, status, page });
  const updateStatus = useUpdateOrderStatus();
  const { data: payStats } = usePaymentStats();

  function handleStatusUpdate(orderId: string, newStatus: string) {
    return updateStatus.mutateAsync({ orderId, status: newStatus });
  }

  const columns: Column<Order>[] = [
    { key: "order_number", header: "Order" },
    { key: "email", header: "Customer" },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <StatusDropdown order={row} onUpdate={handleStatusUpdate} />
      ),
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

  return (
    <section className="space-y-6">
      <header className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Orders</h1>
          <p className="text-sm text-slate-500">
            Track payments, fulfillment, and delivery status.
          </p>
        </div>
        <button
          onClick={() => {
            const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
            const params = new URLSearchParams();
            if (status) params.set("status", status);
            const url = `${base}/export/orders${params.toString() ? `?${params}` : ""}`;
            fetch(url, { headers: { Authorization: `Bearer ${getToken()}` } })
              .then((r) => r.blob())
              .then((blob) => {
                const link = document.createElement("a");
                link.href = URL.createObjectURL(blob);
                link.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
                link.click();
              });
          }}
          className="flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </header>

      {payStats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            label="Total Collected"
            value={fmt(payStats.totalCollected)}
            icon={DollarSign}
            helperText="Successfully paid"
          />
          <StatsCard
            label="Pending"
            value={fmt(payStats.totalPending)}
            icon={Clock}
            helperText="Awaiting confirmation"
          />
          <StatsCard
            label="Refunded"
            value={fmt(payStats.totalRefunded)}
            icon={RotateCcw}
          />
          <StatsCard
            label="Transactions"
            value={String(payStats.transactionCount)}
            icon={CreditCard}
            helperText="Total payment attempts"
          />
        </div>
      )}

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
          {ORDER_STATUSES.map((s) => (
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
        onRowClick={(row) => router.push(`/orders/${row.id}`)}
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
