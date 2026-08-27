"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminOrders, type Order } from "@/lib/api/orders";
import { usePaymentStats } from "@/lib/api/payments";
import { DataTable, type Column } from "../../components/DataTable";
import { SearchInput } from "../../components/SearchInput";
import { Pagination } from "../../components/Pagination";
import { StatsCard } from "../../components/StatsCard";
import { Download, DollarSign, Clock, RotateCcw, CreditCard, Package } from "lucide-react";
import { getToken } from "@/lib/api/client";
import {
  PreorderStatusBadge,
  PreorderSourceBadge,
} from "../../components/preorders/PreorderControls";
import {
  ORDER_STATUSES,
  OrderStatusSelect,
  WalkinStatusSelect,
  PreorderGroupStatusSelect,
} from "../../components/StatusSelects";
import type { PreorderStatus } from "@/lib/api/preorders";
import type { WalkinOrderStatus } from "@/lib/api/walkin-sales";

function fmt(n: number) {
  return `GH₵${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function AdminOrdersPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [preordersOnly, setPreordersOnly] = useState(false);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useAdminOrders({
    search,
    status,
    has_preorders: preordersOnly ? "true" : undefined,
    page,
  });
  const { data: payStats } = usePaymentStats();

  const columns: Column<Order>[] = [
    {
      key: "order_number",
      header: "Order",
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{row.order_number}</span>
          {row.is_walkin ? (
            <span className="inline-flex items-center rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-700">
              Walk-in
            </span>
          ) : row.is_popup_preorder ? (
            <>
              <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                Pre-order
              </span>
              <PreorderSourceBadge source={row.preorders?.[0]?.source ?? "popup"} />
            </>
          ) : (
            row.contains_preorders && (
              <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                Pre-order
              </span>
            )
          )}
        </div>
      ),
    },
    {
      key: "email",
      header: "Customer",
      render: (row) => row.email || row.customer_name || "—",
    },
    {
      key: "status",
      header: "Status",
      render: (row) =>
        row.is_walkin ? (
          <WalkinStatusSelect
            order={{
              id: row.id,
              order_number: row.order_number,
              status: row.status as WalkinOrderStatus,
            }}
          />
        ) : row.is_popup_preorder ? (
          <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
            <PreorderGroupStatusSelect
              orderNumber={row.order_number}
              currentStatus={row.status as PreorderStatus}
            />
            {/* Per-item states can differ within a group; the dropdown above sets
                them in bulk, so the breakdown is read-only. */}
            {(row.preorders?.length ?? 0) > 1 &&
              row.preorders!.map((pre) => (
                <div key={pre.id} className="flex items-center gap-1.5">
                  <span className="max-w-[8rem] truncate text-xs text-slate-500" title={pre.variant_title ?? pre.product_name}>
                    {pre.variant_title ?? pre.product_name}
                  </span>
                  <PreorderStatusBadge status={pre.status} />
                </div>
              ))}
          </div>
        ) : (
          <OrderStatusSelect order={row} />
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
            label="Pre-orders Pending"
            value={fmt(payStats.preordersPending)}
            icon={Package}
            helperText="Awaiting fulfillment"
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
        <button
          type="button"
          onClick={() => {
            setPreordersOnly((v) => !v);
            setPage(1);
          }}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
            preordersOnly
              ? "border-purple-300 bg-purple-50 text-purple-700"
              : "border-slate-200 text-slate-700 hover:bg-slate-50"
          }`}
        >
          <Package className="h-4 w-4" />
          Pre-orders
        </button>
      </div>

      <DataTable
        columns={columns}
        rows={data?.data || []}
        loading={isLoading}
        emptyMessage="No orders found."
        onRowClick={(row) =>
          router.push(row.is_walkin ? `/walkin-sales` : `/orders/${row.id}`)
        }
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
