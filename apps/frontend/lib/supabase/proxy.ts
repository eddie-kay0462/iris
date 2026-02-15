import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_ROLES, type UserRole } from "@/lib/rbac/permissions";

/**
 * JWT Cookie name set by the frontend API client.
 * This is a non-httpOnly cookie readable by the proxy.
 */
const JWT_COOKIE = "iris_jwt";

/**
 * Decode a JWT payload without verification.
 * The proxy only needs to read the role claim for route protection.
 * Actual verification happens on the NestJS backend.
 */
function decodeJwtPayload(token: string): any | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = Buffer.from(parts[1], "base64url").toString("utf-8");
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

/**
 * Supabase Proxy (JWT-aware)
 *
 * This proxy runs on every request and handles:
 * 1. Customer route protection - Redirects unauthenticated users to /login
 * 2. Admin route protection - Blocks unauthorized access to /admin/*
 *
 * Auth is now JWT-based. The JWT is stored in a cookie (iris_jwt) by the
 * frontend API client so this server-side proxy can read it.
 */
export async function supabaseProxy(request: NextRequest) {
  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  const pathname = request.nextUrl.pathname;
  const token = request.cookies.get(JWT_COOKIE)?.value;
  const user = token ? decodeJwtPayload(token) : null;

  // Check if token is expired
  const isAuthenticated =
    user && user.exp && user.exp * 1000 > Date.now();

  const isAdminRoute = pathname.startsWith("/admin");
  const isAdminLoginPage = pathname === "/admin/login";

  const protectedCustomerRoutes = ["/profile", "/inner-circle", "/waitlist"];
  const isProtectedCustomerRoute = protectedCustomerRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  // Customer routes need authentication
  if (isProtectedCustomerRoute && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin routes need authentication + admin role
  if (isAdminRoute && !isAdminLoginPage) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(loginUrl);
    }

    const role = (user?.role as UserRole) ?? "public";
    if (!ADMIN_ROLES.includes(role)) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("error", "unauthorized");
      return NextResponse.redirect(loginUrl);
    }
  }

  // If user is on admin login page but already authenticated as admin,
  // redirect to admin dashboard
  if (isAdminLoginPage && isAuthenticated) {
    const role = (user?.role as UserRole) ?? "public";
    if (ADMIN_ROLES.includes(role)) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  return response;
}
