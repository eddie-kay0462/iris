/**
 * RBAC Permissions Matrix
 *
 * Mirrored from apps/frontend/lib/rbac/permissions.ts
 * This is the single source of truth for backend authorization.
 */

export const PERMISSIONS = {
  'products:read': 'View products (including unpublished)',
  'products:create': 'Create new products',
  'products:update': 'Update existing products',
  'products:delete': 'Delete products',
  'products:publish': 'Publish/unpublish products',
  'orders:read': 'View all orders',
  'orders:update': 'Update order status',
  'orders:refund': 'Process refunds',
  'customers:read': 'View customer list and details',
  'customers:update': 'Update customer information',
  'inventory:read': 'View inventory levels',
  'inventory:update': 'Update stock quantities',
  'waitlist:read': 'View waitlist entries',
  'waitlist:invite': 'Send invitations to waitlist members',
  'analytics:read': 'View analytics and reports',
  'settings:read': 'View system settings',
  'settings:update': 'Update system settings',
  'users:read': 'View admin users',
  'users:create': 'Create admin users',
  'users:update': 'Update admin users',
  'users:delete': 'Delete admin users',
} as const;

export type Permission = keyof typeof PERMISSIONS;

export type UserRole = 'public' | 'staff' | 'manager' | 'admin';

const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  public: [],
  staff: [
    'products:read',
    'orders:read',
    'orders:update',
    'customers:read',
    'inventory:read',
  ],
  manager: [
    'products:read',
    'products:create',
    'products:update',
    'products:publish',
    'orders:read',
    'orders:update',
    'orders:refund',
    'customers:read',
    'customers:update',
    'inventory:read',
    'inventory:update',
    'waitlist:read',
    'waitlist:invite',
    'analytics:read',
  ],
  admin: [
    'products:read',
    'products:create',
    'products:update',
    'products:delete',
    'products:publish',
    'orders:read',
    'orders:update',
    'orders:refund',
    'customers:read',
    'customers:update',
    'inventory:read',
    'inventory:update',
    'waitlist:read',
    'waitlist:invite',
    'analytics:read',
    'settings:read',
    'settings:update',
    'users:read',
    'users:create',
    'users:update',
    'users:delete',
  ],
};

export function getPermissionsForRole(role: UserRole): readonly Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function roleHasPermission(
  role: UserRole,
  permission: Permission,
): boolean {
  const permissions = getPermissionsForRole(role);
  return permissions.includes(permission);
}

export const ADMIN_ROLES: readonly UserRole[] = ['admin', 'manager', 'staff'];

export function canAccessAdmin(role: UserRole): boolean {
  return ADMIN_ROLES.includes(role);
}
