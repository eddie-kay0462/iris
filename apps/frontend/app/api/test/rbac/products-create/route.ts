/**
 * RBAC Test Endpoint: Products Create Permission
 *
 * GET /api/test/rbac/products-create
 *
 * Tests the withPermission middleware wrapper with "products:create" permission.
 * Only users with the products:create permission can access (admin, manager).
 *
 * Expected results:
 * - admin: 200 (has products:create)
 * - manager: 200 (has products:create)
 * - staff: 403 (no products:create)
 * - public: 403 (no products:create)
 * - Unauthenticated: 401
 */

import { NextResponse } from "next/server";
import { withPermission } from "@/lib/auth/middleware";

export const GET = withPermission(
  async (request, { user }) => {
    return NextResponse.json({
      success: true,
      test: "products-create",
      user: {
        id: user.profile.id,
        email: user.profile.email,
        role: user.profile.role,
      },
      requiredPermission: "products:create",
      message: "You can create products",
    });
  },
  "products:create"
);
