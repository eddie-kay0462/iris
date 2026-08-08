import { NextResponse, type NextRequest } from "next/server";

import { supabaseProxy } from "@/lib/supabase/proxy";
import { LEGACY_REDIRECTS } from "@/lib/redirects/legacy-redirects";

/**
 * Proxy (formerly Middleware)
 *
 * Next.js 16 renamed middleware to proxy. This function runs on every request
 * before it reaches your routes. It's used for:
 * - Legacy Shopify URL redirects (real 301s — see lib/redirects/legacy-redirects.ts.
 *   next.config.ts `redirects()` only supports 307/308, no true 301, hence handling
 *   it here instead)
 * - Session refresh (keeping auth cookies updated)
 * - Route protection (blocking unauthorized access to /admin/*)
 *
 * The proxy function is called by Next.js automatically for all matching routes.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const key = pathname + search;

  // 1. Exact static legacy-URL map.
  const staticTarget = LEGACY_REDIRECTS[key];
  if (staticTarget) {
    return NextResponse.redirect(new URL(staticTarget, request.url), 301);
  }

  // 2. Generic pattern fallback: old Shopify plural /products/{handle} ->
  // current singular /product/{handle}, for any handle not already covered
  // by the static map above. Safety net for long-tail old product URLs GSC
  // hasn't surfaced yet. Never touches /product/ (singular) itself — that's
  // already the correct current route.
  const pluralMatch = pathname.match(/^\/products\/([^/]+)\/?$/);
  if (pluralMatch) {
    return NextResponse.redirect(
      new URL(`/product/${pluralMatch[1]}`, request.url),
      301,
    );
  }

  return supabaseProxy(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api/* (API routes - they handle their own auth)
     */
    "/((?!_next/static|_next/image|favicon.ico|api/).*)",
  ],
};
