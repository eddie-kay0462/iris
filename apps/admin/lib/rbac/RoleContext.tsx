"use client";

import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import { roleHasPermission, type Permission, type UserRole } from "./permissions";

/**
 * The signed-in admin's role, read once from the JWT in the dashboard layout.
 * Lets client components hide actions the backend would refuse anyway, so
 * staff don't see a button that can only end in a 403.
 */
const RoleContext = createContext<UserRole>("public");

export function RoleProvider({ role, children }: { role: UserRole; children: ReactNode }) {
  return <RoleContext.Provider value={role}>{children}</RoleContext.Provider>;
}

export function useRole(): UserRole {
  return useContext(RoleContext);
}

/** True when the signed-in admin's role grants `permission`. UI only; the API still enforces it. */
export function useCan(permission: Permission): boolean {
  return roleHasPermission(useContext(RoleContext), permission);
}
