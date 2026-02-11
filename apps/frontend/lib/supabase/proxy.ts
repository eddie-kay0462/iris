import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "../../types/database.types";
import { ADMIN_ROLES, type UserRole } from "@/lib/rbac/permissions";

/**
 * Supabase Proxy (formerly Middleware)
 *
 * This proxy runs on every request and handles:
 * 1. Session refresh - Keeps auth cookies up to date
 * 2. Admin route protection - Blocks unauthorized access to /admin/*
 *
 * How admin protection works:
 * - If user visits /admin/* (except /admin/login), we check if they're authenticated
 * - If authenticated, we check if they have an admin role (admin, manager, staff)
 * - If not authenticated or wrong role, redirect to /admin/login
 *
 * This follows the modern @supabase/ssr pattern for Next.js App Router.
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

  // Admin routes need special protection
  if (isAdminRoute && !isAdminLoginPage) {
    // Not authenticated? Redirect to admin login
    if (!user) {
      const loginUrl = new URL("/admin/login", request.url);
      // Save where they were trying to go so we can redirect after login
      loginUrl.searchParams.set("redirectTo", request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Get user's role from their profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const userRole = (profile?.role as UserRole) ?? "public";

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
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const userRole = (profile?.role as UserRole) ?? "public";

    if (ADMIN_ROLES.includes(userRole)) {
      // Already logged in as admin - redirect to dashboard
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  return response;
}
