/**
 * Auth Module
 *
 * This module provides authentication utilities for the Iris platform.
 *
 * Session helpers (session.ts):
 * - getSession() - Get raw Supabase session
 * - getUser() - Get authenticated user with profile
 * - requireUser() - Get user or throw 401
 *
 * API middleware (middleware.ts):
 * - withAuth() - Require authentication
 * - withRole() - Require specific roles
 * - withPermission() - Require specific permission
 * - withAdminAccess() - Require admin panel access
 */

export {
  getSession,
  getUser,
  requireUser,
  AuthError,
  type AuthSession,
  type UserProfile,
} from "./session";

export {
  withAuth,
  withRole,
  withPermission,
  withAdminAccess,
  type AuthContext,
} from "./middleware";
