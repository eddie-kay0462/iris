import { NextResponse, type NextRequest } from "next/server";

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
 * - Customer route protection - Redirects unauthenticated users to /login
 *
 * Admin routes are now served by the separate admin app (apps/admin).
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

  return response;
}
