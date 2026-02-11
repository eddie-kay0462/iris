import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withAuth, type AuthContext } from "@/lib/auth/middleware";

/**
 * User Profile API Route
 *
 * GET /api/profile
 * Returns the authenticated user's profile.
 *
 * PUT /api/profile
 * Updates the authenticated user's profile.
 * Only allows updating safe fields (not role, id, etc.)
 *
 * Both endpoints require authentication.
 */

/**
 * GET /api/profile
 *
 * Returns the authenticated user's full profile.
 *
 * Returns:
 * - 200: Profile object
 * - 401: { error: "Authentication required" }
 * - 404: { error: "Profile not found" }
 * - 500: { error: "Internal server error" }
 */
export const GET = withAuth(async (request: Request, { user }: AuthContext) => {
  try {
    const supabase = await createClient();

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.profile.id)
      .single();

    if (error || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Get profile error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});

/**
 * PUT /api/profile
 *
 * Updates the authenticated user's profile.
 * Only specified fields in allowedFields can be updated.
 * Attempting to update role, id, etc. will be silently ignored.
 *
 * Request body (all fields optional):
 * - first_name: string
 * - last_name: string
 * - phone_number: string
 * - email_notifications: boolean
 * - sms_notifications: boolean
 *
 * Returns:
 * - 200: { success: true, profile: {...} }
 * - 400: { error: "No valid fields to update" }
 * - 401: { error: "Authentication required" }
 * - 500: { error: "Internal server error" }
 */
export const PUT = withAuth(async (request: Request, { user }: AuthContext) => {
  try {
    const body = await request.json();

    // Whitelist of fields users are allowed to update
    // This prevents them from escalating privileges by changing their role
    const allowedFields = [
      "first_name",
      "last_name",
      "phone_number",
      "email_notifications",
      "sms_notifications",
    ];

    // Filter to only allowed fields
    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field];
      }
    }

    // Check if there's anything to update
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data: profile, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.profile.id)
      .select()
      .single();

    if (error) {
      console.error("Update profile error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, profile });
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});
