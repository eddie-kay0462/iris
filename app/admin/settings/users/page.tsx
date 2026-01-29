import { DataTable } from "../../components/DataTable";

const columns = [
  { key: "name", header: "Name" },
  { key: "email", header: "Email" },
  { key: "role", header: "Role" },
  { key: "status", header: "Status" },
];

const rows = [
  {
    name: "Sade Bello",
    email: "sade@iris.com",
    role: "Owner",
    status: "Active",
  },
  {
    name: "Jordan Lee",
    email: "jordan@iris.com",
    role: "Manager",
    status: "Invited",
  },
];

export default function AdminUsersPage() {
  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">User management</h1>
        <p className="text-sm text-slate-500">
          Invite admins, update roles, and review access.
        </p>
      </header>
      <DataTable columns={columns} rows={rows} />
    </section>
  );
}
