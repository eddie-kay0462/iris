import { describe, it, expect, vi, beforeEach } from "vitest";

// We test the route protection logic by extracting it into testable conditions.
// The actual proxy depends on Supabase server client which is hard to mock,
// so we test the routing logic and permission checks directly.

import { roleHasPermission, canAccessAdmin, ADMIN_ROLES } from "@/lib/rbac/permissions";

describe("Proxy route protection logic", () => {
  describe("customer route protection", () => {
    const protectedCustomerRoutes = ["/profile", "/inner-circle", "/waitlist"];

    function isProtectedCustomerRoute(pathname: string): boolean {
      return protectedCustomerRoutes.some(
        (route) => pathname === route || pathname.startsWith(route + "/")
      );
    }

    it("identifies /profile as protected", () => {
      expect(isProtectedCustomerRoute("/profile")).toBe(true);
    });

    it("identifies /profile/edit as protected", () => {
      expect(isProtectedCustomerRoute("/profile/edit")).toBe(true);
    });

    it("identifies /inner-circle as protected", () => {
      expect(isProtectedCustomerRoute("/inner-circle")).toBe(true);
    });

    it("identifies /waitlist as protected", () => {
      expect(isProtectedCustomerRoute("/waitlist")).toBe(true);
    });

    it("does not protect /products", () => {
      expect(isProtectedCustomerRoute("/products")).toBe(false);
    });

    it("does not protect /login", () => {
      expect(isProtectedCustomerRoute("/login")).toBe(false);
    });

    it("does not protect /signup", () => {
      expect(isProtectedCustomerRoute("/signup")).toBe(false);
    });

    it("does not protect /", () => {
      expect(isProtectedCustomerRoute("/")).toBe(false);
    });
  });

  describe("admin route protection", () => {
    it("admin role can access admin panel", () => {
      expect(canAccessAdmin("admin")).toBe(true);
    });

    it("manager role can access admin panel", () => {
      expect(canAccessAdmin("manager")).toBe(true);
    });

    it("staff role can access admin panel", () => {
      expect(canAccessAdmin("staff")).toBe(true);
    });

    it("public role cannot access admin panel", () => {
      expect(canAccessAdmin("public")).toBe(false);
    });

    it("ADMIN_ROLES contains admin, manager, staff", () => {
      expect(ADMIN_ROLES).toContain("admin");
      expect(ADMIN_ROLES).toContain("manager");
      expect(ADMIN_ROLES).toContain("staff");
      expect(ADMIN_ROLES).not.toContain("public");
    });
  });

  describe("role-based permission checks", () => {
    it("admin has all permissions", () => {
      expect(roleHasPermission("admin", "products:read")).toBe(true);
      expect(roleHasPermission("admin", "products:delete")).toBe(true);
      expect(roleHasPermission("admin", "settings:update")).toBe(true);
      expect(roleHasPermission("admin", "users:create")).toBe(true);
    });

    it("manager has most permissions but not settings or users", () => {
      expect(roleHasPermission("manager", "products:read")).toBe(true);
      expect(roleHasPermission("manager", "products:create")).toBe(true);
      expect(roleHasPermission("manager", "orders:refund")).toBe(true);
      expect(roleHasPermission("manager", "analytics:read")).toBe(true);
      // Manager cannot manage settings or users
      expect(roleHasPermission("manager", "settings:read")).toBe(false);
      expect(roleHasPermission("manager", "settings:update")).toBe(false);
      expect(roleHasPermission("manager", "users:create")).toBe(false);
    });

    it("staff has limited permissions", () => {
      expect(roleHasPermission("staff", "products:read")).toBe(true);
      expect(roleHasPermission("staff", "orders:read")).toBe(true);
      expect(roleHasPermission("staff", "orders:update")).toBe(true);
      expect(roleHasPermission("staff", "customers:read")).toBe(true);
      expect(roleHasPermission("staff", "inventory:read")).toBe(true);
      // Staff cannot create/update products
      expect(roleHasPermission("staff", "products:create")).toBe(false);
      expect(roleHasPermission("staff", "products:update")).toBe(false);
      expect(roleHasPermission("staff", "orders:refund")).toBe(false);
      expect(roleHasPermission("staff", "analytics:read")).toBe(false);
    });

    it("public role has no permissions", () => {
      expect(roleHasPermission("public", "products:read")).toBe(false);
      expect(roleHasPermission("public", "orders:read")).toBe(false);
      expect(roleHasPermission("public", "settings:read")).toBe(false);
    });
  });

  describe("middleware matcher pattern", () => {
    // The matcher pattern: /((?!_next/static|_next/image|favicon\.ico|api/).*)
    const matcherRegex = /^\/((?!_next\/static|_next\/image|favicon\.ico|api\/).*)$/;

    it("matches regular pages", () => {
      expect(matcherRegex.test("/login")).toBe(true);
      expect(matcherRegex.test("/signup")).toBe(true);
      expect(matcherRegex.test("/profile")).toBe(true);
      expect(matcherRegex.test("/admin")).toBe(true);
      expect(matcherRegex.test("/admin/products")).toBe(true);
    });

    it("excludes _next/static", () => {
      expect(matcherRegex.test("/_next/static/chunk.js")).toBe(false);
    });

    it("excludes _next/image", () => {
      expect(matcherRegex.test("/_next/image?url=test")).toBe(false);
    });

    it("excludes favicon.ico", () => {
      expect(matcherRegex.test("/favicon.ico")).toBe(false);
    });

    it("excludes api routes", () => {
      expect(matcherRegex.test("/api/auth/login")).toBe(false);
      expect(matcherRegex.test("/api/profile")).toBe(false);
    });
  });
});
