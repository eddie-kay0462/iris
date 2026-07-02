#!/usr/bin/env npx tsx
/**
 * Cleanup Test Accounts — go-live migration helper
 *
 * Deletes ONLY the specific customer accounts (by email) you pass in. Deleting
 * the auth user cascades to its `profiles` row. Orders keep their history —
 * orders.user_id is ON DELETE SET NULL, so an account's orders become guest
 * orders rather than being removed (delete test ORDERS separately with
 * cleanup-test-orders.ts).
 *
 * Safety:
 *   - Nothing is matched by wildcard; only the emails you list.
 *   - Refuses to delete any profile that looks like a migrated real customer
 *     (migrated_from = 'shopify' or shopify_customer_id set) unless --force.
 *   - Prints the real-customer count before and after so you can confirm real
 *     accounts are untouched.
 *
 * Dry-run by default. Add --confirm to actually delete.
 *
 * Run with:
 *   cd apps/frontend
 *   set -a && source .env.local && set +a
 *   npx tsx scripts/cleanup-test-accounts.ts --emails=admin@iris.test,customer@iris.test
 *   npx tsx scripts/cleanup-test-accounts.ts --file=test-accounts.txt
 *   npx tsx scripts/cleanup-test-accounts.ts --file=test-accounts.txt --confirm
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const CONFIRM = process.argv.includes("--confirm");
const FORCE = process.argv.includes("--force");

// ── Arg parsing ──────────────────────────────────────────────────────────────

function collectEmails(): string[] {
  const out: string[] = [];
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--emails=")) {
      out.push(...arg.slice("--emails=".length).split(","));
    } else if (arg.startsWith("--file=")) {
      const contents = readFileSync(arg.slice("--file=".length), "utf8");
      out.push(...contents.split(/[\r\n,]+/));
    } else if (!arg.startsWith("--")) {
      out.push(arg);
    }
  }
  return Array.from(
    new Set(out.map((s) => s.trim().toLowerCase()).filter(Boolean)),
  );
}

async function realCustomerCount(): Promise<number> {
  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true });
  return count ?? 0;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════");
  console.log("  IRIS — Test Account Cleanup");
  console.log(`  Mode: ${CONFIRM ? "DELETE (--confirm)" : "DRY RUN"}${FORCE ? " [--force]" : ""}`);
  console.log("═══════════════════════════════════════\n");

  const emails = collectEmails();
  if (emails.length === 0) {
    console.error("No emails provided. Pass --emails=... or --file=path.\n");
    process.exit(1);
  }

  const before = await realCustomerCount();
  console.log(`Total profiles before: ${before}\n`);

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, email, role, created_at, migrated_from, shopify_customer_id")
    .in("email", emails);
  if (error) throw error;

  const found = profiles ?? [];
  const foundEmails = new Set(found.map((p) => (p.email ?? "").toLowerCase()));
  const missing = emails.filter((e) => !foundEmails.has(e));

  const migrated = found.filter((p) => p.migrated_from === "shopify" || p.shopify_customer_id);
  const deletable = FORCE ? found : found.filter((p) => !migrated.includes(p));

  console.log(`Accounts matched (${found.length} of ${emails.length} requested):`);
  for (const p of found) {
    const flag =
      p.migrated_from === "shopify" || p.shopify_customer_id ? "  ⚠ SHOPIFY-MIGRATED" : "";
    console.log(`  ${p.email}  role=${p.role}  created=${p.created_at?.slice(0, 10)}${flag}`);
  }
  if (missing.length) console.log(`  ⚠ not found: ${missing.join(", ")}`);
  console.log("");

  if (migrated.length && !FORCE) {
    console.log(
      `Skipping ${migrated.length} Shopify-migrated account(s) for safety. Use --force to include them.\n`,
    );
  }

  console.log(`Will delete ${deletable.length} account(s).\n`);

  if (CONFIRM) {
    let deleted = 0;
    for (const p of deletable) {
      const { error: delErr } = await supabase.auth.admin.deleteUser(p.id);
      if (delErr) console.error(`  ✗ ${p.email}: ${delErr.message}`);
      else {
        deleted++;
        console.log(`  ✓ Deleted ${p.email}`);
      }
    }
    const after = await realCustomerCount();
    console.log(`\nDeleted ${deleted} account(s).`);
    console.log(`Total profiles after: ${after} (expected ${before - deleted}).\n`);
  } else {
    console.log("Dry run complete. Re-run with --confirm to delete.\n");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
