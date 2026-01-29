import { DataTable } from "../../components/DataTable";

const columns = [
  { key: "role", header: "Role" },
  { key: "description", header: "Description" },
  { key: "users", header: "Users" },
];

const rows = [
  {
    role: "Owner",
    description: "Full access to all settings and data.",
    users: "1",
  },
  {
    role: "Manager",
    description: "Manage products, orders, and customers.",
    users: "3",
  },
];

export default function AdminRolesPage() {
  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Role management</h1>
        <p className="text-sm text-slate-500">
          Define roles and align permissions with responsibilities.
        </p>
      </header>
      <DataTable columns={columns} rows={rows} />
    </section>
  );
}
