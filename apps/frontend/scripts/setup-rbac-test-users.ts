/**
 * Setup RBAC Test Users
 *
 * This script creates test users for each role level in the system.
 * Used to verify the RBAC (Role-Based Access Control) system works correctly.
 *
 * Run with:
 *   cd apps/frontend
 *   set -a && source .env.local && set +a && npx tsx scripts/setup-rbac-test-users.ts
 *
 * Requirements:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 *
 * Test users created:
 * - admin@iris.test (role: admin) - Full system access
 * - manager@iris.test (role: manager) - Can manage products, orders, inventory
 * - staff@iris.test (role: staff) - Can view and process orders
 * - customer@iris.test (role: public) - Regular customer, no admin access
 *
 * All passwords: TestUser123!
 */

import { createClient } from "@supabase/supabase-js";

// Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Test users to create
const TEST_USERS = [
  { email: "admin@iris.test", role: "admin", name: "Admin User" },
  { email: "manager@iris.test", role: "manager", name: "Manager User" },
  { email: "staff@iris.test", role: "staff", name: "Staff User" },
  { email: "customer@iris.test", role: "public", name: "Customer User" },
] as const;

// Common password for all test users
const TEST_PASSWORD = "TestUser123!";

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("╔══════════════════════════════════════════════════════════╗");
  console.error("║  Missing Required Environment Variables                   ║");
  console.error("╚══════════════════════════════════════════════════════════╝");
  console.error("\nRequired environment variables:");
  console.error("  - NEXT_PUBLIC_SUPABASE_URL");
  console.error("  - SUPABASE_SERVICE_ROLE_KEY");
  console.error("\nRun with:");
  console.error("  set -a && source .env.local && set +a && npx tsx scripts/setup-rbac-test-users.ts\n");
  process.exit(1);
}

// Create Supabase admin client (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Create or update a single test user
 */
async function setupUser(user: (typeof TEST_USERS)[number]): Promise<boolean> {
  const { email, role, name } = user;
  console.log(`\n  Setting up ${role.toUpperCase()} user (${email})...`);

  try {
    // Check if user already exists
    const { data: existingUsers, error: listError } =
      await supabase.auth.admin.listUsers();

    if (listError) {
      console.error(`    ✗ Failed to list users: ${listError.message}`);
      return false;
    }

    const existingUser = existingUsers.users.find((u) => u.email === email);
    let userId: string;

    if (existingUser) {
      console.log(`    ✓ User exists: ${existingUser.id}`);
      userId = existingUser.id;

      // Update password to ensure it's correct
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        userId,
        { password: TEST_PASSWORD }
      );

      if (updateError) {
        console.error(`    ✗ Failed to update password: ${updateError.message}`);
        return false;
      }
      console.log(`    ✓ Password updated`);
    } else {
      // Create new user
      const { data: newUser, error: createError } =
        await supabase.auth.admin.createUser({
          email,
          password: TEST_PASSWORD,
          email_confirm: true, // Auto-confirm for testing
        });

      if (createError) {
        console.error(`    ✗ Failed to create user: ${createError.message}`);
        return false;
      }

      console.log(`    ✓ User created: ${newUser.user.id}`);
      userId = newUser.user.id;
    }

    // Extract first and last name
    const nameParts = name.split(" ");
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ") || null;

    // Upsert profile with role
    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        id: userId,
        email,
        role,
        first_name: firstName,
        last_name: lastName,
      },
      { onConflict: "id" }
    );

    if (profileError) {
      console.error(`    ✗ Failed to set profile: ${profileError.message}`);
      return false;
    }

    console.log(`    ✓ Profile set with role: ${role}`);
    return true;
  } catch (error) {
    console.error(`    ✗ Unexpected error:`, error);
    return false;
  }
}

async function main() {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║  RBAC Test Users Setup                                    ║");
  console.log("╚══════════════════════════════════════════════════════════╝");

  let successCount = 0;
  let failCount = 0;

  for (const user of TEST_USERS) {
    const success = await setupUser(user);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log("\n╔══════════════════════════════════════════════════════════╗");
  if (failCount === 0) {
    console.log("║  SUCCESS! All test users are ready                        ║");
  } else {
    console.log("║  PARTIAL SUCCESS - Some users failed                      ║");
  }
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  console.log(`Results: ${successCount} succeeded, ${failCount} failed\n`);

  console.log("Test credentials (all use the same password):");
  console.log("─────────────────────────────────────────────────────────────");
  for (const user of TEST_USERS) {
    const status = "✓"; // Simplified - could track individual results
    console.log(`  ${status} ${user.email.padEnd(25)} role: ${user.role}`);
  }
  console.log("─────────────────────────────────────────────────────────────");
  console.log(`  Password (all users): ${TEST_PASSWORD}`);
  console.log("");

  console.log("Next steps:");
  console.log("  1. Start dev server: npm run dev");
  console.log("  2. Run RBAC tests: bash scripts/test-rbac.sh");
  console.log("");

  process.exit(failCount > 0 ? 1 : 0);
}

main();
