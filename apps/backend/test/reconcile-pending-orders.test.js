/**
 * Self-contained behavioural tests for the never-paid-pending-order changes.
 * No jest in this repo — run against the compiled build:
 *   npx nest build && node test/reconcile-pending-orders.test.js
 *
 * Covers:
 *  - reconcilePendingOrders() decision tree (recover / clean / skip)
 *  - the DB query it issues (grace window, pending/pending filter)
 *  - findAdmin() excludes never-paid pending via the .or(...) filter
 */
const assert = require('assert');
const { OrdersService } = require('../dist/orders/orders.service');

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

/**
 * Minimal chainable Supabase-style query builder that records every call and is
 * awaitable. `result` is what awaiting the builder resolves to. `onUpdate`
 * captures the payload passed to .update() so tests can assert soft-deletes.
 */
function makeBuilder(result, calls) {
  const builder = {
    _update: undefined,
    from(t) { calls.push(['from', t]); return this; },
    select(...a) { calls.push(['select', ...a]); return this; },
    update(payload) { calls.push(['update', payload]); this._update = payload; return this; },
    eq(...a) { calls.push(['eq', ...a]); return this; },
    is(...a) { calls.push(['is', ...a]); return this; },
    or(...a) { calls.push(['or', ...a]); return this; },
    not(...a) { calls.push(['not', ...a]); return this; },
    in(...a) { calls.push(['in', ...a]); return this; },
    gte(...a) { calls.push(['gte', ...a]); return this; },
    lte(...a) { calls.push(['lte', ...a]); return this; },
    lt(...a) { calls.push(['lt', ...a]); return this; },
    order(...a) { calls.push(['order', ...a]); return this; },
    limit(...a) { calls.push(['limit', ...a]); return this; },
    maybeSingle() { calls.push(['maybeSingle']); return Promise.resolve(result); },
    single() { calls.push(['single']); return Promise.resolve(result); },
    then(resolve, reject) { return Promise.resolve(result).then(resolve, reject); },
  };
  return builder;
}

/** Build an OrdersService with a fake admin client keyed by table name. */
function makeService(tableResults, capturedCalls) {
  // tableResults: { orders: {data,error}, ... } or a function(table)->result
  const client = {
    from(table) {
      const calls = [];
      capturedCalls.push({ table, calls });
      const result =
        typeof tableResults === 'function'
          ? tableResults(table)
          : tableResults[table] || { data: [], error: null };
      const b = makeBuilder(result, calls);
      calls.push(['from', table]);
      return b;
    },
  };
  const supabase = { getAdminClient: () => client };
  const config = { get: (k, d) => (k === 'PAYSTACK_SECRET_KEY' ? 'sk_test_x' : d) };
  const noop = {};
  // Constructor arg order: supabase, email, sms, promos, settings, preorders, config
  return new OrdersService(supabase, noop, noop, noop, noop, noop, config);
}

function mockFetch(statusByRef) {
  global.fetch = async (url) => {
    const ref = decodeURIComponent(String(url).split('/').pop());
    const status = statusByRef[ref];
    if (status === '__throw__') throw new Error('network down');
    return {
      ok: status !== '__http500__',
      json: async () => ({ data: { status } }),
    };
  };
}

