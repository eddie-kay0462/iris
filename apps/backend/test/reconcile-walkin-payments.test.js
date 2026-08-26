/**
 * Self-contained behavioural tests for the stranded-MoMo-walk-in sweep.
 * No jest in this repo — run against the compiled build:
 *   npx nest build && node test/reconcile-walkin-payments.test.js
 *
 * Covers reconcileAwaitingPayments()'s decision tree (recover / cancel / skip),
 * the DB query it issues, and the guards that stop it touching a paid sale.
 */
const assert = require('assert');
const { WalkinSalesService } = require('../dist/walkin-sales/walkin-sales.service');

let passed = 0;
function test(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      passed += 1;
      console.log(`  ✓ ${name}`);
    })
    .catch((err) => {
      console.error(`  ✗ ${name}`);
      console.error('    ', err.message);
      process.exitCode = 1;
    });
}

/** Minimal chainable Supabase-style builder that records calls and is awaitable. */
function makeBuilder(result, calls) {
  const builder = {
    from(t) { calls.push(['from', t]); return this; },
    select(...a) { calls.push(['select', ...a]); return this; },
    update(payload) { calls.push(['update', payload]); return this; },
    delete(...a) { calls.push(['delete', ...a]); return this; },
    eq(...a) { calls.push(['eq', ...a]); return this; },
    is(...a) { calls.push(['is', ...a]); return this; },
    not(...a) { calls.push(['not', ...a]); return this; },
    lt(...a) { calls.push(['lt', ...a]); return this; },
    order(...a) { calls.push(['order', ...a]); return this; },
    limit(...a) { calls.push(['limit', ...a]); return this; },
    maybeSingle() { calls.push(['maybeSingle']); return Promise.resolve(result); },
    single() { calls.push(['single']); return Promise.resolve(result); },
    then(resolve, reject) { return Promise.resolve(result).then(resolve, reject); },
  };
  return builder;
}

/**
 * `results` is a queue: each db.from() call shifts the next entry. The sweep
 * issues the list query first, then one update per order it cancels.
 */
function makeService(results, capturedCalls, { secret = 'sk_test_x' } = {}) {
  const queue = [...results];
  const client = {
    from(table) {
      const calls = [];
      capturedCalls.push({ table, calls });
      const result = queue.shift() || { data: null, error: null };
      const b = makeBuilder(result, calls);
      calls.push(['from', table]);
      return b;
    },
  };
  const supabase = { getAdminClient: () => client };
  const config = { get: (k, d) => (k === 'PAYSTACK_SECRET_KEY' ? secret : d) };
  const reverts = [];
  const discountEngine = {
    revertForOrder: async (...a) => { reverts.push(a); },
  };
  // Constructor arg order: supabase, config, email, sms, preorders, discountEngine
  const svc = new WalkinSalesService(supabase, config, {}, {}, {}, discountEngine);
  svc.__reverts = reverts;
  return svc;
}

function mockFetch(statusByRef) {
  global.fetch = async (url) => {
    const ref = decodeURIComponent(String(url).split('/').pop());
    const status = statusByRef[ref];
    if (status === '__throw__') throw new Error('network down');
    return { ok: true, json: async () => ({ data: { status } }) };
  };
}

const HOUR = 3600_000;
const iso = (msAgo) => new Date(Date.now() - msAgo).toISOString();
const row = (over = {}) => ({
  id: 'w1',
  order_number: 'WLK-2026-0016',
  payment_reference: 'ref_ok',
  created_at: iso(10 * 60_000),
  ...over,
});

