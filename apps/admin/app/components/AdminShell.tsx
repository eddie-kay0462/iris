"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { NewIrisModal } from "./NewIrisModal";
import { AdminShellV2 } from "./v2/AdminShellV2";
import type { UserRole } from "@/lib/rbac/permissions";
import { RoleProvider } from "@/lib/rbac/RoleContext";
import { useIsNewUi } from "@/lib/ui/UiModeContext";

type AdminShellProps = {
  role: UserRole;
  children: ReactNode;
};

export function AdminShell({ role, children }: AdminShellProps) {
  const isNew = useIsNewUi();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (isNew) {
    return (
      // The new shell provides the role itself, so a "view as" preview can
      // swap it for everything inside.
      <AdminShellV2 role={role}>
        {children}
        <NewIrisModal />
      </AdminShellV2>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900">
      <Sidebar
        role={role}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header onMenuToggle={() => setMobileOpen((o) => !o)} />
        <main className="flex-1 overflow-y-auto p-6">
          <RoleProvider role={role}>{children}</RoleProvider>
        </main>
      </div>
      <NewIrisModal />
    </div>
  );
}
