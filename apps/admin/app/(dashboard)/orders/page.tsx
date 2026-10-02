"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminOrders, type Order } from "@/lib/api/orders";
import { usePaymentStats } from "@/lib/api/payments";
import { DataTable, type Column } from "../../components/DataTable";
import { SearchInput } from "../../components/SearchInput";
import { Pagination } from "../../components/Pagination";
import { StatsCard } from "../../components/StatsCard";
import { Download, DollarSign, Clock, CreditCard, Package } from "lucide-react";
import { getToken } from "@/lib/api/client";
import { useIsNewUi } from "@/lib/ui/UiModeContext";
import { InfoBanner, OutlinePill, TabsUnderline } from "../../components/v2/primitives";
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
  const isNew = useIsNewUi();

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
      header: isNew ? "Customer" : "Order",
      render: (row) => (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {isNew ? (
            <div className="min-w-0">
              <p className="max-w-[12rem] truncate font-semibold text-slate-900 sm:max-w-[16rem]" title={row.customer_name || row.email || undefined}>
                {row.customer_name || row.email || "Guest"}
              </p>
              <p className="whitespace-nowrap text-[var(--iris-muted)]">
                #{row.order_number}
                {/* The Date column hides on phones; keep the date with the order. */}
                <span className="md:hidden">
                  {" · "}
                  {new Date(row.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
              </p>
            </div>
          ) : (
          <span className="font-medium">{row.order_number}</span>
          )}
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
    // New IRIS folds the customer into the first column (name over #number).
    ...(isNew
      ? []
      : [
          {
            key: "email",
            header: "Customer",
            render: (row: Order) => row.email || row.customer_name || "—",
          },
        ]),
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
      hideBelow: isNew ? "md" : undefined,
      render: (row) =>
        isNew ? (
          <span className="text-[var(--iris-muted)]">
            {new Date(row.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
          </span>
        ) : (
          new Date(row.created_at).toLocaleDateString()
        ),
    },
  ];

  function exportCsv() {
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
  }

  const preorderToggle = (
    <button
      type="button"
      onClick={() => {
        setPreordersOnly((v) => !v);
        setPage(1);
      }}
      className={
        isNew
          ? `inline-flex h-9 items-center gap-2 rounded-full border px-4 text-xs font-medium transition-colors ${
              preordersOnly
                ? "border-transparent bg-[var(--iris-violet-bg)] text-[var(--iris-violet-fg)]"
                : "border-[var(--iris-line)] text-slate-900 hover:bg-[var(--iris-hover)]"
            }`
          : `flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              preordersOnly
                ? "border-purple-300 bg-purple-50 text-purple-700"
                : "border-slate-200 text-slate-700 hover:bg-slate-50"
            }`
      }
    >
      <Package className="h-4 w-4" strokeWidth={isNew ? 1.5 : 2} />
      Pre-orders
    </button>
  );

  return (
    <section className="space-y-6">
      {isNew && (
        <header className="flex flex-wrap items-end justify-between gap-4">
          <TabsUnderline
            tabs={[
              { value: "", label: "All Orders" },
              ...ORDER_STATUSES.map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) })),
            ]}
            value={status}
            onChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
          />
          <div className="flex items-center gap-2">
            {preorderToggle}
            <OutlinePill icon={Download} onClick={exportCsv}>Export</OutlinePill>
          </div>
        </header>
      )}
      {!isNew && (
      <header className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Orders</h1>
          <p className="text-sm text-slate-500">
            Track payments, fulfillment, and delivery status.
          </p>
        </div>
        <button
          onClick={exportCsv}
          className="flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </header>
      )}

      {payStats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 iris-stat-grid">
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
            label="Transactions"
            value={String(payStats.transactionCount)}
            icon={CreditCard}
            helperText="Total payment attempts"
          />
        </div>
      )}

      {isNew && (
        <InfoBanner storageKey="orders">
          Unpaid checkouts stay off this list until payment lands. Change a status straight from its pill, or
          open an order for items, delivery and history.
        </InfoBanner>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className={isNew ? "sm:w-80" : "flex-1"}>
          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Search by order # or email..."
          />
        </div>
        {!isNew && (
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
        )}
        {!isNew && preorderToggle}
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
