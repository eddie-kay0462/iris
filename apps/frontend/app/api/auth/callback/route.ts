import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Auth Callback API Route
 *
 * GET /api/auth/callback
 *
 * Handles Supabase auth redirects for:
 * - Email confirmation after signup
 * - Password reset links
 * - OAuth provider callbacks
 *
 * Query parameters:
 * - code: string - The auth code from Supabase to exchange for a session
 * - next: string - URL to redirect to after successful auth (default: "/")
 *
 * Returns:
 * - Redirects to `next` URL on success
 * - Redirects to /auth/auth-error on failure
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  // If no code, redirect to error page
  if (!code) {
    return NextResponse.redirect(new URL("/auth/auth-error", request.url));
  }

  try {
    const supabase = await createClient();

    // Exchange the code for a session
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("Auth callback error:", error.message);
      return NextResponse.redirect(new URL("/auth/auth-error", request.url));
    }

    // Success - redirect to the intended destination
    return NextResponse.redirect(new URL(next, request.url));
  } catch (error) {
    console.error("Auth callback error:", error);
    return NextResponse.redirect(new URL("/auth/auth-error", request.url));
  }
}
