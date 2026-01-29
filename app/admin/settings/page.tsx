import Link from "next/link";

export default function AdminSettingsPage() {
  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-slate-500">
          Configure admin preferences and access controls.
        </p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          href="/admin/settings/users"
        >
          <h2 className="text-lg font-semibold">Users</h2>
          <p className="text-sm text-slate-500">
            Manage team members and invitations.
          </p>
        </Link>
        <Link
          className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          href="/admin/settings/roles"
        >
          <h2 className="text-lg font-semibold">Roles</h2>
          <p className="text-sm text-slate-500">
            Define access levels and permissions.
          </p>
        </Link>
      </div>
    </section>
  );
}
