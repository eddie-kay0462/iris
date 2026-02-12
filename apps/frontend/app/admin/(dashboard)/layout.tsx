import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { AdminShell } from "../components/AdminShell";
import type { UserRole } from "@/lib/rbac/permissions";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const cookieStore = await cookies();
  const roleCookie = cookieStore.get("x-iris-role")?.value;
  const role: UserRole =
    roleCookie &&
    (["public", "staff", "manager", "admin"] as string[]).includes(roleCookie)
      ? (roleCookie as UserRole)
      : "admin";

  return <AdminShell role={role}>{children}</AdminShell>;
}
