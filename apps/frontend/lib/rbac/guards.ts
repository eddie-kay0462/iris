import type { AuthSession } from "@/lib/auth/session";
import { AuthError } from "@/lib/auth/session";
import {
  type Permission,
  type UserRole,
  roleHasPermission,
  canAccessAdmin,
} from "./permissions";

/**
 * Permission Guard Functions
 *
 * These functions check whether a user has permission to perform an action.
 * They're the "bouncers" of your application - they decide who gets in.
 *
 * Two flavors:
 * 1. hasPermission() - Returns true/false (use when you want to handle denial yourself)
 * 2. requirePermission() - Throws 403 if denied (use in API routes for cleaner code)
 */

/**
 * Check if a user has a specific permission
 *
 * @param user - The authenticated user session
 * @param permission - The permission to check (e.g., "products:create")
 * @returns true if user has the permission, false otherwise
 *
 * @example
 * const canCreate = hasPermission(user, "products:create");
 * if (canCreate) {
 *   // Show create button
 * }
 */
export function hasPermission(
  user: AuthSession | null,
  permission: Permission
): boolean {
  // No user = no permissions
  if (!user) {
    return false;
  }

  const role = user.profile.role;
  return roleHasPermission(role, permission);
}

/**
 * Require a specific permission or throw a 403 error
 *
 * @param user - The authenticated user session
 * @param permission - The permission required
 * @throws AuthError with 403 status if permission denied
 *
 * @example
 * // In an API route:
 * export async function POST(request: Request) {
 *   const user = await requireUser();
 *   requirePermission(user, "products:create"); // Throws 403 if not allowed
 *
 *   // If we get here, user has permission
 *   const product = await createProduct(data);
 * }
 */
export function requirePermission(
  user: AuthSession | null,
  permission: Permission
): void {
  if (!hasPermission(user, permission)) {
    throw new AuthError(
      `Permission denied: ${permission} required`,
      403 // Forbidden
    );
  }
}

/**
 * Check if a user has ANY of the specified permissions
 *
 * @param user - The authenticated user session
 * @param permissions - Array of permissions (user needs at least one)
 * @returns true if user has at least one of the permissions
 *
 * @example
 * // User can view if they have read OR update permission
 * const canView = hasAnyPermission(user, ["products:read", "products:update"]);
 */
export function hasAnyPermission(
  user: AuthSession | null,
  permissions: Permission[]
): boolean {
  if (!user) {
    return false;
  }

  return permissions.some((permission) => hasPermission(user, permission));
}

/**
 * Check if a user has ALL of the specified permissions
 *
 * @param user - The authenticated user session
 * @param permissions - Array of permissions (user needs all of them)
 * @returns true if user has all of the permissions
 *
 * @example
 * // User needs both read AND update to edit
 * const canEdit = hasAllPermissions(user, ["products:read", "products:update"]);
 */
export function hasAllPermissions(
  user: AuthSession | null,
  permissions: Permission[]
): boolean {
  if (!user) {
    return false;
  }

  return permissions.every((permission) => hasPermission(user, permission));
}

/**
 * Check if a user can access the admin panel
 *
 * @param user - The authenticated user session
 * @returns true if user has an admin role (admin, manager, or staff)
 *
 * @example
 * if (canAccessAdminPanel(user)) {
 *   redirect("/admin/dashboard");
 * } else {
 *   redirect("/");
 * }
 */
export function canAccessAdminPanel(user: AuthSession | null): boolean {
  if (!user) {
    return false;
  }

  return canAccessAdmin(user.profile.role);
}

/**
 * Require admin panel access or throw a 403 error
 *
 * @param user - The authenticated user session
 * @throws AuthError with 403 status if user cannot access admin
 */
export function requireAdminAccess(user: AuthSession | null): void {
  if (!canAccessAdminPanel(user)) {
    throw new AuthError("Admin access required", 403);
  }
}

/**
 * Check if a user has a specific role
 *
 * @param user - The authenticated user session
 * @param role - The role to check for
 * @returns true if user has exactly that role
 *
 * @example
 * if (hasRole(user, "admin")) {
 *   // Show admin-only settings
 * }
 */
export function hasRole(user: AuthSession | null, role: UserRole): boolean {
  if (!user) {
    return false;
  }

  return user.profile.role === role;
}

/**
 * Check if a user has any of the specified roles
 *
 * @param user - The authenticated user session
 * @param roles - Array of roles to check
 * @returns true if user has any of the specified roles
 */
export function hasAnyRole(
  user: AuthSession | null,
  roles: UserRole[]
): boolean {
  if (!user) {
    return false;
  }

  return roles.includes(user.profile.role);
}
