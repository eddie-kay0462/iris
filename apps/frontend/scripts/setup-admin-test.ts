#!/usr/bin/env npx tsx
/**
 * Setup Admin Test Environment
 *
 * This script sets up everything needed to test the admin login flow:
 * 1. Checks database for role column (provides SQL if missing)
 * 2. Creates test admin user via Supabase Admin API
 * 3. Verifies the setup is complete
 *
 * Run with: npx tsx scripts/setup-admin-test.ts
 *
 * Prerequisites:
 * - .env.local with Supabase credentials (see .env.local.example)
 */

import { createClient } from "@supabase/supabase-js";

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const TEST_ADMIN = {
  email: "admin@iris.test",
  password: "TestAdmin123!",
  role: "admin" as const,
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function printBox(title: string) {
  const line = "═".repeat(60);
  console.log(`╔${line}╗`);
  console.log(`║  ${title.padEnd(58)}║`);
  console.log(`╚${line}╝`);
}

function printStep(step: number, message: string) {
  console.log(`\n${step}. ${message}`);
}

function printSuccess(message: string) {
  console.log(`   ✓ ${message}`);
}

function printError(message: string) {
  console.log(`   ✗ ${message}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Script
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  printBox("Admin Login Test Setup");
  console.log();

  // Check environment variables
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing required environment variables!\n");
    console.error("Please fill in your .env.local file:");
    console.error("  NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co");
    console.error("  SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...\n");
    console.error("Find these in: Supabase Dashboard > Project Settings > API\n");
    process.exit(1);
  }

  // Create admin client
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ─── Step 1: Check Database Schema ───────────────────────────────────────
  printStep(1, "Checking database schema...");

  const { error: checkError } = await supabase
    .from("profiles")
    .select("role")
    .limit(1);

  if (checkError?.message?.includes("does not exist")) {
    printError("Role column is missing from profiles table!\n");
    console.log("   Please run this SQL in the Supabase SQL Editor:\n");
    console.log("   ────────────────────────────────────────────────────────");
    console.log(`
   -- Add role column to profiles table
   ALTER TABLE public.profiles
   ADD COLUMN IF NOT EXISTS role public.user_role DEFAULT 'public';

   -- Create index for faster role lookups
   CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
`);
    console.log("   ────────────────────────────────────────────────────────");
    console.log("\n   After running the SQL, run this script again.\n");
    process.exit(1);
  } else if (checkError) {
    printError(`Database error: ${checkError.message}`);
    process.exit(1);
  }

  printSuccess("Role column exists in profiles table");

  // ─── Step 2: Create/Update Auth User ─────────────────────────────────────
  printStep(2, "Creating admin auth user...");

  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existingUser = existingUsers?.users.find(
    (u) => u.email === TEST_ADMIN.email
  );

  let userId: string;

  if (existingUser) {
    printSuccess(`User already exists: ${existingUser.id}`);
    userId = existingUser.id;

    // Update password
    await supabase.auth.admin.updateUserById(userId, {
      password: TEST_ADMIN.password,
    });
    printSuccess("Password updated");
  } else {
    const { data: newUser, error: createError } =
      await supabase.auth.admin.createUser({
        email: TEST_ADMIN.email,
        password: TEST_ADMIN.password,
        email_confirm: true,
      });

    if (createError) {
      printError(`Failed to create user: ${createError.message}`);
      process.exit(1);
    }

    printSuccess(`User created: ${newUser.user.id}`);
    userId = newUser.user.id;
  }

  // ─── Step 3: Set Admin Role in Profile ───────────────────────────────────
  printStep(3, "Setting admin role in profile...");

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: userId,
      email: TEST_ADMIN.email,
      role: TEST_ADMIN.role,
    },
    { onConflict: "id" }
  );

  if (profileError) {
    printError(`Failed to set profile: ${profileError.message}`);
    process.exit(1);
  }

  printSuccess(`Profile updated with role: ${TEST_ADMIN.role}`);

  // ─── Step 4: Verify Setup ────────────────────────────────────────────────
  printStep(4, "Verifying setup...");

  const { data: profile, error: verifyError } = await supabase
    .from("profiles")
    .select("id, email, role")
    .eq("id", userId)
    .single();

  if (verifyError || !profile) {
    printError(`Verification failed: ${verifyError?.message}`);
    process.exit(1);
  }

  printSuccess("Setup verified:");
  console.log(`     ID:    ${profile.id}`);
  console.log(`     Email: ${profile.email}`);
  console.log(`     Role:  ${profile.role}`);

  // ─── Success ─────────────────────────────────────────────────────────────
  console.log("\n");
  printBox("SUCCESS! Ready to test admin login");
  console.log(`
Test credentials:
  Email:    ${TEST_ADMIN.email}
  Password: ${TEST_ADMIN.password}

Next steps:
  1. Start the dev server: npm run dev
  2. Go to: http://localhost:3000/admin/login
  3. Log in with the test credentials
  4. You should be redirected to /admin/dashboard
`);
}

main().catch(console.error);
