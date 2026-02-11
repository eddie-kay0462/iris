/**
 * RBAC Test Endpoint: Manager Role Only
 *
 * GET /api/test/rbac/manager-only
 *
 * Tests the withRole middleware wrapper.
 * Only users with admin or manager role can access.
 *
 * Expected results:
 * - admin: 200
 * - manager: 200
 * - staff: 403
 * - public: 403
 * - Unauthenticated: 401
 */

import { NextResponse } from "next/server";
import { withRole } from "@/lib/auth/middleware";

export const GET = withRole(
  async (request, { user }) => {
    return NextResponse.json({
      success: true,
      test: "manager-only",
      user: {
        id: user.profile.id,
        email: user.profile.email,
        role: user.profile.role,
      },
      requiredRoles: ["admin", "manager"],
      message: "You have manager-level access",
    });
  },
  ["admin", "manager"]
);
