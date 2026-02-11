import { NextResponse } from "next/server";
import { getUser, AuthError, type AuthSession } from "./session";
import { type Permission, type UserRole } from "@/lib/rbac/permissions";
import {
  hasPermission,
  hasAnyRole,
  canAccessAdminPanel,
} from "@/lib/rbac/guards";

/**
 * API Route Middleware
 *
 * These are wrapper functions that add authentication and authorization
 * to your API routes. Think of them as security gates that run before
 * your actual route logic.
 *
 * Usage:
 *   export const GET = withAuth(async (request, { user }) => {
 *     // user is guaranteed to be authenticated here
 *     return NextResponse.json({ userId: user.profile.id });
 *   });
 */

/**
 * Context passed to protected route handlers
 */
export interface AuthContext {
  user: AuthSession;
}

/**
 * Type for a protected route handler
 */
type ProtectedHandler = (
  request: Request,
  context: AuthContext
) => Promise<NextResponse> | NextResponse;

/**
 * Wrap an API route handler with authentication
 *
 * This ensures the user is logged in before the handler runs.
 * If not authenticated, returns 401 Unauthorized.
 *
 * @param handler - Your route handler function
 * @returns A wrapped handler that checks auth first
 *
 * @example
 * // app/api/me/route.ts
 * export const GET = withAuth(async (request, { user }) => {
 *   return NextResponse.json({
 *     id: user.profile.id,
 *     email: user.profile.email,
 *   });
 * });
 */
export function withAuth(handler: ProtectedHandler) {
  return async (request: Request): Promise<NextResponse> => {
    try {
      const user = await getUser();

      if (!user) {
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 }
        );
      }

      return await handler(request, { user });
    } catch (error) {
      return handleError(error);
    }
  };
}

/**
 * Wrap an API route handler with role-based access control
 *
 * This ensures the user:
 * 1. Is logged in
 * 2. Has one of the required roles
 *
 * @param handler - Your route handler function
 * @param roles - Array of allowed roles
 * @returns A wrapped handler that checks auth and role first
 *
 * @example
 * // app/api/admin/users/route.ts
 * export const GET = withRole(
 *   async (request, { user }) => {
 *     const users = await getAdminUsers();
 *     return NextResponse.json(users);
 *   },
 *   ["admin", "manager"] // Only admin and manager can access
 * );
 */
export function withRole(handler: ProtectedHandler, roles: UserRole[]) {
  return async (request: Request): Promise<NextResponse> => {
    try {
      const user = await getUser();

      if (!user) {
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 }
        );
      }

      if (!hasAnyRole(user, roles)) {
        return NextResponse.json(
          { error: "Insufficient permissions" },
          { status: 403 }
        );
      }

      return await handler(request, { user });
    } catch (error) {
      return handleError(error);
    }
  };
}

/**
 * Wrap an API route handler with permission-based access control
 *
 * This ensures the user:
 * 1. Is logged in
 * 2. Has the required permission
 *
 * @param handler - Your route handler function
 * @param permission - The required permission
 * @returns A wrapped handler that checks auth and permission first
 *
 * @example
 * // app/api/admin/products/route.ts
 * export const POST = withPermission(
 *   async (request, { user }) => {
 *     const data = await request.json();
 *     const product = await createProduct(data, user.profile.id);
 *     return NextResponse.json(product);
 *   },
 *   "products:create"
 * );
 */
export function withPermission(handler: ProtectedHandler, permission: Permission) {
  return async (request: Request): Promise<NextResponse> => {
    try {
      const user = await getUser();

      if (!user) {
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 }
        );
      }

      if (!hasPermission(user, permission)) {
        return NextResponse.json(
          { error: `Permission denied: ${permission} required` },
          { status: 403 }
        );
      }

      return await handler(request, { user });
    } catch (error) {
      return handleError(error);
    }
  };
}

/**
 * Wrap an API route handler with admin access check
 *
 * This ensures the user:
 * 1. Is logged in
 * 2. Has an admin-level role (admin, manager, or staff)
 *
 * @param handler - Your route handler function
 * @returns A wrapped handler that checks admin access first
 *
 * @example
 * // app/api/admin/dashboard/route.ts
 * export const GET = withAdminAccess(async (request, { user }) => {
 *   const stats = await getDashboardStats();
 *   return NextResponse.json(stats);
 * });
 */
export function withAdminAccess(handler: ProtectedHandler) {
  return async (request: Request): Promise<NextResponse> => {
    try {
      const user = await getUser();

      if (!user) {
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 }
        );
      }

      if (!canAccessAdminPanel(user)) {
        return NextResponse.json(
          { error: "Admin access required" },
          { status: 403 }
        );
      }

      return await handler(request, { user });
    } catch (error) {
      return handleError(error);
    }
  };
}

/**
 * Central error handler for auth middleware
 *
 * Converts known errors to appropriate HTTP responses
 */
function handleError(error: unknown): NextResponse {
  // Handle our custom AuthError
  if (error instanceof AuthError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.statusCode }
    );
  }

  // Log unexpected errors and return 500
  console.error("Unexpected error in auth middleware:", error);
  return NextResponse.json(
    { error: "Internal server error" },
    { status: 500 }
  );
}
