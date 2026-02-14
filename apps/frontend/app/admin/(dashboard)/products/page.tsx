"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DataTable, type Column } from "../../components/DataTable";
import { StatusBadge } from "../../components/StatusBadge";
import { Pagination } from "../../components/Pagination";
import { SearchInput } from "../../components/SearchInput";
import { useAdminProducts, type Product } from "@/lib/api/products";

export default function AdminProductsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [gender, setGender] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useAdminProducts({
    search,
    status: status || undefined,
    gender: gender || undefined,
    page,
    limit: 20,
  });

  const columns: Column<Product>[] = [
    {
      key: "title",
      header: "Product",
      render: (row) => (
        <div className="flex items-center gap-3">
          {row.product_images?.[0] ? (
            <img
              src={row.product_images[0].url}
              alt={row.title}
              className="h-10 w-10 rounded object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded bg-slate-100 text-xs text-slate-400">
              No img
            </div>
          )}
          <span className="font-medium">{row.title}</span>
        </div>
      ),
    },
    {
      key: "sku",
      header: "SKU",
      render: (row) => row.product_variants?.[0]?.sku || "—",
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "base_price",
      header: "Price",
      render: (row) =>
        row.base_price != null
          ? `₦${row.base_price.toLocaleString()}`
          : "—",
    },
    {
      key: "stock",
      header: "Stock",
      render: (row) => {
        const total =
          row.product_variants?.reduce(
            (sum, v) => sum + (v.inventory_quantity || 0),
            0,
          ) ?? 0;
        return (
          <span className={total === 0 ? "text-red-600 font-medium" : ""}>
            {total}
          </span>
        );
      },
    },
  ];

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Products</h1>
          <p className="text-sm text-slate-500">
            Manage product catalog, pricing, and inventory.
          </p>
        </div>
        <Link
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          href="/admin/products/new"
        >
          New product
        </Link>
      </header>

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
          <option value="unisex">Unisex</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        rows={(data?.data as unknown as Product[]) || []}
        loading={isLoading}
        onRowClick={(row) => router.push(`/admin/products/${row.id}`)}
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
