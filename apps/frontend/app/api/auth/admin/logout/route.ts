import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Admin Logout API Route
 *
 * POST /api/auth/admin/logout
 *
 * Signs out the current admin user by destroying their session.
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
      return NextResponse.json(
        { error: "Failed to sign out" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin logout error:", error);
    return NextResponse.json(
      { error: "Failed to sign out" },
      { status: 500 }
    );
  }
}
