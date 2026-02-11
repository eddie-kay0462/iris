import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Password Reset Request API Route
 *
 * POST /api/auth/reset-password
 *
 * Sends a password reset email to the specified email address.
 * For security, always returns success even if email doesn't exist.
 * This prevents email enumeration attacks.
 *
 * Request body:
 * - email: string - Email address to send reset link to (required)
 *
 * Returns:
 * - 200: { success: true, message: "If an account exists, a password reset email has been sent" }
 * - 400: { error: "Email is required" }
 * - 400: { error: "Invalid email format" }
 * - 500: { error: "Internal server error" }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    // Validate required fields
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Build the redirect URL for after password reset
    // This should point to a page where users can set their new password
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const redirectTo = `${siteUrl}/auth/update-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    // Even if there's an error (like user not found), return success
    // This prevents attackers from discovering which emails are registered
    if (error) {
      console.error("Password reset error:", error.message);
    }

    return NextResponse.json({
      success: true,
      message: "If an account exists, a password reset email has been sent",
    });
  } catch (error) {
    console.error("Password reset error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
