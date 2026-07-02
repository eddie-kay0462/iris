#!/usr/bin/env npx tsx
/**
 * Cleanup Test Ally Sales — go-live migration helper
 *
 * Deletes ally_sales (the Allies section's orders). Deleting a sale cascades to
 * ally_sale_items and ally_sale_refunds. The ally accounts themselves and the
 * `allies` table are never touched (ally_sales.ally_id is ON DELETE RESTRICT).
 *
 * Choose the target one of three ways:
 *   --ally-email=EMAIL   delete every sale belonging to that ally (default:
 *                        testally@1nri.store — the seeded test ally)
 *   --orders=ALS-1,ALS-2 delete specific sale numbers
 *   --file=path          newline/comma-separated ALS- numbers
 *
 * Dry-run by default; add --confirm to actually delete.
 *
 * Run with:
 *   cd apps/frontend
 *   set -a && source .env.local && set +a
 *   npx tsx scripts/cleanup-test-ally-sales.ts                 # dry run, test ally
 *   npx tsx scripts/cleanup-test-ally-sales.ts --confirm       # delete test ally's sales
 *   npx tsx scripts/cleanup-test-ally-sales.ts --orders=ALS-801599 --confirm
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
const DEFAULT_TEST_ALLY_EMAIL = "testally@1nri.store";

function argValue(prefix: string): string | null {
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : null;
}

function collectOrderNumbers(): string[] {
  const out: string[] = [];
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--orders=")) out.push(...arg.slice("--orders=".length).split(","));
    else if (arg.startsWith("--file=")) {
      out.push(...readFileSync(arg.slice("--file=".length), "utf8").split(/[\r\n,]+/));
    }
  }
  return Array.from(new Set(out.map((s) => s.trim().toUpperCase()).filter(Boolean)));
}

async function main() {
  console.log("═══════════════════════════════════════");
  console.log("  IRIS — Test Ally Sales Cleanup");
  console.log(`  Mode: ${CONFIRM ? "DELETE (--confirm)" : "DRY RUN"}`);
  console.log("═══════════════════════════════════════\n");

  const explicitNumbers = collectOrderNumbers();

  // Resolve the set of sale rows to delete.
  let query = supabase
    .from("ally_sales")
    .select("id, order_number, status, customer_name, customer_email, total, ally_id, allies!inner(email), ally_sale_items(quantity)");

  if (explicitNumbers.length) {
    const bad = explicitNumbers.filter((n) => !n.startsWith("ALS-"));
    if (bad.length) {
      console.error(`Refusing to run — not ALS- sale numbers: ${bad.join(", ")}\n`);
      process.exit(1);
    }
    query = query.in("order_number", explicitNumbers);
    console.log(`Target: ${explicitNumbers.length} explicit sale number(s)\n`);
  } else {
    const allyEmail = argValue("--ally-email=") ?? DEFAULT_TEST_ALLY_EMAIL;
    query = query.eq("allies.email", allyEmail);
    console.log(`Target: all sales belonging to ally ${allyEmail}\n`);
  }

  const { data: sales, error } = await query;
  if (error) throw error;

  const found = sales ?? [];
  if (found.length === 0) {
    console.log("No matching ally sales found. Nothing to do.\n");
    return;
  }

  let totalUnits = 0;
  console.log(`Ally sales matched (${found.length}):`);
  for (const s of found) {
    const units = ((s.ally_sale_items as any[]) ?? []).reduce((n, i) => n + (i.quantity ?? 0), 0);
    totalUnits += units;
    console.log(
      `  ${s.order_number}  status=${s.status}  ${s.customer_name ?? "-"}  GHS${s.total}  units=${units}`,
    );
  }
  console.log(`\n  Total: ${found.length} sales, ${totalUnits} units\n`);

  if (CONFIRM) {
    const ids = found.map((s) => s.id);
    const { error: delErr } = await supabase.from("ally_sales").delete().in("id", ids);
    if (delErr) console.error("  ✗ ally_sales:", delErr.message);
    else console.log(`  ✓ Deleted ${ids.length} ally sales (+ items + refunds via cascade)\n`);
  } else {
    console.log("Dry run complete. Re-run with --confirm to delete.\n");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
