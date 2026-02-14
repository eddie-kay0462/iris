"use client";

import { useState } from "react";
import {
  useAdminUsers,
  useUpdateUserRole,
  type AdminUser,
} from "@/lib/api/settings";
import { DataTable, type Column } from "../../../components/DataTable";
import { StatusBadge } from "../../../components/StatusBadge";
import { SearchInput } from "../../../components/SearchInput";
import { Pagination } from "../../../components/Pagination";

const ROLES = ["admin", "manager", "staff", "public"];

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
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">User Management</h1>
        <p className="text-sm text-slate-500">
          Manage team members and their access levels.
        </p>
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
