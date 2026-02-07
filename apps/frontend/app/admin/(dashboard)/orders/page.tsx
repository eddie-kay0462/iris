import { DataTable } from "../../components/DataTable";

const columns = [
  { key: "order", header: "Order" },
  { key: "customer", header: "Customer" },
  { key: "status", header: "Status" },
  { key: "total", header: "Total" },
];

const rows = [
  {
    order: "ORD-1029",
    customer: "Ola Johnson",
    status: "Fulfillment",
    total: "$128.00",
  },
  {
    order: "ORD-1030",
    customer: "Grace Harper",
    status: "Packed",
    total: "$64.00",
  },
];

export default function AdminOrdersPage() {
  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Orders</h1>
        <p className="text-sm text-slate-500">
          Track payments, fulfillment, and delivery status.
        </p>
      </header>
      <DataTable columns={columns} rows={rows} />
    </section>
  );
}
