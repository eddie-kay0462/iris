#!/usr/bin/env npx tsx
/**
 * Cleanup Test Orders — go-live migration helper
 *
 * Deletes ONLY the specific order numbers you pass in. Nothing is matched by
 * wildcard. Pop-up data (popup_events / popup_orders / popup_order_items /
 * popup_refunds / popup_split_payments) and ally_sales are never touched.
 *
 *   IRD-…  → orders            (+ order_items, order_status_history via cascade,
 *                               + inventory_movements, product_reviews cleaned)
 *   PRE-…  → preorders         (+ preorder_refunds via cascade)
 *
 * Dry-run by default: prints exactly what WOULD be deleted. Add --confirm to
 * actually delete.
 *
 * Run with:
 *   cd apps/frontend
 *   set -a && source .env.local && set +a
 *   # dry run:
 *   npx tsx scripts/cleanup-test-orders.ts --orders=IRD-000001,IRD-000002,PRE-000001
 *   npx tsx scripts/cleanup-test-orders.ts --file=test-orders.txt
 *   # then, once the list looks right:
 *   npx tsx scripts/cleanup-test-orders.ts --file=test-orders.txt --confirm
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

// ── Arg parsing ──────────────────────────────────────────────────────────────

function collectOrderNumbers(): string[] {
  const out: string[] = [];
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--orders=")) {
      out.push(...arg.slice("--orders=".length).split(","));
    } else if (arg.startsWith("--file=")) {
      const contents = readFileSync(arg.slice("--file=".length), "utf8");
      out.push(...contents.split(/[\r\n,]+/));
    } else if (!arg.startsWith("--")) {
      out.push(arg);
    }
  }
  return Array.from(
    new Set(out.map((s) => s.trim().toUpperCase()).filter(Boolean)),
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════");
  console.log("  IRIS — Test Order Cleanup");
  console.log(`  Mode: ${CONFIRM ? "DELETE (--confirm)" : "DRY RUN"}`);
  console.log("═══════════════════════════════════════\n");

  const requested = collectOrderNumbers();
  if (requested.length === 0) {
    console.error("No order numbers provided. Pass --orders=... or --file=path.\n");
    process.exit(1);
  }

  const irdNumbers = requested.filter((n) => n.startsWith("IRD-"));
  const preNumbers = requested.filter((n) => n.startsWith("PRE-"));
  const unknown = requested.filter((n) => !n.startsWith("IRD-") && !n.startsWith("PRE-"));

  if (unknown.length) {
    console.error(`Refusing to run — these are not IRD-/PRE- order numbers:\n  ${unknown.join(", ")}\n`);
    process.exit(1);
  }

  // ── Online orders (IRD-) ──────────────────────────────────────────────────
  if (irdNumbers.length) {
    const { data: orders, error } = await supabase
      .from("orders")
      .select("id, order_number, status, email, order_items(id)")
      .in("order_number", irdNumbers);
    if (error) throw error;

    const found = orders ?? [];
    const foundNumbers = new Set(found.map((o) => o.order_number));
    const missing = irdNumbers.filter((n) => !foundNumbers.has(n));

    console.log(`Online orders (${found.length} of ${irdNumbers.length} requested found):`);
    for (const o of found) {
      console.log(
        `  ${o.order_number}  status=${o.status}  ${o.email}  items=${(o.order_items as any[])?.length ?? 0}`,
      );
    }
    if (missing.length) console.log(`  ⚠ not found: ${missing.join(", ")}`);
    console.log("");

    if (CONFIRM && found.length) {
      const ids = found.map((o) => o.id);

      const { error: mvErr } = await supabase
        .from("inventory_movements")
        .delete()
        .in("reference_id", ids);
      if (mvErr) console.error("  ✗ inventory_movements:", mvErr.message);
      else console.log("  ✓ Cleaned inventory_movements");

      const { error: rvErr } = await supabase
        .from("product_reviews")
        .delete()
        .in("order_id", ids);
      if (rvErr) console.error("  ✗ product_reviews:", rvErr.message);
      else console.log("  ✓ Cleaned product_reviews");

      const { error: ordErr } = await supabase.from("orders").delete().in("id", ids);
      if (ordErr) console.error("  ✗ orders:", ordErr.message);
      else console.log(`  ✓ Deleted ${ids.length} orders (+ items + history via cascade)\n`);
    }
  }

  // ── Preorders (PRE-) ──────────────────────────────────────────────────────
  if (preNumbers.length) {
    const { data: preorders, error } = await supabase
      .from("preorders")
      .select("id, order_number, status, customer_email, product_name, quantity")
      .in("order_number", preNumbers);
    if (error) throw error;

    const found = preorders ?? [];
    const foundNumbers = new Set(found.map((p) => p.order_number));
    const missing = preNumbers.filter((n) => !foundNumbers.has(n));

    console.log(`Preorders (${found.length} of ${preNumbers.length} requested found):`);
    for (const p of found) {
      console.log(
        `  ${p.order_number}  status=${p.status}  ${p.customer_email}  ${p.product_name} × ${p.quantity}`,
      );
    }
    if (missing.length) console.log(`  ⚠ not found: ${missing.join(", ")}`);
    console.log("");

    if (CONFIRM && found.length) {
      const ids = found.map((p) => p.id);
      const { error: delErr } = await supabase.from("preorders").delete().in("id", ids);
      if (delErr) console.error("  ✗ preorders:", delErr.message);
      else console.log(`  ✓ Deleted ${ids.length} preorders (+ refunds via cascade)\n`);
    }
  }

  if (!CONFIRM) {
    console.log("Dry run complete. Re-run with --confirm to delete.\n");
  } else {
    console.log("Cleanup complete.\n");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
