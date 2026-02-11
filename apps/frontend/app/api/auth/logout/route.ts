import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * User Logout API Route
 *
 * POST /api/auth/logout
 *
 * Signs out the current user by destroying their session.
 * This is idempotent - calling logout when not logged in still returns success.
 *
 * Returns:
 * - 200: { success: true }
 * - 500: { error: "Failed to sign out" }
 */
export async function POST() {
  try {
    const supabase = await createClient();

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Logout error:", error.message);
      return NextResponse.json(
        { error: "Failed to sign out" },
        { status: 500 }
      );
    }

    const res = NextResponse.json({ success: true });
    // Clear cached role cookie
    res.cookies.delete("x-iris-role");
    return res;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "Failed to sign out" },
      { status: 500 }
    );
  }
}
