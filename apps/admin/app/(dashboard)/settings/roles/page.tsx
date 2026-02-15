"use client";

import { useRoles } from "@/lib/api/settings";

export default function AdminRolesPage() {
  const { data: roles, isLoading } = useRoles();

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Role Management</h1>
        <p className="text-sm text-slate-500">
          Define roles and align permissions with responsibilities.
        </p>
      </header>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-lg bg-slate-100"
            />
          ))}
        </div>
      ) : roles ? (
        <div className="space-y-4">
          {roles.map((role) => (
            <div
              key={role.role}
              className="rounded-lg border border-slate-200 bg-white p-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold capitalize text-slate-900">
                    {role.role}
                  </h3>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {role.description}
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                  {role.permissions.length} permissions
                </span>
              </div>
              {role.permissions.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {role.permissions.map((perm) => (
                    <span
                      key={perm}
                      className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                    >
                      {perm}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">Failed to load roles.</p>
      )}
    </section>
  );
}
