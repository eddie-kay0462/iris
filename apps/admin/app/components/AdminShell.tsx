"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import type { UserRole } from "@/lib/rbac/permissions";

type AdminShellProps = {
  role: UserRole;
  children: ReactNode;
};

export function AdminShell({ role, children }: AdminShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900">
      <Sidebar
        role={role}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header onMenuToggle={() => setMobileOpen((o) => !o)} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
