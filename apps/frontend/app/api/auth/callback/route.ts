import { NextResponse } from "next/server";
import { cookies } from "next/headers";
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
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  // Handle provider-level errors (e.g. user cancelled Google sign-in).
  const oauthError = searchParams.get("error");
  if (oauthError) {
    const desc = searchParams.get("error_description") ?? oauthError;
    console.error("OAuth provider error:", desc);
    return NextResponse.redirect(new URL("/login?error=auth-callback-failed", origin));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=auth-callback-failed", origin));
  }

  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    const verifierCookie = allCookies.find((c) => c.name.endsWith("-code-verifier"));
    console.log("[auth/callback] cookies received:", allCookies.map((c) => c.name));
    console.log("[auth/callback] code_verifier cookie found:", !!verifierCookie, verifierCookie?.name);

    const supabase = await createClient();

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("[auth/callback] exchangeCodeForSession failed:", {
        message: error.message,
        code: (error as { code?: string }).code,
        status: error.status,
      });
      return NextResponse.redirect(new URL("/login?error=auth-callback-failed", origin));
    }

    // @supabase/ssr's createServerClient writes session cookies inside an
    // onAuthStateChange callback that fires asynchronously after
    // exchangeCodeForSession resolves. Yielding to the macrotask queue here
    // ensures those pending cookie writes (applyServerStorage) complete before
    // we return the redirect response, so the Set-Cookie headers are included.
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    console.log("[auth/callback] exchange succeeded, redirecting");

    // Password reset: the update-password page uses the Supabase session
    // directly to call updateUser — no custom JWT sync needed here.
    if (next.startsWith("/update-password")) {
      return NextResponse.redirect(new URL(next, origin));
    }

    // All other flows (email confirmation, magic link login, OAuth): the
    // Supabase session is now set in cookies.  Route through /sync-session
    // so the client can exchange it for the app's custom JWT.
    const encodedNext = encodeURIComponent(next);
    return NextResponse.redirect(
      new URL(`/sync-session?next=${encodedNext}`, origin),
    );
  } catch (err) {
    console.error("Auth callback error:", err);
    return NextResponse.redirect(new URL("/login?error=auth-callback-failed", origin));
  }
}
