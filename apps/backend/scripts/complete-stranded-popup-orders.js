/**
 * One-off: settle pop-up orders left stranded in 'active'.
 *
 * Until now only cash completed itself when a sale was rung up. Bank transfers,
 * hand-typed MoMo references and anything held were created as 'active', which
 * is in no revenue whitelist — so a pop-up run on those payment types reported
 * GH₵ 0.00 while the orders sat in a tab waiting for someone to find "Mark as
 * Completed" in a row menu. Nobody ever did. That money is real and was never
 * counted.
 *
 * This marks those orders completed so their revenue and units finally count.
 *
 * It deliberately does NOT deduct stock. Those goods left the stand weeks ago
 * and any stock take since already reflects it; deducting now would take the
 * same units off twice. Promo seats are left alone for the same reason.
 *
 * Usage (from apps/backend):
 *   node scripts/complete-stranded-popup-orders.js            # dry run, lists only
 *   node scripts/complete-stranded-popup-orders.js --apply    # actually writes
 *
 * Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment, the same
 * two the backend itself runs on.
 */
const { createClient } = require('@supabase/supabase-js');

const APPLY = process.argv.includes('--apply');

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running.');
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });

const money = (n) => `GH₵ ${Number(n ?? 0).toFixed(2)}`;

async function main() {
  const { data: orders, error } = await db
    .from('popup_orders')
    .select('id, order_number, total, created_at, payment_method, event_id, popup_events(name)')
    .eq('status', 'active')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Could not read the stranded orders:', error.message);
    process.exit(1);
  }

  if (!orders || orders.length === 0) {
    console.log('Nothing stranded — every pop-up order has a settled status.');
    return;
  }

  // Grouped by event, because that is how anyone will sanity-check the numbers
  // against what they remember taking on the day.
  const byEvent = new Map();
  for (const o of orders) {
    const name = o.popup_events?.name ?? '(unknown event)';
    if (!byEvent.has(name)) byEvent.set(name, []);
    byEvent.get(name).push(o);
  }

  let grandTotal = 0;
  console.log(
    `\n${orders.length} stranded order${orders.length === 1 ? '' : 's'} across ${byEvent.size} pop-up${byEvent.size === 1 ? '' : 's'}:\n`,
  );

  for (const [eventName, rows] of byEvent) {
    const eventTotal = rows.reduce((s, o) => s + Number(o.total ?? 0), 0);
    grandTotal += eventTotal;
    console.log(`  ${eventName} — ${rows.length} order(s), ${money(eventTotal)}`);
    for (const o of rows) {
      console.log(
        `    ${o.order_number.padEnd(16)} ${money(o.total).padStart(14)}  ` +
          `${(o.payment_method ?? 'unknown').padEnd(14)} ${o.created_at.slice(0, 10)}`,
      );
    }
    console.log('');
  }

  console.log(`  Total revenue to be recognised: ${money(grandTotal)}\n`);

  if (!APPLY) {
    console.log('Dry run — nothing was written. Re-run with --apply to commit.\n');
    return;
  }

  // Guarded on the status so anything settled since this list was read is left
  // alone rather than overwritten.
  const ids = orders.map((o) => o.id);
  const { data: updated, error: updateError } = await db
    .from('popup_orders')
    .update({ status: 'completed' })
    .in('id', ids)
    .eq('status', 'active')
    .select('id');

  if (updateError) {
    console.error('Could not complete the orders:', updateError.message);
    process.exit(1);
  }

  console.log(
    `Completed ${updated?.length ?? 0} order(s). Stock was deliberately left untouched.\n`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
