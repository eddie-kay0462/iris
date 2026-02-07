import type { NextRequest } from "next/server";

import { supabaseMiddleware } from "@/lib/supabase/middleware";

export function middleware(request: NextRequest) {
  return supabaseMiddleware(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
