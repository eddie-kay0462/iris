import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Auth Callback API Route
 *
 * GET /api/auth/callback
 *
 * Handles Supabase auth redirects for:
 * - Password reset links  → exchanges code, redirects to /update-password
 * - Email confirmation / magic link login → exchanges code, redirects to
 *   /sync-session which converts the Supabase session into the app's custom JWT
 * - OAuth provider callbacks
 *
 * Query parameters:
 * - code: string - The auth code from Supabase to exchange for a session
 * - next: string - URL to redirect to after successful auth (default: "/")
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(new URL("/auth/auth-error", request.url));
  }

  try {
    const supabase = await createClient();

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("Auth callback error:", error.message);
      return NextResponse.redirect(new URL("/auth/auth-error", request.url));
    }

    // Password reset: the update-password page uses the Supabase session
    // directly to call updateUser — no custom JWT sync needed here.
    if (next.startsWith("/update-password")) {
      return NextResponse.redirect(new URL(next, request.url));
    }

    // All other flows (email confirmation, magic link login): the Supabase
    // session is now set in cookies.  Route through /sync-session so the
    // client can exchange it for the app's custom JWT.
    const encodedNext = encodeURIComponent(next);
    return NextResponse.redirect(
      new URL(`/sync-session?next=${encodedNext}`, request.url),
    );
  } catch (err) {
    console.error("Auth callback error:", err);
    return NextResponse.redirect(new URL("/auth/auth-error", request.url));
  }
}
