"use client";

import type { ReactNode } from "react";
import { AdminShellV2 } from "./v2/AdminShellV2";
import type { UserRole } from "@/lib/rbac/permissions";

type AdminShellProps = {
  role: UserRole;
  children: ReactNode;
};

export function AdminShell({ role, children }: AdminShellProps) {
  // The shell provides the role itself, so a "view as" preview can swap it
  // for everything inside.
  return <AdminShellV2 role={role}>{children}</AdminShellV2>;
}