async function main() {
  console.log('reconcileAwaitingPayments:');

  // 1. Paystack says success → the sale is recovered.
  await test('success → recovered via completeByReference', async () => {
    mockFetch({ ref_ok: 'success' });
    const captured = [];
    const svc = makeService([{ data: [row()], error: null }], captured);
    let completedRef = null;
    svc.completeByReference = async (ref) => { completedRef = ref; return true; };
    const res = await svc.reconcileAwaitingPayments();
    assert.strictEqual(completedRef, 'ref_ok');
    assert.deepStrictEqual(res, { recovered: 1, cancelled: 0 });
  });

  // 2. completeByReference finding nothing to flip must not be counted.
  await test('success but already completed → not double-counted', async () => {
    mockFetch({ ref_ok: 'success' });
    const captured = [];
    const svc = makeService([{ data: [row()], error: null }], captured);
    svc.completeByReference = async () => false;
    const res = await svc.reconcileAwaitingPayments();
    assert.deepStrictEqual(res, { recovered: 0, cancelled: 0 });
  });

  // 3. Unpaid + older than 24h → cancelled, guarded, promo seat freed.
  await test('failed & >24h → cancelled with status guard, promo reverted', async () => {
    mockFetch({ ref_dead: 'failed' });
    const captured = [];
    const svc = makeService(
      [
        { data: [row({ payment_reference: 'ref_dead', created_at: iso(30 * HOUR) })], error: null },
        { data: { id: 'w1' }, error: null },
      ],
      captured,
    );
    svc.completeByReference = async () => { throw new Error('should not complete'); };
    const res = await svc.reconcileAwaitingPayments();
    assert.deepStrictEqual(res, { recovered: 0, cancelled: 1 });

    const calls = captured.flatMap((c) => c.calls);
    const update = calls.find((c) => c[0] === 'update');
    assert.deepStrictEqual(update[1], { status: 'cancelled' }, 'status set to cancelled');
    const guard = calls.some((c) => c[0] === 'eq' && c[1] === 'status' && c[2] === 'awaiting_payment');
    assert.ok(guard, 'cancel guarded by status=awaiting_payment');
    assert.strictEqual(svc.__reverts.length, 1, 'promo redemption reverted');
    assert.strictEqual(svc.__reverts[0][0], 'walkin_orders');
    assert.strictEqual(svc.__reverts[0][1], 'w1');
  });

  // 4. The guard matching nothing means someone else paid it — don't count it.
  await test('cancel guard matches nothing → not counted, promo left alone', async () => {
    mockFetch({ ref_dead: 'failed' });
    const captured = [];
    const svc = makeService(
      [
        { data: [row({ payment_reference: 'ref_dead', created_at: iso(30 * HOUR) })], error: null },
        { data: null, error: null },
      ],
      captured,
    );
    const res = await svc.reconcileAwaitingPayments();
    assert.deepStrictEqual(res, { recovered: 0, cancelled: 0 });
    assert.strictEqual(svc.__reverts.length, 0, 'promo not reverted');
  });

  // 5. Unpaid but young → left for the next tick.
  await test('abandoned & <24h → untouched', async () => {
    mockFetch({ ref_young: 'abandoned' });
    const captured = [];
    const svc = makeService(
      [{ data: [row({ payment_reference: 'ref_young', created_at: iso(2 * HOUR) })], error: null }],
      captured,
    );
    const res = await svc.reconcileAwaitingPayments();
    assert.deepStrictEqual(res, { recovered: 0, cancelled: 0 });
    assert.ok(!captured.flatMap((c) => c.calls).some((c) => c[0] === 'update'), 'no update issued');
  });

  // 6. "Don't know" must never be read as "not paid" — this is the one that
  //    would cancel a paid sale if it were wrong.
  await test('Paystack lookup fails & >24h → skipped, never cancelled', async () => {
    mockFetch({ ref_down: '__throw__' });
    const captured = [];
    const svc = makeService(
      [{ data: [row({ payment_reference: 'ref_down', created_at: iso(30 * HOUR) })], error: null }],
      captured,
    );
    const res = await svc.reconcileAwaitingPayments();
    assert.deepStrictEqual(res, { recovered: 0, cancelled: 0 });
    assert.ok(!captured.flatMap((c) => c.calls).some((c) => c[0] === 'update'), 'no update issued');
  });

  // 7. One bad order must not stall the rest of the batch.
  await test('one order throwing → the others still processed', async () => {
    mockFetch({ ref_bad: 'success', ref_ok: 'success' });
    const captured = [];
    const svc = makeService(
      [{ data: [row({ id: 'bad', payment_reference: 'ref_bad' }), row({ id: 'w2' })], error: null }],
      captured,
    );
    svc.completeByReference = async (ref) => {
      if (ref === 'ref_bad') throw new Error('boom');
      return true;
    };
    const res = await svc.reconcileAwaitingPayments();
    assert.deepStrictEqual(res, { recovered: 1, cancelled: 0 });
  });

  // 8. The query only picks up genuinely stuck, chargeable orders.
  await test('query filters: awaiting_payment, has reference, past grace', async () => {
    mockFetch({});
    const captured = [];
    const svc = makeService([{ data: [], error: null }], captured);
    await svc.reconcileAwaitingPayments();
    const calls = captured[0].calls;
    assert.strictEqual(captured[0].table, 'walkin_orders');
    assert.ok(calls.some((c) => c[0] === 'eq' && c[1] === 'status' && c[2] === 'awaiting_payment'));
    assert.ok(calls.some((c) => c[0] === 'not' && c[1] === 'payment_reference' && c[2] === 'is'));
    const grace = calls.find((c) => c[0] === 'lt' && c[1] === 'created_at');
    assert.ok(grace, 'grace cutoff applied');
    const cutoffAgo = Date.now() - new Date(grace[2]).getTime();
    assert.ok(cutoffAgo > 4 * 60_000 && cutoffAgo < 6 * 60_000, `grace ~5min, got ${cutoffAgo}ms`);
    assert.ok(calls.some((c) => c[0] === 'limit' && c[1] === 50), 'batch capped');
  });

  // 9. No Paystack key configured → no-op rather than a crash loop.
  await test('no PAYSTACK_SECRET_KEY → no-op, no query issued', async () => {
    const captured = [];
    const svc = makeService([], captured, { secret: '' });
    const res = await svc.reconcileAwaitingPayments();
    assert.deepStrictEqual(res, { recovered: 0, cancelled: 0 });
    assert.strictEqual(captured.length, 0, 'no DB call made');
  });

  console.log(`\n${passed} passed`);
}

main();
