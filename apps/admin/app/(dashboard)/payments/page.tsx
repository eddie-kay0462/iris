"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  useAdminPayments,
  usePaymentStats,
  type PaymentTransaction,
} from "@/lib/api/payments";
import { DataTable, type Column } from "../../components/DataTable";
import { StatusBadge } from "../../components/StatusBadge";
import { SearchInput } from "../../components/SearchInput";
import { Pagination } from "../../components/Pagination";
import { StatsCard } from "../../components/StatsCard";
import { DollarSign, Clock, RotateCcw, CreditCard } from "lucide-react";

const PAYMENT_STATUSES = ["", "paid", "pending", "refunded"];

const columns: Column<PaymentTransaction>[] = [
  { key: "order_number", header: "Order" },
  { key: "email", header: "Customer" },
  {
    key: "payment_provider",
    header: "Provider",
    render: (row) => (
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {row.payment_provider || "—"}
      </span>
    ),
  },
  {
    key: "payment_reference",
    header: "Reference",
    render: (row) => (
      <span className="font-mono text-xs text-slate-600">
        {row.payment_reference
          ? row.payment_reference.length > 20
            ? row.payment_reference.slice(0, 20) + "…"
            : row.payment_reference
          : "—"}
      </span>
    ),
  },
  {
    key: "payment_status",
    header: "Status",
    render: (row) => <StatusBadge status={row.payment_status || "unknown"} />,
  },
  {
    key: "total",
    header: "Amount",
    render: (row) =>
      `${row.currency || "GH₵"}${Number(row.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
  },
  {
    key: "created_at",
    header: "Date",
    render: (row) => new Date(row.created_at).toLocaleDateString(),
  },
];

function fmt(n: number) {
  return `GH₵${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function AdminPaymentsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useAdminPayments({ search, status, page });
  const { data: stats } = usePaymentStats();

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Payments</h1>
        <p className="text-sm text-slate-500">
          View all payment transactions and their statuses.
        </p>
      </header>

      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            label="Total Collected"
            value={fmt(stats.totalCollected)}
            icon={DollarSign}
            helperText="Successfully paid"
          />
          <StatsCard
            label="Pending"
            value={fmt(stats.totalPending)}
            icon={Clock}
            helperText="Awaiting confirmation"
          />
          <StatsCard
            label="Refunded"
            value={fmt(stats.totalRefunded)}
            icon={RotateCcw}
          />
          <StatsCard
            label="Transactions"
            value={String(stats.transactionCount)}
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
            placeholder="Search by order #, email, or reference..."
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
          {PAYMENT_STATUSES.filter(Boolean).map((s) => (
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
        emptyMessage="No payment transactions found."
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
