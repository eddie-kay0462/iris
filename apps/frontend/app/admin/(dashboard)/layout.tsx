import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { AdminShell } from "../components/AdminShell";
import type { UserRole } from "@/lib/rbac/permissions";

function decodeJwtPayload(token: string): any | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = Buffer.from(parts[1], "base64url").toString("utf-8");
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("iris_jwt")?.value;
  const payload = token ? decodeJwtPayload(token) : null;

  const role: UserRole =
    payload?.role &&
    (["public", "staff", "manager", "admin"] as string[]).includes(
      payload.role
    )
      ? (payload.role as UserRole)
      : "admin";

  return <AdminShell role={role}>{children}</AdminShell>;
}
