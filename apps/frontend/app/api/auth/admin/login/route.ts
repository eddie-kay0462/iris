import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ADMIN_ROLES, type UserRole } from "@/lib/rbac/permissions";

/**
 * Admin Login API Route
 *
 * POST /api/auth/admin/login
 *
 * Authenticates admin users using email and password.
 * This is different from regular user auth which uses OTP.
 *
 * Request body:
 * - email: string - Admin's email address
 * - password: string - Admin's password
 *
 * Returns:
 * - 200: { success: true, user: { id, email, role } }
 * - 400: { error: "Email and password are required" }
 * - 401: { error: "Invalid email or password" }
 * - 403: { error: "Account does not have admin access" }
 * - 500: { error: "Internal server error" }
 */
export async function POST(request: Request) {
  try {
    // Parse the request body
    const body = await request.json();
    const { email, password } = body;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Create Supabase client
    const supabase = await createClient();

    // Attempt to sign in with email/password
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    // Check for auth errors
    if (authError) {
      // Supabase returns "Invalid login credentials" for wrong email/password
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Auth succeeded - now check if user has admin role
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", authData.user.id)
      .single();

    if (profileError) {
      // User authenticated but no profile - sign them out and reject
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: "Account does not have admin access" },
        { status: 403 }
      );
    }

    const userRole = (profile.role as UserRole) ?? "public";

    // Check if user has an admin role
    if (!ADMIN_ROLES.includes(userRole)) {
      // Wrong role - sign them out and reject
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: "Account does not have admin access" },
        { status: 403 }
      );
    }

    // Success! User is authenticated and has admin access
    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        role: userRole,
      },
    });
  } catch (error) {
    console.error("Admin login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
