/**
 * Create Test Admin User
 *
 * This script creates a test admin user for development/testing purposes.
 * It uses the Supabase Admin API (service role key) to:
 * 1. Create the auth user with email/password
 * 2. Create/update the profile with admin role
 *
 * Run with: npx tsx scripts/create-admin-user.ts
 *
 * Requirements:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY (found in Project Settings > API)
 *
 * Test credentials:
 * - Email: admin@iris.test
 * - Password: TestAdmin123!
 */

import { createClient } from "@supabase/supabase-js";

// Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Test admin credentials
const TEST_ADMIN = {
  email: "admin@iris.test",
  password: "TestAdmin123!",
  role: "admin" as const,
};

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("╔══════════════════════════════════════════════════════════╗");
  console.error("║  Missing Required Environment Variables                   ║");
  console.error("╚══════════════════════════════════════════════════════════╝");
  console.error("\nRequired environment variables:");
  console.error("  - NEXT_PUBLIC_SUPABASE_URL");
  console.error("  - SUPABASE_SERVICE_ROLE_KEY");
  console.error("\nYou can find these in your Supabase Dashboard:");
  console.error("  Project Settings > API\n");
  console.error("Example:");
  console.error("  export NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co");
  console.error("  export SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...\n");
  process.exit(1);
}

// Create Supabase admin client (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createAdminUser() {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║  Creating Test Admin User                                 ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  try {
    // Step 1: Check if user already exists
    console.log("1. Checking if user already exists...");
    const { data: existingUsers, error: listError } =
      await supabase.auth.admin.listUsers();

    if (listError) {
      console.error("   ✗ Failed to list users:", listError.message);
      process.exit(1);
    }

    const existingUser = existingUsers.users.find(
      (u) => u.email === TEST_ADMIN.email
    );

    let userId: string;

    if (existingUser) {
      console.log(`   ✓ User already exists: ${existingUser.id}`);
      userId = existingUser.id;

      // Update password in case it changed
      console.log("\n2. Updating user password...");
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        userId,
        { password: TEST_ADMIN.password }
      );

      if (updateError) {
        console.error("   ✗ Failed to update password:", updateError.message);
      } else {
        console.log("   ✓ Password updated");
      }
    } else {
      // Step 2: Create the auth user
      console.log("   User not found. Creating new user...\n");
      console.log("2. Creating auth user...");

      const { data: newUser, error: createError } =
        await supabase.auth.admin.createUser({
          email: TEST_ADMIN.email,
          password: TEST_ADMIN.password,
          email_confirm: true, // Auto-confirm email for testing
        });

      if (createError) {
        console.error("   ✗ Failed to create user:", createError.message);
        process.exit(1);
      }

      console.log(`   ✓ User created: ${newUser.user.id}`);
      userId = newUser.user.id;
    }

    // Step 3: Create or update profile with admin role
    console.log("\n3. Setting admin role in profile...");

    // First, try to check if role column exists
    const { error: checkError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (checkError?.message?.includes("does not exist")) {
      console.error("   ✗ Role column does not exist in profiles table!");
      console.error("\n   Please run this SQL in the Supabase SQL Editor first:");
      console.error("   ─────────────────────────────────────────────────────");
      console.error(
        "   ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role public.user_role DEFAULT 'public';"
      );
      console.error("   ─────────────────────────────────────────────────────\n");
      process.exit(1);
    }

    // Upsert profile with admin role
    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        id: userId,
        email: TEST_ADMIN.email,
        role: TEST_ADMIN.role,
      },
      {
        onConflict: "id",
      }
    );

    if (profileError) {
      console.error("   ✗ Failed to set profile:", profileError.message);
      process.exit(1);
    }

    console.log(`   ✓ Profile updated with role: ${TEST_ADMIN.role}`);

    // Step 4: Verify the setup
    console.log("\n4. Verifying setup...");
    const { data: profile, error: verifyError } = await supabase
      .from("profiles")
      .select("id, email, role")
      .eq("id", userId)
      .single();

    if (verifyError || !profile) {
      console.error("   ✗ Failed to verify profile:", verifyError?.message);
      process.exit(1);
    }

    console.log("   ✓ Profile verified:");
    console.log(`     - ID: ${profile.id}`);
    console.log(`     - Email: ${profile.email}`);
    console.log(`     - Role: ${profile.role}`);

    // Success!
    console.log("\n╔══════════════════════════════════════════════════════════╗");
    console.log("║  SUCCESS! Test admin user is ready                       ║");
    console.log("╚══════════════════════════════════════════════════════════╝\n");
    console.log("Test credentials:");
    console.log(`  Email:    ${TEST_ADMIN.email}`);
    console.log(`  Password: ${TEST_ADMIN.password}`);
    console.log("\nLogin at: http://localhost:3000/admin/login\n");
  } catch (error) {
    console.error("Unexpected error:", error);
    process.exit(1);
  }
}

createAdminUser();
