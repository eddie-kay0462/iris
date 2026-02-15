/**
 * RBAC Permissions Matrix
 *
 * Defines what each role can do in the system.
 * This is the single source of truth for authorization.
 *
 * Roles hierarchy (highest to lowest):
 * - admin: Full access to everything
 * - manager: Can manage products, orders, customers, but not system settings
 * - staff: Can view and process orders, limited product access
 * - public: Regular authenticated user (customer)
 */

// All possible permissions in the system
export const PERMISSIONS = {
  // Product permissions
  "products:read": "View products (including unpublished)",
  "products:create": "Create new products",
  "products:update": "Update existing products",
  "products:delete": "Delete products",
  "products:publish": "Publish/unpublish products",

  // Order permissions
  "orders:read": "View all orders",
  "orders:update": "Update order status",
  "orders:refund": "Process refunds",

  // Customer permissions
  "customers:read": "View customer list and details",
  "customers:update": "Update customer information",

  // Inventory permissions
  "inventory:read": "View inventory levels",
  "inventory:update": "Update stock quantities",

  // Waitlist permissions
  "waitlist:read": "View waitlist entries",
  "waitlist:invite": "Send invitations to waitlist members",

  // Analytics permissions
  "analytics:read": "View analytics and reports",

  // Settings permissions
  "settings:read": "View system settings",
  "settings:update": "Update system settings",

  // User management permissions
  "users:read": "View admin users",
  "users:create": "Create admin users",
  "users:update": "Update admin users",
  "users:delete": "Delete admin users",
} as const;

export type Permission = keyof typeof PERMISSIONS;

// User roles in the system
export type UserRole = "public" | "staff" | "manager" | "admin";

// Define what permissions each role has
const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  // Public users (customers) have no admin permissions
  public: [],

  // Staff can view and process orders, view inventory
  staff: [
    "products:read",
    "orders:read",
    "orders:update",
    "customers:read",
    "inventory:read",
  ],

  // Managers can do everything staff can, plus manage products and waitlist
  manager: [
    "products:read",
    "products:create",
    "products:update",
    "products:publish",
    "orders:read",
    "orders:update",
    "orders:refund",
    "customers:read",
    "customers:update",
    "inventory:read",
    "inventory:update",
    "waitlist:read",
    "waitlist:invite",
    "analytics:read",
  ],

  // Admins can do everything
  admin: [
    "products:read",
    "products:create",
    "products:update",
    "products:delete",
    "products:publish",
    "orders:read",
    "orders:update",
    "orders:refund",
    "customers:read",
    "customers:update",
    "inventory:read",
    "inventory:update",
    "waitlist:read",
    "waitlist:invite",
    "analytics:read",
    "settings:read",
    "settings:update",
    "users:read",
    "users:create",
    "users:update",
    "users:delete",
  ],
} as const;

/**
 * Get all permissions for a given role
 */
export function getPermissionsForRole(role: UserRole): readonly Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

/**
 * Check if a role has a specific permission
 */
export function roleHasPermission(
  role: UserRole,
  permission: Permission
): boolean {
  const permissions = getPermissionsForRole(role);
  return permissions.includes(permission);
}

/**
 * Roles that have access to the admin panel
 */
export const ADMIN_ROLES: readonly UserRole[] = ["admin", "manager", "staff"];

/**
 * Check if a role can access the admin panel
 */
export function canAccessAdmin(role: UserRole): boolean {
  return ADMIN_ROLES.includes(role);
}
