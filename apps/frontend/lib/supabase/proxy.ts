import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "../../types/database.types";
import { ADMIN_ROLES, type UserRole } from "@/lib/rbac/permissions";

/**
 * Cookie name used to cache the user's role so we don't query the
 * profiles table on every single navigation.  The cookie is HttpOnly,
 * short‑lived (5 min), and re‑validated whenever it's missing or after
 * the user logs out / back in (the Supabase auth cookies change).
 */
const ROLE_COOKIE = "x-iris-role";
const ROLE_COOKIE_MAX_AGE = 300; // 5 minutes

/**
 * Supabase Proxy (formerly Middleware)
 *
 * This proxy runs on every request and handles:
 * 1. Session refresh - Keeps auth cookies up to date
 * 2. Admin route protection - Blocks unauthorized access to /admin/*
 *
 * Performance: the user's role is cached in a short‑lived cookie so that
 * admin page navigations only require the auth token check (getUser()),
 * not a DB round‑trip for the profile on every request.
 */
export async function supabaseProxy(request: NextRequest) {
  // Create a response that we can modify
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // Create Supabase client with cookie handling for middleware
  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Update request cookies for downstream handlers
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        // Create fresh response with updated cookies
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        // Set cookies on response for browser
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // Refresh the session - this is important!
  // It checks if the token is expired and refreshes it if needed.
  // Use getUser() for security as recommended by Supabase docs.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Check if this is an admin route (but not the login page)
  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");
  const isAdminLoginPage = request.nextUrl.pathname === "/admin/login";

  // Helper: resolve the user's role, preferring the cached cookie to avoid a DB call.
  async function resolveRole(): Promise<UserRole> {
    const cached = request.cookies.get(ROLE_COOKIE)?.value as
      | UserRole
      | undefined;
    if (cached && (["public", "staff", "manager", "admin"] as string[]).includes(cached)) {
      return cached;
    }

    // Cache miss – query the profile once and cache in a cookie
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user!.id)
      .single();

    const role: UserRole = (profile?.role as UserRole) ?? "public";

    response.cookies.set(ROLE_COOKIE, role, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: ROLE_COOKIE_MAX_AGE,
    });

    return role;
  }

  // If user is not authenticated, clear any stale role cookie
  if (!user) {
    response.cookies.delete(ROLE_COOKIE);
  }

  // Admin routes need special protection
  if (isAdminRoute && !isAdminLoginPage) {
    // Not authenticated? Redirect to admin login
    if (!user) {
      const loginUrl = new URL("/admin/login", request.url);
      // Save where they were trying to go so we can redirect after login
      loginUrl.searchParams.set("redirectTo", request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    const userRole = await resolveRole();

    // Check if user has an admin role
    if (!ADMIN_ROLES.includes(userRole)) {
      // Authenticated but wrong role - redirect to admin login with error
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("error", "unauthorized");
      return NextResponse.redirect(loginUrl);
    }

    // User is authenticated and has admin access - allow through
  }

  // If user is on admin login page but already authenticated as admin,
  // redirect them to admin dashboard
  if (isAdminLoginPage && user) {
    const userRole = await resolveRole();

    if (ADMIN_ROLES.includes(userRole)) {
      // Already logged in as admin - redirect to dashboard
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  return response;
}
