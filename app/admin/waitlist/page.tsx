import { DataTable } from "../components/DataTable";

const columns = [
  { key: "name", header: "Name" },
  { key: "email", header: "Email" },
  { key: "status", header: "Status" },
];

const rows = [
  { name: "Hannah Reeds", email: "hannah@iris.com", status: "Invited" },
  { name: "Samuel King", email: "samuel@iris.com", status: "Pending" },
];

export default function AdminWaitlistPage() {
  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Waitlist</h1>
        <p className="text-sm text-slate-500">
          Manage waitlist signups and invitations.
        </p>
      </header>
      <DataTable columns={columns} rows={rows} />
    </section>
  );
}
