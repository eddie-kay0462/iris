/**
 * RBAC Test Endpoint: Admin Access Only
 *
 * GET /api/test/rbac/admin-only
 *
 * Tests the withAdminAccess middleware wrapper.
 * Only users with admin-level roles (admin, manager, staff) can access.
 *
 * Expected results:
 * - admin: 200
 * - manager: 200
 * - staff: 200
 * - public: 403
 * - Unauthenticated: 401
 */

import { NextResponse } from "next/server";
import { withAdminAccess } from "@/lib/auth/middleware";

export const GET = withAdminAccess(async (request, { user }) => {
  return NextResponse.json({
    success: true,
    test: "admin-only",
    user: {
      id: user.profile.id,
      email: user.profile.email,
      role: user.profile.role,
    },
    message: "You have admin panel access",
  });
});
