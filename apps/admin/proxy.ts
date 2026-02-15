import type { NextRequest } from "next/server";

import { adminProxy } from "@/lib/supabase/proxy";

export function proxy(request: NextRequest) {
  return adminProxy(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/).*)",
  ],
};
