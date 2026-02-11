/**
 * RBAC Test Endpoint: Orders Refund Permission
 *
 * GET /api/test/rbac/orders-refund
 *
 * Tests the withPermission middleware wrapper with "orders:refund" permission.
 * Only users with the orders:refund permission can access (admin, manager only).
 *
 * Expected results:
 * - admin: 200 (has orders:refund)
 * - manager: 200 (has orders:refund)
 * - staff: 403 (no orders:refund - staff can only read/update, not refund)
 * - public: 403 (no orders:refund)
 * - Unauthenticated: 401
 */

import { NextResponse } from "next/server";
import { withPermission } from "@/lib/auth/middleware";

export const GET = withPermission(
  async (request, { user }) => {
    return NextResponse.json({
      success: true,
      test: "orders-refund",
      user: {
        id: user.profile.id,
        email: user.profile.email,
        role: user.profile.role,
      },
      requiredPermission: "orders:refund",
      message: "You can process refunds",
    });
  },
  "orders:refund"
);
