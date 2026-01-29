import Link from "next/link";
import { DataTable } from "../../components/DataTable";

const columns = [
  { key: "name", header: "Product" },
  { key: "sku", header: "SKU" },
  { key: "status", header: "Status" },
  { key: "stock", header: "Stock" },
];

const rows = [
  {
    name: "Calm Candle",
    sku: "IRIS-CND-01",
    status: "Active",
    stock: "42",
  },
  {
    name: "Lumen Diffuser",
    sku: "IRIS-DIF-02",
    status: "Draft",
    stock: "8",
  },
];

export default function AdminProductsPage() {
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
      <DataTable columns={columns} rows={rows} />
    </section>
  );
}
