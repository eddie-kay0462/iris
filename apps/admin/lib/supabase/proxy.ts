import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_ROLES, type UserRole } from "@/lib/rbac/permissions";

const JWT_COOKIE = "iris_jwt";

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
 * Admin-only Proxy
 *
 * Every route except /login requires admin authentication.
 * No customer route protection needed — this is the admin app.
 */
export async function adminProxy(request: NextRequest) {
  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  const pathname = request.nextUrl.pathname;
  const token = request.cookies.get(JWT_COOKIE)?.value;
  const user = token ? decodeJwtPayload(token) : null;

  const isAuthenticated =
    user && user.exp && user.exp * 1000 > Date.now();

  const isLoginPage = pathname === "/login";

  // All non-login routes need authentication + admin role
  if (!isLoginPage) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(loginUrl);
    }

    const role = (user?.role as UserRole) ?? "public";
    if (!ADMIN_ROLES.includes(role)) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("error", "unauthorized");
      return NextResponse.redirect(loginUrl);
    }
  }

  // If on login page but already authenticated as admin, redirect to dashboard
  if (isLoginPage && isAuthenticated) {
    const role = (user?.role as UserRole) ?? "public";
    if (ADMIN_ROLES.includes(role)) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return response;
}
