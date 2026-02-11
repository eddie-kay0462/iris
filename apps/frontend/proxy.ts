import type { NextRequest } from "next/server";

import { supabaseProxy } from "@/lib/supabase/proxy";

/**
 * Proxy (formerly Middleware)
 *
 * Next.js 16 renamed middleware to proxy. This function runs on every request
 * before it reaches your routes. It's used for:
 * - Session refresh (keeping auth cookies updated)
 * - Route protection (blocking unauthorized access to /admin/*)
 *
 * The proxy function is called by Next.js automatically for all matching routes.
 */
export function proxy(request: NextRequest) {
  return supabaseProxy(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
