/**
 * Migration: Add Role Column to Profiles Table
 *
 * This script adds the `role` column to the profiles table using the
 * existing `user_role` enum type (public, admin, manager, staff).
 *
 * The user_role enum already exists in the database schema.
 * This migration simply adds the role column with a default of 'public'.
 *
 * Run with: npx tsx scripts/migrate-add-role.ts
 *
 * Requirements:
 * - SUPABASE_DB_URL environment variable (PostgreSQL connection string)
 *   Format: postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
 */

import { createClient } from "@supabase/supabase-js";

// Configuration - these should be set as environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Error: Missing required environment variables");
  console.error("Required:");
  console.error("  - NEXT_PUBLIC_SUPABASE_URL");
  console.error("  - SUPABASE_SERVICE_ROLE_KEY");
  console.error("\nYou can find these in your Supabase project settings.");
  process.exit(1);
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function migrate() {
  console.log("Starting migration: Add role column to profiles table\n");

  try {
    // Check if role column already exists by attempting to select it
    const { error: checkError } = await supabase
      .from("profiles")
      .select("role")
      .limit(1);

    if (!checkError) {
      console.log("✓ Role column already exists in profiles table");
      console.log("  Migration has already been applied.\n");
      return;
    }

    // If we get a column not found error, we need to add it
    if (
      checkError.message.includes("column") &&
      checkError.message.includes("does not exist")
    ) {
      console.log("Role column not found. Adding it now...\n");

      // Execute raw SQL to add the column
      // We need to use the Supabase SQL Editor API or pg package for this
      // Since we're using the Supabase client, we'll use the rpc function
      // However, this requires a custom function. Let's use a different approach.

      // The Supabase client doesn't support raw DDL statements directly.
      // We'll need to use the Management API or create the column manually.
      // For automation, let's provide clear instructions.

      console.log("╔══════════════════════════════════════════════════════════╗");
      console.log("║  MANUAL STEP REQUIRED                                     ║");
      console.log("╚══════════════════════════════════════════════════════════╝");
      console.log("\nThe Supabase JS client cannot execute DDL statements.");
      console.log("Please run this SQL in your Supabase SQL Editor:\n");
      console.log("────────────────────────────────────────────────────────────");
      console.log(`
-- Add role column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS role public.user_role DEFAULT 'public';

-- Create index for role lookups
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Verify the change
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'role';
`);
      console.log("────────────────────────────────────────────────────────────");
      console.log("\nAfter running this SQL, run the create-admin-user.ts script.\n");

      process.exit(1);
    } else {
      // Some other error occurred
      console.error("Error checking for role column:", checkError.message);
      process.exit(1);
    }
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrate();
