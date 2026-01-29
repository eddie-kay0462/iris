import { DataTable } from "../components/DataTable";

const columns = [
  { key: "name", header: "Customer" },
  { key: "email", header: "Email" },
  { key: "orders", header: "Orders" },
  { key: "status", header: "Status" },
];

const rows = [
  {
    name: "Amina Yusuf",
    email: "amina@iris.com",
    orders: "5",
    status: "Active",
  },
  {
    name: "Leo Garcia",
    email: "leo@iris.com",
    orders: "2",
    status: "Active",
  },
];

export default function AdminCustomersPage() {
  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Customers</h1>
        <p className="text-sm text-slate-500">
          Manage customer profiles and engagement history.
        </p>
      </header>
      <DataTable columns={columns} rows={rows} />
    </section>
  );
}
