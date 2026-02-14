"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminCustomers, type AdminCustomer } from "@/lib/api/orders";
import { DataTable, type Column } from "../../components/DataTable";
import { SearchInput } from "../../components/SearchInput";
import { Pagination } from "../../components/Pagination";

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

  const { data, isLoading } = useAdminCustomers({ search, page });

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Customers</h1>
        <p className="text-sm text-slate-500">
          {data ? `${data.total} registered customer${data.total !== 1 ? "s" : ""}` : "Manage customer profiles and engagement history."}
        </p>
      </header>

      <SearchInput
        value={search}
        onChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        placeholder="Search by name or email..."
      />

      <DataTable
        columns={columns}
        rows={data?.data || []}
        loading={isLoading}
        emptyMessage="No customers found."
        onRowClick={(row) => router.push(`/admin/customers/${row.id}`)}
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
