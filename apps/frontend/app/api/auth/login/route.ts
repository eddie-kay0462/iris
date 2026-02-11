import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/rbac/permissions";

/**
 * User Login API Route
 *
 * POST /api/auth/login
 *
 * Authenticates a user with email and password.
 * Returns session cookie and user info including role.
 *
 * Request body:
 * - email: string - User's email address (required)
 * - password: string - User's password (required)
 *
 * Returns:
 * - 200: { success: true, user: { id, email, role } }
 * - 400: { error: "Email and password are required" }
 * - 401: { error: "Invalid email or password" }
 * - 500: { error: "Internal server error" }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Attempt to sign in
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (authError) {
      // Don't leak whether it was wrong email vs wrong password
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Fetch user profile to get role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", authData.user.id)
      .single();

    // Default to "public" if no profile exists
    const userRole = (profile?.role as UserRole) ?? "public";

    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        role: userRole,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
