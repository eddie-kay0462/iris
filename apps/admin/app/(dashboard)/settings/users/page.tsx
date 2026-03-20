"use client";

import { useState } from "react";
import {
  useAdminUsers,
  useUpdateUserRole,
  useCreateUser,
  type AdminUser,
} from "@/lib/api/settings";
import { DataTable, type Column } from "../../../components/DataTable";
import { StatusBadge } from "../../../components/StatusBadge";
import { SearchInput } from "../../../components/SearchInput";
import { Pagination } from "../../../components/Pagination";

const ROLES = ["admin", "manager", "staff", "public"];
const INVITE_ROLES = ["admin", "manager", "staff"];

function InviteUserModal({ onClose }: { onClose: () => void }) {
  const createUser = useCreateUser();
  const [form, setForm] = useState({ email: "", role: "staff", first_name: "", last_name: "" });
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createUser.mutateAsync(form);
      setSuccess(true);
    } catch {
      // error shown below
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">Invite team member</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>

        {success ? (
          <div className="px-6 py-8 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
              <span className="text-emerald-500 text-xl">&#10003;</span>
            </div>
            <p className="font-medium text-slate-900">Invite sent!</p>
            <p className="text-sm text-slate-500">
              <strong>{form.email}</strong> will receive an email to set their password and access the admin panel.
            </p>
            <button
              onClick={onClose}
              className="mt-2 rounded-lg bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-600">First name</label>
                <input
                  type="text"
                  value={form.first_name}
                  onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
                  placeholder="Jane"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-slate-400 focus:bg-white focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-600">Last name</label>
                <input
                  type="text"
                  value={form.last_name}
                  onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
                  placeholder="Doe"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-slate-400 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-600">Email address <span className="text-red-400">*</span></label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="jane@company.com"
                required
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-slate-400 focus:bg-white focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-600">Role <span className="text-red-400">*</span></label>
              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                required
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-slate-400 focus:bg-white focus:outline-none"
              >
                {INVITE_ROLES.map((r) => (
                  <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                ))}
              </select>
              <p className="text-xs text-slate-400">
                {form.role === "admin" && "Full access to all settings, users, and data."}
                {form.role === "manager" && "Manage products, orders, customers, analytics, and waitlist."}
                {form.role === "staff" && "View products, orders, customers, and inventory."}
              </p>
            </div>

            {createUser.isError && (
              <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
                {(createUser.error as any)?.message || "Failed to invite user. They may already have an account."}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createUser.isPending}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
              >
                {createUser.isPending ? "Sending invite..." : "Send invite"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function RoleDropdown({
  user,
  onUpdate,
  isUpdating,
}: {
  user: AdminUser;
  onUpdate: (userId: string, role: string) => void;
  isUpdating: boolean;
}) {
  return (
    <select
      value={user.role}
      onChange={(e) => onUpdate(user.id, e.target.value)}
      disabled={isUpdating}
      className="rounded border border-slate-200 px-2 py-1 text-xs font-medium outline-none focus:border-slate-400 disabled:opacity-50"
    >
      {ROLES.map((r) => (
        <option key={r} value={r}>
          {r.charAt(0).toUpperCase() + r.slice(1)}
        </option>
      ))}
    </select>
  );
}

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showInvite, setShowInvite] = useState(false);

  const { data, isLoading } = useAdminUsers({ search, page });
  const updateRole = useUpdateUserRole();

  const handleRoleUpdate = (userId: string, role: string) => {
    updateRole.mutate({ userId, role });
  };

  const columns: Column<AdminUser>[] = [
    {
      key: "name",
      header: "Name",
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
      key: "role",
      header: "Role",
      render: (row) => (
        <RoleDropdown
          user={row}
          onUpdate={handleRoleUpdate}
          isUpdating={updateRole.isPending}
        />
      ),
    },
    {
      key: "created_at",
      header: "Joined",
      render: (row) => new Date(row.created_at).toLocaleDateString(),
    },
    {
      key: "last_login_at",
      header: "Last Active",
      render: (row) =>
        row.last_login_at
          ? new Date(row.last_login_at).toLocaleDateString()
          : "Never",
    },
  ];

  return (
    <section className="space-y-6">
      {showInvite && <InviteUserModal onClose={() => setShowInvite(false)} />}

      <header className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">User Management</h1>
          <p className="text-sm text-slate-500">
            Manage team members and their access levels.
          </p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          + Invite user
        </button>
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
        emptyMessage="No admin users found."
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