async function main() {
  console.log('reconcilePendingOrders:');

  const HOUR = 3600_000;
  const iso = (msAgo) => new Date(Date.now() - msAgo).toISOString();

  // 1. Paystack says success → recovered via confirmPayment.
  await test('success → recovered, confirmPayment called with reference', async () => {
    mockFetch({ ref_ok: 'success' });
    const captured = [];
    const svc = makeService(
      { orders: { data: [{ id: 'o1', payment_reference: 'ref_ok', order_number: 'IRD-1', created_at: iso(10 * 60_000) }], error: null } },
      captured,
    );
    let confirmedRef = null;
    svc.confirmPayment = async (ref) => { confirmedRef = ref; return { id: 'o1' }; };
    const res = await svc.reconcilePendingOrders();
    assert.strictEqual(confirmedRef, 'ref_ok', 'confirmPayment ref');
    assert.deepStrictEqual(res, { recovered: 1, cleaned: 0 });
  });

  // 2. Unpaid + older than 24h → soft-deleted (deleted_at set), guarded by payment_status.
  await test('failed & >24h → soft-deleted with payment_status guard', async () => {
    mockFetch({ ref_dead: 'failed' });
    const captured = [];
    const svc = makeService(
      { orders: { data: [{ id: 'o2', payment_reference: 'ref_dead', order_number: 'IRD-2', created_at: iso(30 * HOUR) }], error: null } },
      captured,
    );
    svc.confirmPayment = async () => { throw new Error('should not confirm'); };
    const res = await svc.reconcilePendingOrders();
    assert.deepStrictEqual(res, { recovered: 0, cleaned: 1 });
    // find the update builder that set deleted_at
    const updateCall = captured
      .flatMap((c) => c.calls)
      .find((call) => call[0] === 'update');
    assert.ok(updateCall && updateCall[1].deleted_at, 'deleted_at set');
    const guard = captured
      .flatMap((c) => c.calls)
      .some((call) => call[0] === 'eq' && call[1] === 'payment_status' && call[2] === 'pending');
    assert.ok(guard, 'soft-delete guarded by payment_status=pending');
  });

  // 3. Unpaid but younger than 24h → left alone.
  await test('abandoned & <24h → untouched (no recover, no clean)', async () => {
    mockFetch({ ref_young: 'abandoned' });
    const captured = [];
    const svc = makeService(
      { orders: { data: [{ id: 'o3', payment_reference: 'ref_young', order_number: 'IRD-3', created_at: iso(2 * HOUR) }], error: null } },
      captured,
    );
    svc.confirmPayment = async () => { throw new Error('should not confirm'); };
    const res = await svc.reconcilePendingOrders();
    assert.deepStrictEqual(res, { recovered: 0, cleaned: 0 });
    const anyUpdate = captured.flatMap((c) => c.calls).some((call) => call[0] === 'update');
    assert.ok(!anyUpdate, 'no update issued');
  });

  // 4. Paystack lookup fails (throw / HTTP 500) → skipped, retried later.
  await test('verify throws → skipped (no recover/clean)', async () => {
    mockFetch({ ref_err: '__throw__' });
    const captured = [];
    const svc = makeService(
      { orders: { data: [{ id: 'o4', payment_reference: 'ref_err', order_number: 'IRD-4', created_at: iso(30 * HOUR) }], error: null } },
      captured,
    );
    svc.confirmPayment = async () => { throw new Error('should not confirm'); };
    const res = await svc.reconcilePendingOrders();
    assert.deepStrictEqual(res, { recovered: 0, cleaned: 0 });
  });

  // 5. The DB query filters to pending/pending and applies the grace-window cutoff.
  await test('query filters status=pending, payment_status=pending, grace cutoff', async () => {
    mockFetch({});
    const captured = [];
    const svc = makeService({ orders: { data: [], error: null } }, captured);
    await svc.reconcilePendingOrders();
    const calls = captured[0].calls;
    const eqPairs = calls.filter((c) => c[0] === 'eq').map((c) => `${c[1]}=${c[2]}`);
    assert.ok(eqPairs.includes('status=pending'), 'status=pending');
    assert.ok(eqPairs.includes('payment_status=pending'), 'payment_status=pending');
    assert.ok(calls.some((c) => c[0] === 'lt' && c[1] === 'created_at'), 'grace cutoff on created_at');
    assert.ok(calls.some((c) => c[0] === 'not' && c[1] === 'payment_reference'), 'requires payment_reference');
  });

  // 6. Mixed batch: one success, one dead, one young → 1 recovered, 1 cleaned.
  await test('mixed batch → 1 recovered, 1 cleaned, 1 skipped', async () => {
    mockFetch({ a: 'success', b: 'failed', c: 'abandoned' });
    const captured = [];
    const svc = makeService(
      { orders: { data: [
        { id: 'a', payment_reference: 'a', order_number: 'IRD-A', created_at: iso(10 * 60_000) },
        { id: 'b', payment_reference: 'b', order_number: 'IRD-B', created_at: iso(30 * HOUR) },
        { id: 'c', payment_reference: 'c', order_number: 'IRD-C', created_at: iso(HOUR) },
      ], error: null } },
      captured,
    );
    svc.confirmPayment = async () => ({ id: 'a' });
    const res = await svc.reconcilePendingOrders();
    assert.deepStrictEqual(res, { recovered: 1, cleaned: 1 });
  });

  console.log('verifyPaystackTransaction:');

  // 7. HTTP non-ok → null (treated as lookup failure).
  await test('HTTP 500 → null', async () => {
    mockFetch({ r: '__http500__' });
    const captured = [];
    const svc = makeService({ orders: { data: [], error: null } }, captured);
    const status = await svc.verifyPaystackTransaction('r');
    assert.strictEqual(status, null);
  });

  console.log('findAdmin filter:');

  // 8. findAdmin applies the never-paid-pending exclusion .or(...).
  await test('findAdmin issues .or(status.neq.pending,payment_status.neq.pending)', async () => {
    mockFetch({});
    const captured = [];
    // Every table returns empty; findAdmin merges orders + popup preorders + walkins.
    const svc = makeService(() => ({ data: [], error: null }), captured);
    await svc.findAdmin({ page: '1', limit: '20' });
    const ordersQuery = captured.find((c) => c.table === 'orders');
    assert.ok(ordersQuery, 'orders query issued');
    const orClause = ordersQuery.calls.find(
      (c) => c[0] === 'or' && c[1] === 'status.neq.pending,payment_status.neq.pending',
    );
    assert.ok(orClause, 'exclusion .or clause present on orders query');
  });

  console.log(`\n${passed} passed`);
}

main();
