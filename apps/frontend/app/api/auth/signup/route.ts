import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * User Signup API Route
 *
 * POST /api/auth/signup
 *
 * Registers a new user with email and password.
 * Creates both an auth user and a profile record.
 *
 * Request body:
 * - email: string - User's email address (required)
 * - password: string - User's password, min 8 characters (required)
 * - first_name?: string - User's first name
 * - last_name?: string - User's last name
 * - phone_number?: string - User's phone number
 *
 * Returns:
 * - 201: { success: true, user: { id, email } }
 * - 400: { error: "Email and password are required" }
 * - 400: { error: "Password must be at least 8 characters" }
 * - 400: { error: "Invalid email format" }
 * - 409: { error: "User already registered" }
 * - 500: { error: "Internal server error" }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, first_name, last_name, phone_number } = body;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Validate email format (basic check)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      // Check for common error cases
      if (authError.message.includes("already registered")) {
        return NextResponse.json(
          { error: "User already registered" },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // Supabase returns a user even when email exists but is unconfirmed
    // Check if this is a real new user or a duplicate
    if (!authData.user) {
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 400 }
      );
    }

    // Create profile record
    // Note: If RLS blocks this, the user will have an auth account but no profile
    // The session helper handles this gracefully by treating them as a "public" user
    const { error: profileError } = await supabase.from("profiles").insert({
      id: authData.user.id,
      email: authData.user.email,
      first_name: first_name || null,
      last_name: last_name || null,
      phone_number: phone_number || null,
      role: "public",
    });

    if (profileError) {
      // Log the error but don't fail the signup
      // The user can still use the app, they just won't have a profile yet
      console.error("Failed to create profile:", profileError.message);
    }

    return NextResponse.json(
      {
        success: true,
        user: {
          id: authData.user.id,
          email: authData.user.email,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
