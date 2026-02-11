/**
 * RBAC Test Endpoint: Auth Only
 *
 * GET /api/test/rbac/auth-only
 *
 * Tests the withAuth middleware wrapper.
 * Any authenticated user should be able to access this endpoint.
 *
 * Expected results:
 * - Authenticated user (any role): 200
 * - Unauthenticated: 401
 */

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";

export const GET = withAuth(async (request, { user }) => {
  return NextResponse.json({
    success: true,
    test: "auth-only",
    user: {
      id: user.profile.id,
      email: user.profile.email,
      role: user.profile.role,
    },
    message: "You are authenticated",
  });
});
