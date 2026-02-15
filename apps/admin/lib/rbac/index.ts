/**
 * RBAC (Role-Based Access Control) Module
 *
 * This module provides authorization utilities for the Iris platform.
 *
 * Permissions (permissions.ts):
 * - PERMISSIONS - All available permissions with descriptions
 * - UserRole - "public" | "staff" | "manager" | "admin"
 * - getPermissionsForRole() - Get permissions for a role
 * - roleHasPermission() - Check if role has permission
 * - ADMIN_ROLES - Roles that can access admin panel
 *
 * Guards (guards.ts):
 * - hasPermission() - Check permission (returns boolean)
 * - requirePermission() - Check permission (throws if denied)
 * - hasAnyPermission() - Check if user has any of the permissions
 * - hasAllPermissions() - Check if user has all permissions
 * - canAccessAdminPanel() - Check admin panel access
 * - hasRole() - Check for specific role
 */

export {
  PERMISSIONS,
  type Permission,
  type UserRole,
  getPermissionsForRole,
  roleHasPermission,
  ADMIN_ROLES,
  canAccessAdmin,
} from "./permissions";

export {
  hasPermission,
  requirePermission,
  hasAnyPermission,
  hasAllPermissions,
  canAccessAdminPanel,
  requireAdminAccess,
  hasRole,
  hasAnyRole,
} from "./guards";
