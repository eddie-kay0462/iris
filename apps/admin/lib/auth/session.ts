import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/rbac/permissions";

/**
 * User profile with role information
 */
export interface UserProfile {
  id: string;
  email: string | null;
  phone_number: string | null;
  first_name: string | null;
  last_name: string | null;
  role: UserRole;
}

/**
 * Session with user and profile information
 */
export interface AuthSession {
  user: {
    id: string;
    email?: string;
  };
  profile: UserProfile;
}

/**
 * Get the current session from Supabase
 * Returns null if no session exists
 */
export async function getSession() {
  const supabase = await createClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session) {
    return null;
  }

  return session;
}

/**
 * Get the authenticated user with their profile
 * Returns null if no authenticated user
 */
export async function getUser(): Promise<AuthSession | null> {
  const supabase = await createClient();

  // Get the authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  // Define the expected profile shape from the database
  // Note: This type bridges the gap when database.types.ts is out of sync
  interface ProfileRow {
    id: string;
    email: string | null;
    phone_number: string | null;
    first_name: string | null;
    last_name: string | null;
    role: string | null;
  }

  // Fetch the user's profile with role
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, phone_number, first_name, last_name, role")
    .eq("id", user.id)
    .single();

  // Type the profile data (Supabase returns unknown when types are out of sync)
  const typedProfile = profile as ProfileRow | null;

  if (profileError || !typedProfile) {
    // User exists in auth but no profile - treat as public user
    return {
      user: {
        id: user.id,
        email: user.email,
      },
      profile: {
        id: user.id,
        email: user.email ?? null,
        phone_number: null,
        first_name: null,
        last_name: null,
        role: "public",
      },
    };
  }

  return {
    user: {
      id: user.id,
      email: user.email,
    },
    profile: {
      id: typedProfile.id,
      email: typedProfile.email,
      phone_number: typedProfile.phone_number,
      first_name: typedProfile.first_name,
      last_name: typedProfile.last_name,
      // Default to 'public' if role is null/undefined
      role: (typedProfile.role as UserRole) ?? "public",
    },
  };
}

/**
 * Get the authenticated user or throw a 401 error
 * Use this in API routes that require authentication
 */
export async function requireUser(): Promise<AuthSession> {
  const authSession = await getUser();

  if (!authSession) {
    throw new AuthError("Authentication required", 401);
  }

  return authSession;
}

/**
 * Custom error class for auth-related errors
 */
export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number = 401
  ) {
    super(message);
    this.name = "AuthError";
  }
}
