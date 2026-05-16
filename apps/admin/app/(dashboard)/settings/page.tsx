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
          href="/settings/general"
        >
          <h2 className="text-lg font-semibold">General</h2>
          <p className="text-sm text-slate-500">
            Revenue targets, shipping options, and store-wide settings.
          </p>
        </Link>
        <Link
          className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          href="/settings/users"
        >
          <h2 className="text-lg font-semibold">Users</h2>
          <p className="text-sm text-slate-500">
            Manage team members and invitations.
          </p>
        </Link>
        <Link
          className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          href="/settings/roles"
        >
          <h2 className="text-lg font-semibold">Roles</h2>
          <p className="text-sm text-slate-500">
            Define access levels and permissions.
          </p>
        </Link>
        <Link
          className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          href="/settings/communications"
        >
          <h2 className="text-lg font-semibold">Communications</h2>
          <p className="text-sm text-slate-500">
            Manage LetsFish SMS and voice OTP settings.
          </p>
        </Link>
        <Link
          className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          href="/settings/promos"
        >
          <h2 className="text-lg font-semibold">Promo Codes</h2>
          <p className="text-sm text-slate-500">
            Create and manage discount codes for customers at checkout.
          </p>
        </Link>
      </div>
    </section>
  );
}
