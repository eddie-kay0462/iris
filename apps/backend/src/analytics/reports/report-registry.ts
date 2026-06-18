import { bucketOf, bucketRange, Granularity, round2 } from '../analytics.constants';
import {
  aggregateSessions,
  ItemRow,
  num,
  onlineCustomerKey,
  popupCustomerKey,
  referrerLabel,
  ReportContext,
  Window,
} from './report-context';
import { ReportColumn, ReportMeta, ReportPayload, ReportRow } from './report-types';

export interface ReportDefinition extends ReportMeta {
  defaultGranularity?: Granularity;
  build(ctx: ReportContext): Promise<
    Pick<ReportPayload, 'summary' | 'series' | 'previousSeries' | 'table' | 'note'>
  >;
}

// ─── Shared aggregation helpers ───────────────────────────────────────────────

interface FinancialBucket {
  grossSales: number;
  discounts: number;
  returns: number;
  netSales: number;
  shipping: number;
  tax: number;
  totalSales: number;
  orders: number;
}

const emptyFin = (): FinancialBucket => ({
  grossSales: 0,
  discounts: 0,
  returns: 0,
  netSales: 0,
  shipping: 0,
  tax: 0,
  totalSales: 0,
  orders: 0,
});

async function financials(ctx: ReportContext, w: Window) {
  const [online, popup, refunded, popupRefunds] = await Promise.all([
    ctx.onlineOrders(w),
    ctx.popupOrders(w),
    ctx.refundedOrders(w),
    ctx.popupRefunds(w),
  ]);
  const byBucket = new Map<string, FinancialBucket>();
  const at = (ts: string): FinancialBucket => {
    const k = bucketOf(ts, ctx.granularity);
    if (!byBucket.has(k)) byBucket.set(k, emptyFin());
    return byBucket.get(k)!;
  };
  for (const o of online) {
    const b = at(o.created_at);
    b.grossSales += num(o.subtotal);
    b.discounts += num(o.discount);
    b.shipping += num(o.shipping_cost);
    b.tax += num(o.tax);
    b.orders += 1;
  }
  for (const o of popup) {
    const b = at(o.created_at);
    b.grossSales += num(o.subtotal);
    b.discounts += num(o.discount_amount);
    b.orders += 1;
  }
  for (const o of refunded) at(o.created_at).returns += num(o.total);
  for (const r of popupRefunds) at(r.created_at).returns += num(r.amount);
  for (const b of byBucket.values()) {
    b.netSales = b.grossSales - b.discounts - b.returns;
    b.totalSales = b.netSales + b.shipping + b.tax;
  }
  return byBucket;
}

function sumBuckets(byBucket: Map<string, FinancialBucket>): FinancialBucket {
  const t = emptyFin();
  for (const b of byBucket.values()) {
    t.grossSales += b.grossSales;
    t.discounts += b.discounts;
    t.returns += b.returns;
    t.shipping += b.shipping;
    t.tax += b.tax;
    t.orders += b.orders;
  }
  t.netSales = t.grossSales - t.discounts - t.returns;
  t.totalSales = t.netSales + t.shipping + t.tax;
  return t;
}

function buckets(ctx: ReportContext, w: Window): string[] {
  const { from, to } = ctx.window(w);
  return bucketRange(from, to, ctx.granularity);
}

/** Build a gap-free series for a window from a per-bucket map. */
function makeSeries(
  ctx: ReportContext,
  w: Window,
  fill: (bucket: string) => Omit<ReportRow, 'date'>,
): ReportRow[] {
  return buckets(ctx, w).map((date) => ({ date, ...fill(date) }));
}

function roundRow(row: ReportRow): ReportRow {
  const out: ReportRow = {};
  for (const [k, v] of Object.entries(row)) {
    out[k] = typeof v === 'number' ? round2(v) : v;
  }
  return out;
}

function roundTotals(t: Record<string, number>): Record<string, number> {
  return Object.fromEntries(Object.entries(t).map(([k, v]) => [k, round2(v)]));
}

const col = (key: string, label: string, format: ReportColumn['format']): ReportColumn => ({
  key,
  label,
  format,
});

const dateCol = col('date', 'Date', 'text');

/** Standard over-time payload assembly: same metrics drive chart and table. */
function overTime(
  ctx: ReportContext,
  columns: ReportColumn[],
  current: ReportRow[],
  previous: ReportRow[],
  totals: Record<string, number>,
  previousTotals: Record<string, number>,
  summary: ReportPayload['summary'],
): Pick<ReportPayload, 'summary' | 'series' | 'previousSeries' | 'table'> {
  return {
    summary,
    series: current.map(roundRow),
    previousSeries: previous.map(roundRow),
    table: {
      columns: [dateCol, ...columns],
      rows: current.map(roundRow),
      totals: roundTotals(totals),
      previousTotals: roundTotals(previousTotals),
    },
  };
}

function dimension(
  columns: ReportColumn[],
  rows: ReportRow[],
  totals: Record<string, number>,
  summary: ReportPayload['summary'],
  previousTotals: Record<string, number> | null = null,
): Pick<ReportPayload, 'summary' | 'table'> {
  return {
    summary,
    table: { columns, rows: rows.map(roundRow), totals: roundTotals(totals), previousTotals: previousTotals ? roundTotals(previousTotals) : null },
  };
}

const metric = (
  key: string,
  label: string,
  value: number,
  previousValue: number | null,
  format: ReportColumn['format'],
) => ({ key, label, value: round2(value), previousValue: previousValue == null ? null : round2(previousValue), format });

// ─── Session helpers ──────────────────────────────────────────────────────────

interface FunnelBucket {
  sessions: number;
  addedToCart: number;
  reachedCheckout: number;
  completed: number;
}

async function sessionFunnels(ctx: ReportContext, w: Window) {
  const events = await ctx.events(w);
  const sessions = aggregateSessions(events);
  const byBucket = new Map<string, FunnelBucket>();
  for (const s of sessions.values()) {
    const k = bucketOf(s.firstTs, ctx.granularity);
    if (!byBucket.has(k)) byBucket.set(k, { sessions: 0, addedToCart: 0, reachedCheckout: 0, completed: 0 });
    const b = byBucket.get(k)!;
    b.sessions += 1;
    if (s.types.has('add_to_cart')) b.addedToCart += 1;
    if (s.types.has('checkout_started')) b.reachedCheckout += 1;
    if (s.types.has('purchase')) b.completed += 1;
  }
  return { sessions, byBucket };
}

function funnelTotals(byBucket: Map<string, FunnelBucket>): FunnelBucket {
  const t = { sessions: 0, addedToCart: 0, reachedCheckout: 0, completed: 0 };
  for (const b of byBucket.values()) {
    t.sessions += b.sessions;
    t.addedToCart += b.addedToCart;
    t.reachedCheckout += b.reachedCheckout;
    t.completed += b.completed;
  }
  return t;
}

const rate = (part: number, whole: number): number => (whole > 0 ? (part / whole) * 100 : 0);

async function sessionDimension(
  ctx: ReportContext,
  label: string,
  pick: (s: { device: string | null; referrer: string | null; landingPage: string | null }) => string,
) {
  const [cur, prev] = await Promise.all([sessionFunnels(ctx, 'current'), sessionFunnels(ctx, 'previous')]);
  const counts = new Map<string, number>();
  for (const s of cur.sessions.values()) {
    const k = pick(s);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const total = cur.sessions.size;
  const rows = Array.from(counts.entries())
    .map(([dim, sessions]) => ({ [labelKey(label)]: dim, sessions, share: rate(sessions, total) }))
    .sort((a, b) => (b.sessions as number) - (a.sessions as number));
  return dimension(
    [col(labelKey(label), label, 'text'), col('sessions', 'Sessions', 'number'), col('share', 'Share', 'percent')],
    rows,
    { sessions: total, share: 100 },
    [metric('sessions', 'Sessions', total, prev.sessions.size, 'number')],
  );
}

const labelKey = (label: string) => label.toLowerCase().replace(/[^a-z]+/g, '_');

// ─── Report definitions ───────────────────────────────────────────────────────

export const REPORTS: Record<string, ReportDefinition> = {
  // ── Sales ──────────────────────────────────────────────────────────────────
  'total-sales-over-time': {
    id: 'total-sales-over-time',
    name: 'Total sales over time',
    category: 'Sales',
    description: 'Gross sales, discounts, returns, net sales, shipping and taxes per period.',
    async build(ctx) {
      const [cur, prev] = await Promise.all([financials(ctx, 'current'), financials(ctx, 'previous')]);
      const totals = sumBuckets(cur);
      const prevTotals = sumBuckets(prev);
      const fill = (m: Map<string, FinancialBucket>) => (b: string) => {
        const v = m.get(b) ?? emptyFin();
        const { orders: _orders, ...rest } = v;
        return rest;
      };
      const columns = [
        col('grossSales', 'Gross sales', 'currency'),
        col('discounts', 'Discounts', 'currency'),
        col('returns', 'Returns', 'currency'),
        col('netSales', 'Net sales', 'currency'),
        col('shipping', 'Shipping', 'currency'),
        col('tax', 'Taxes', 'currency'),
        col('totalSales', 'Total sales', 'currency'),
      ];
      const { orders: _o1, ...totalsRest } = totals;
      const { orders: _o2, ...prevRest } = prevTotals;
      return overTime(
        ctx,
        columns,
        makeSeries(ctx, 'current', fill(cur)),
        makeSeries(ctx, 'previous', fill(prev)),
        totalsRest,
        prevRest,
        [
          metric('totalSales', 'Total sales', totals.totalSales, prevTotals.totalSales, 'currency'),
          metric('netSales', 'Net sales', totals.netSales, prevTotals.netSales, 'currency'),
        ],
      );
    },
  },

  'sales-by-product': {
    id: 'sales-by-product',
    name: 'Sales by product',
    category: 'Sales',
    description: 'Units sold and net sales per product across storefront and pop-ups.',
    async build(ctx) {
      const [curItems, prevItems] = await Promise.all([ctx.orderItems('current'), ctx.orderItems('previous')]);
      const agg = (items: ItemRow[]) => {
        const map = new Map<string, { product: string; unitsSold: number; netSales: number; orders: Set<string> }>();
        for (const i of items) {
          const k = i.product_id ?? i.product_name;
          if (!map.has(k)) map.set(k, { product: i.product_name, unitsSold: 0, netSales: 0, orders: new Set() });
          const p = map.get(k)!;
          p.unitsSold += i.quantity;
          p.netSales += num(i.total_price);
          p.orders.add(i.order_id);
        }
        return map;
      };
      const cur = agg(curItems);
      const prevTotal = Array.from(agg(prevItems).values()).reduce((s, p) => s + p.netSales, 0);
      const rows = Array.from(cur.values())
        .map((p) => ({ product: p.product, unitsSold: p.unitsSold, orders: p.orders.size, netSales: p.netSales }))
        .sort((a, b) => b.netSales - a.netSales);
      const totals = {
        unitsSold: rows.reduce((s, r) => s + (r.unitsSold as number), 0),
        orders: rows.reduce((s, r) => s + (r.orders as number), 0),
        netSales: rows.reduce((s, r) => s + (r.netSales as number), 0),
      };
      return dimension(
        [
          col('product', 'Product', 'text'),
          col('unitsSold', 'Units sold', 'number'),
          col('orders', 'Orders', 'number'),
          col('netSales', 'Net sales', 'currency'),
        ],
        rows,
        totals,
        [metric('netSales', 'Net sales', totals.netSales, prevTotal, 'currency')],
      );
    },
  },

  'sales-by-channel': {
    id: 'sales-by-channel',
    name: 'Sales by channel',
    category: 'Sales',
    description: 'Storefront vs pop-up sales per period.',
    async build(ctx) {
      const load = async (w: Window) => {
        const [online, popup] = await Promise.all([ctx.onlineOrders(w), ctx.popupOrders(w)]);
        const map = new Map<string, { online: number; popup: number; total: number }>();
        const at = (ts: string) => {
          const k = bucketOf(ts, ctx.granularity);
          if (!map.has(k)) map.set(k, { online: 0, popup: 0, total: 0 });
          return map.get(k)!;
        };
        for (const o of online) {
          const b = at(o.created_at);
          b.online += num(o.total);
          b.total += num(o.total);
        }
        for (const o of popup) {
          const b = at(o.created_at);
          b.popup += num(o.total);
          b.total += num(o.total);
        }
        return map;
      };
      const [cur, prev] = await Promise.all([load('current'), load('previous')]);
      const totalOf = (m: Map<string, { online: number; popup: number; total: number }>) => {
        const t = { online: 0, popup: 0, total: 0 };
        for (const b of m.values()) {
          t.online += b.online;
          t.popup += b.popup;
          t.total += b.total;
        }
        return t;
      };
      const totals = totalOf(cur);
      const prevTotals = totalOf(prev);
      const fill = (m: typeof cur) => (b: string) => m.get(b) ?? { online: 0, popup: 0, total: 0 };
      return overTime(
        ctx,
        [col('online', 'Online store', 'currency'), col('popup', 'Pop-up', 'currency'), col('total', 'Total', 'currency')],
        makeSeries(ctx, 'current', fill(cur)),
        makeSeries(ctx, 'previous', fill(prev)),
        totals,
        prevTotals,
        [
          metric('online', 'Online store', totals.online, prevTotals.online, 'currency'),
          metric('popup', 'Pop-up', totals.popup, prevTotals.popup, 'currency'),
        ],
      );
    },
  },

  'aov-over-time': {
    id: 'aov-over-time',
    name: 'Average order value over time',
    category: 'Sales',
    description: 'Average value of revenue-generating orders per period.',
    async build(ctx) {
      const load = async (w: Window) => {
        const [online, popup] = await Promise.all([ctx.onlineOrders(w), ctx.popupOrders(w)]);
        const map = new Map<string, { revenue: number; orders: number }>();
        const at = (ts: string) => {
          const k = bucketOf(ts, ctx.granularity);
          if (!map.has(k)) map.set(k, { revenue: 0, orders: 0 });
          return map.get(k)!;
        };
        for (const o of [...online, ...popup]) {
          const b = at(o.created_at);
          b.revenue += num(o.total);
          b.orders += 1;
        }
        return map;
      };
      const [cur, prev] = await Promise.all([load('current'), load('previous')]);
      const totalOf = (m: Map<string, { revenue: number; orders: number }>) => {
        let revenue = 0;
        let orders = 0;
        for (const b of m.values()) {
          revenue += b.revenue;
          orders += b.orders;
        }
        return { aov: orders > 0 ? revenue / orders : 0, orders, revenue };
      };
      const totals = totalOf(cur);
      const prevTotals = totalOf(prev);
      const fill = (m: typeof cur) => (b: string) => {
        const v = m.get(b) ?? { revenue: 0, orders: 0 };
        return { aov: v.orders > 0 ? v.revenue / v.orders : 0, orders: v.orders, revenue: v.revenue };
      };
      return overTime(
        ctx,
        [col('aov', 'Average order value', 'currency'), col('orders', 'Orders', 'number'), col('revenue', 'Revenue', 'currency')],
        makeSeries(ctx, 'current', fill(cur)),
        makeSeries(ctx, 'previous', fill(prev)),
        totals,
        prevTotals,
        [metric('aov', 'Average order value', totals.aov, prevTotals.aov, 'currency')],
      );
    },
  },

  'sales-by-brand': {
    id: 'sales-by-brand',
    name: 'Sales by brand',
    category: 'Sales',
    description: 'Net sales attributed to each brand via the product vendor field.',
    async build(ctx) {
      const [curItems, prevItems] = await Promise.all([ctx.orderItems('current'), ctx.orderItems('previous')]);
      const agg = (items: ItemRow[]) => {
        const map = new Map<string, { netSales: number; unitsSold: number; orders: Set<string> }>();
        for (const i of items) {
          const k = i.vendor ?? '1NRI';
          if (!map.has(k)) map.set(k, { netSales: 0, unitsSold: 0, orders: new Set() });
          const v = map.get(k)!;
          v.netSales += num(i.total_price);
          v.unitsSold += i.quantity;
          v.orders.add(i.order_id);
        }
        return map;
      };
      const cur = agg(curItems);
      const prevTotal = Array.from(agg(prevItems).values()).reduce((s, v) => s + v.netSales, 0);
      const rows = Array.from(cur.entries())
        .map(([brand, v]) => ({ brand, unitsSold: v.unitsSold, orders: v.orders.size, netSales: v.netSales }))
        .sort((a, b) => b.netSales - a.netSales);
      const totals = {
        unitsSold: rows.reduce((s, r) => s + (r.unitsSold as number), 0),
        orders: rows.reduce((s, r) => s + (r.orders as number), 0),
        netSales: rows.reduce((s, r) => s + (r.netSales as number), 0),
      };
      return dimension(
        [
          col('brand', 'Brand', 'text'),
          col('unitsSold', 'Units sold', 'number'),
          col('orders', 'Orders', 'number'),
          col('netSales', 'Net sales', 'currency'),
        ],
        rows,
        totals,
        [metric('netSales', 'Net sales', totals.netSales, prevTotal, 'currency')],
      );
    },
  },

  'units-per-order': {
    id: 'units-per-order',
    name: 'Units per order',
    category: 'Sales',
    description: 'Average number of items in each order per period.',
    async build(ctx) {
      const load = async (w: Window) => {
        const items = await ctx.orderItems(w);
        const map = new Map<string, { units: number; orders: Set<string> }>();
        for (const i of items) {
          const k = bucketOf(i.created_at, ctx.granularity);
          if (!map.has(k)) map.set(k, { units: 0, orders: new Set() });
          const b = map.get(k)!;
          b.units += i.quantity;
          b.orders.add(i.order_id);
        }
        return map;
      };
      const [cur, prev] = await Promise.all([load('current'), load('previous')]);
      const totalOf = (m: Map<string, { units: number; orders: Set<string> }>) => {
        let units = 0;
        const orders = new Set<string>();
        for (const b of m.values()) {
          units += b.units;
          for (const o of b.orders) orders.add(o);
        }
        return { unitsPerOrder: orders.size > 0 ? units / orders.size : 0, units, orders: orders.size };
      };
      const totals = totalOf(cur);
      const prevTotals = totalOf(prev);
      const fill = (m: typeof cur) => (b: string) => {
        const v = m.get(b);
        if (!v) return { unitsPerOrder: 0, units: 0, orders: 0 };
        return { unitsPerOrder: v.orders.size > 0 ? v.units / v.orders.size : 0, units: v.units, orders: v.orders.size };
      };
      return overTime(
        ctx,
        [col('unitsPerOrder', 'Units per order', 'number'), col('units', 'Units sold', 'number'), col('orders', 'Orders', 'number')],
        makeSeries(ctx, 'current', fill(cur)),
        makeSeries(ctx, 'previous', fill(prev)),
        totals,
        prevTotals,
        [metric('unitsPerOrder', 'Units per order', totals.unitsPerOrder, prevTotals.unitsPerOrder, 'number')],
      );
    },
  },

  // ── Orders ─────────────────────────────────────────────────────────────────
  'orders-over-time': {
    id: 'orders-over-time',
    name: 'Orders over time',
    category: 'Orders',
    description: 'Revenue-generating orders per period, split by channel.',
    async build(ctx) {
      const load = async (w: Window) => {
        const [online, popup] = await Promise.all([ctx.onlineOrders(w), ctx.popupOrders(w)]);
        const map = new Map<string, { online: number; popup: number; total: number }>();
        const at = (ts: string) => {
          const k = bucketOf(ts, ctx.granularity);
          if (!map.has(k)) map.set(k, { online: 0, popup: 0, total: 0 });
          return map.get(k)!;
        };
        for (const o of online) {
          const b = at(o.created_at);
          b.online += 1;
          b.total += 1;
        }
        for (const o of popup) {
          const b = at(o.created_at);
          b.popup += 1;
          b.total += 1;
        }
        return map;
      };
      const [cur, prev] = await Promise.all([load('current'), load('previous')]);
      const totalOf = (m: Map<string, { online: number; popup: number; total: number }>) => {
        const t = { online: 0, popup: 0, total: 0 };
        for (const b of m.values()) {
          t.online += b.online;
          t.popup += b.popup;
          t.total += b.total;
        }
        return t;
      };
      const totals = totalOf(cur);
      const prevTotals = totalOf(prev);
      const fill = (m: typeof cur) => (b: string) => m.get(b) ?? { online: 0, popup: 0, total: 0 };
      return overTime(
        ctx,
        [col('total', 'Orders', 'number'), col('online', 'Online store', 'number'), col('popup', 'Pop-up', 'number')],
        makeSeries(ctx, 'current', fill(cur)),
        makeSeries(ctx, 'previous', fill(prev)),
        totals,
        prevTotals,
        [metric('total', 'Orders', totals.total, prevTotals.total, 'number')],
      );
    },
  },

  'fulfillment-over-time': {
    id: 'fulfillment-over-time',
    name: 'Orders fulfilled over time',
    category: 'Orders',
    description: 'Orders shipped and delivered per period, by fulfillment date.',
    async build(ctx) {
      const loadStamps = async (column: 'shipped_at' | 'delivered_at', from: string, to: string) => {
        const { data } = await ctx.db
          .from('orders')
          .select(`id, ${column}`)
          .is('deleted_at', null)
          .gte(column, from)
          .lte(column, to)
          .limit(5000);
        return (data ?? []) as unknown as Record<string, string>[];
      };
      const load = async (w: Window) => {
        const { from, to } = ctx.window(w);
        const [shipped, delivered] = await Promise.all([
          loadStamps('shipped_at', from, to),
          loadStamps('delivered_at', from, to),
        ]);
        const map = new Map<string, { shipped: number; delivered: number }>();
        const at = (ts: string) => {
          const k = bucketOf(ts, ctx.granularity);
          if (!map.has(k)) map.set(k, { shipped: 0, delivered: 0 });
          return map.get(k)!;
        };
        for (const o of shipped) at(o.shipped_at).shipped += 1;
        for (const o of delivered) at(o.delivered_at).delivered += 1;
        return map;
      };
      const [cur, prev] = await Promise.all([load('current'), load('previous')]);
      const totalOf = (m: Map<string, { shipped: number; delivered: number }>) => {
        const t = { shipped: 0, delivered: 0 };
        for (const b of m.values()) {
          t.shipped += b.shipped;
          t.delivered += b.delivered;
        }
        return t;
      };
      const totals = totalOf(cur);
      const prevTotals = totalOf(prev);
      const fill = (m: typeof cur) => (b: string) => m.get(b) ?? { shipped: 0, delivered: 0 };
      return overTime(
        ctx,
        [col('shipped', 'Shipped', 'number'), col('delivered', 'Delivered', 'number')],
        makeSeries(ctx, 'current', fill(cur)),
        makeSeries(ctx, 'previous', fill(prev)),
        totals,
        prevTotals,
        [
          metric('shipped', 'Shipped', totals.shipped, prevTotals.shipped, 'number'),
          metric('delivered', 'Delivered', totals.delivered, prevTotals.delivered, 'number'),
        ],
      );
    },
  },

  'discounts-over-time': {
    id: 'discounts-over-time',
    name: 'Discounts over time',
    category: 'Orders',
    description: 'Discount value given per period and its share of gross sales.',
    async build(ctx) {
      const [cur, prev] = await Promise.all([financials(ctx, 'current'), financials(ctx, 'previous')]);
      const totals = sumBuckets(cur);
      const prevTotals = sumBuckets(prev);
      const fill = (m: Map<string, FinancialBucket>) => (b: string) => {
        const v = m.get(b) ?? emptyFin();
        return {
          discounts: v.discounts,
          grossSales: v.grossSales,
          discountRate: rate(v.discounts, v.grossSales),
        };
      };
      return overTime(
        ctx,
        [
          col('discounts', 'Discounts', 'currency'),
          col('grossSales', 'Gross sales', 'currency'),
          col('discountRate', 'Discount rate', 'percent'),
        ],
        makeSeries(ctx, 'current', fill(cur)),
        makeSeries(ctx, 'previous', fill(prev)),
        { discounts: totals.discounts, grossSales: totals.grossSales, discountRate: rate(totals.discounts, totals.grossSales) },
        { discounts: prevTotals.discounts, grossSales: prevTotals.grossSales, discountRate: rate(prevTotals.discounts, prevTotals.grossSales) },
        [metric('discounts', 'Discounts', totals.discounts, prevTotals.discounts, 'currency')],
      );
    },
  },

  // ── Customers ──────────────────────────────────────────────────────────────
  'new-vs-returning': {
    id: 'new-vs-returning',
    name: 'New vs returning customers',
    category: 'Customers',
    description: 'Customers placing their first-ever order vs repeat customers per period.',
    async build(ctx) {
      const firstOrders = await ctx.customerFirstOrder();
      const load = async (w: Window) => {
        const [online, popup] = await Promise.all([ctx.onlineOrders(w), ctx.popupOrders(w)]);
        const map = new Map<string, { newCustomers: Set<string>; returningCustomers: Set<string> }>();
        const at = (ts: string) => {
          const k = bucketOf(ts, ctx.granularity);
          if (!map.has(k)) map.set(k, { newCustomers: new Set(), returningCustomers: new Set() });
          return map.get(k)!;
        };
        const classify = (key: string | null, ts: string) => {
          if (!key) return;
          const b = at(ts);
          const first = firstOrders.get(key);
          if (first && first < ts) b.returningCustomers.add(key);
          else b.newCustomers.add(key);
        };
        for (const o of online) classify(onlineCustomerKey(o), o.created_at);
        for (const o of popup) classify(popupCustomerKey(o), o.created_at);
        return map;
      };
      const [cur, prev] = await Promise.all([load('current'), load('previous')]);
      const totalOf = (m: Awaited<ReturnType<typeof load>>) => {
        const newC = new Set<string>();
        const ret = new Set<string>();
        for (const b of m.values()) {
          for (const k of b.newCustomers) newC.add(k);
          for (const k of b.returningCustomers) ret.add(k);
        }
        return { newCustomers: newC.size, returningCustomers: ret.size };
      };
      const totals = totalOf(cur);
      const prevTotals = totalOf(prev);
      const fill = (m: Awaited<ReturnType<typeof load>>) => (b: string) => {
        const v = m.get(b);
        return {
          newCustomers: v?.newCustomers.size ?? 0,
          returningCustomers: v?.returningCustomers.size ?? 0,
        };
      };
      return overTime(
        ctx,
        [col('newCustomers', 'New customers', 'number'), col('returningCustomers', 'Returning customers', 'number')],
        makeSeries(ctx, 'current', fill(cur)),
        makeSeries(ctx, 'previous', fill(prev)),
        totals,
        prevTotals,
        [
          metric('newCustomers', 'New customers', totals.newCustomers, prevTotals.newCustomers, 'number'),
          metric('returningCustomers', 'Returning customers', totals.returningCustomers, prevTotals.returningCustomers, 'number'),
        ],
      );
    },
  },

  'returning-customer-rate-over-time': {
    id: 'returning-customer-rate-over-time',
    name: 'Returning customer rate over time',
    category: 'Customers',
    description: 'Share of ordering customers each period who had ordered before.',
    async build(ctx) {
      const base = await REPORTS['new-vs-returning'].build(ctx);
      const transform = (rows: ReportRow[]): ReportRow[] =>
        rows.map((r) => {
          const newC = (r.newCustomers as number) ?? 0;
          const ret = (r.returningCustomers as number) ?? 0;
          return {
            date: r.date,
            returningRate: rate(ret, newC + ret),
            returningCustomers: ret,
            totalCustomers: newC + ret,
          };
        });
      const totalsOf = (t: Record<string, number>) => ({
        returningRate: rate(t.returningCustomers, t.newCustomers + t.returningCustomers),
        returningCustomers: t.returningCustomers,
        totalCustomers: t.newCustomers + t.returningCustomers,
      });
      const totals = totalsOf(base.table.totals);
      const prevTotals = totalsOf(base.table.previousTotals ?? { newCustomers: 0, returningCustomers: 0 });
      const series = transform(base.series ?? []).map(roundRow);
      const previousSeries = transform(base.previousSeries ?? []).map(roundRow);
      return {
        summary: [metric('returningRate', 'Returning customer rate', totals.returningRate, prevTotals.returningRate, 'percent')],
        series,
        previousSeries,
        table: {
          columns: [
            dateCol,
            col('returningRate', 'Returning rate', 'percent'),
            col('returningCustomers', 'Returning customers', 'number'),
            col('totalCustomers', 'Total customers', 'number'),
          ],
          rows: series,
          totals: roundTotals(totals),
          previousTotals: roundTotals(prevTotals),
        },
      };
    },
  },

  'customer-cohorts': {
    id: 'customer-cohorts',
    name: 'Customer cohort retention',
    category: 'Customers',
    description: 'For each first-purchase month, the share of customers who purchased again in later months. Iris-era orders only.',
    async build(ctx) {
      const firstOrders = await ctx.customerFirstOrder();
      // Re-load all order activity (cheap at current scale, cached by context for the window loads).
      const activity = new Map<string, Set<string>>(); // customer key -> set of YYYY-MM with orders
      const months = 12;
      const [online, popup] = await Promise.all([
        fetchAllOrders(ctx, 'orders', 'user_id, email, created_at'),
        fetchAllOrders(ctx, 'popup_orders', 'customer_email, customer_phone, created_at'),
      ]);
      const monthOf = (ts: string) => ts.slice(0, 7);
      const note = 'Cohorts cover Iris-era orders only — migrated Shopify history has no per-order dates.';
      const record = (key: string | null, ts: string) => {
        if (!key) return;
        if (!activity.has(key)) activity.set(key, new Set());
        activity.get(key)!.add(monthOf(ts));
      };
      for (const o of online) record(onlineCustomerKey(o), o.created_at);
      for (const o of popup) record(popupCustomerKey(o), o.created_at);

      const cohorts = new Map<string, { customers: number; retention: number[] }>();
      const monthDiff = (a: string, b: string) => {
        const [ay, am] = a.split('-').map(Number);
        const [by, bm] = b.split('-').map(Number);
        return (by - ay) * 12 + (bm - am);
      };
      for (const [key, first] of firstOrders.entries()) {
        const cohortMonth = monthOf(first);
        if (!cohorts.has(cohortMonth)) cohorts.set(cohortMonth, { customers: 0, retention: new Array(months).fill(0) });
        const c = cohorts.get(cohortMonth)!;
        c.customers += 1;
        for (const m of activity.get(key) ?? []) {
          const diff = monthDiff(cohortMonth, m);
          if (diff >= 1 && diff < months) c.retention[diff] += 1;
        }
      }
      const rows = Array.from(cohorts.entries())
        .sort((a, b) => b[0].localeCompare(a[0]))
        .slice(0, 12)
        .map(([month, c]) => {
          const row: ReportRow = { cohort: month, customers: c.customers };
          for (let i = 1; i < months; i++) row[`m${i}`] = rate(c.retention[i], c.customers);
          return row;
        });
      const columns: ReportColumn[] = [
        col('cohort', 'Cohort', 'text'),
        col('customers', 'Customers', 'number'),
        ...Array.from({ length: months - 1 }, (_, i) => col(`m${i + 1}`, `Month ${i + 1}`, 'percent')),
      ];
      const totalCustomers = rows.reduce((s, r) => s + (r.customers as number), 0);
      return {
        ...dimension(columns, rows, { customers: totalCustomers }, [
          metric('customers', 'Customers', totalCustomers, null, 'number'),
        ]),
        note,
      };
    },
  },

  // ── Behavior ───────────────────────────────────────────────────────────────
  'sessions-over-time': {
    id: 'sessions-over-time',
    name: 'Sessions over time',
    category: 'Behavior',
    description: 'Unique storefront sessions and visitors per period.',
    async build(ctx) {
      const [cur, prev] = await Promise.all([sessionFunnels(ctx, 'current'), sessionFunnels(ctx, 'previous')]);
      const visitorsByBucket = (sessions: Map<string, { firstTs: string; visitorId: string | null }>) => {
        const map = new Map<string, Set<string>>();
        for (const s of sessions.values()) {
          const k = bucketOf(s.firstTs, ctx.granularity);
          if (!map.has(k)) map.set(k, new Set());
          map.get(k)!.add(s.visitorId ?? s.firstTs);
        }
        return map;
      };
      const curVisitors = visitorsByBucket(cur.sessions as any);
      const prevVisitors = visitorsByBucket(prev.sessions as any);
      const fill = (f: typeof cur, v: typeof curVisitors) => (b: string) => ({
        sessions: f.byBucket.get(b)?.sessions ?? 0,
        visitors: v.get(b)?.size ?? 0,
      });
      const totals = { sessions: cur.sessions.size, visitors: new Set(Array.from(cur.sessions.values()).map((s) => s.visitorId ?? s.sessionId)).size };
      const prevTotals = { sessions: prev.sessions.size, visitors: new Set(Array.from(prev.sessions.values()).map((s) => s.visitorId ?? s.sessionId)).size };
      return overTime(
        ctx,
        [col('sessions', 'Sessions', 'number'), col('visitors', 'Visitors', 'number')],
        makeSeries(ctx, 'current', fill(cur, curVisitors)),
        makeSeries(ctx, 'previous', fill(prev, prevVisitors)),
        totals,
        prevTotals,
        [metric('sessions', 'Sessions', totals.sessions, prevTotals.sessions, 'number')],
      );
    },
  },

  'conversion-over-time': {
    id: 'conversion-over-time',
    name: 'Conversion rate over time',
    category: 'Behavior',
    description: 'Sessions that added to cart, reached checkout and completed a purchase.',
    async build(ctx) {
      const [cur, prev] = await Promise.all([sessionFunnels(ctx, 'current'), sessionFunnels(ctx, 'previous')]);
      const totals = funnelTotals(cur.byBucket);
      const prevTotals = funnelTotals(prev.byBucket);
      const fill = (f: typeof cur) => (b: string) => {
        const v = f.byBucket.get(b) ?? { sessions: 0, addedToCart: 0, reachedCheckout: 0, completed: 0 };
        return { ...v, conversionRate: rate(v.completed, v.sessions) };
      };
      return overTime(
        ctx,
        [
          col('sessions', 'Sessions', 'number'),
          col('addedToCart', 'Added to cart', 'number'),
          col('reachedCheckout', 'Reached checkout', 'number'),
          col('completed', 'Completed checkout', 'number'),
          col('conversionRate', 'Conversion rate', 'percent'),
        ],
        makeSeries(ctx, 'current', fill(cur)),
        makeSeries(ctx, 'previous', fill(prev)),
        { ...totals, conversionRate: rate(totals.completed, totals.sessions) },
        { ...prevTotals, conversionRate: rate(prevTotals.completed, prevTotals.sessions) },
        [metric('conversionRate', 'Conversion rate', rate(totals.completed, totals.sessions), rate(prevTotals.completed, prevTotals.sessions), 'percent')],
      );
    },
  },

  'checkout-abandonment-over-time': {
    id: 'checkout-abandonment-over-time',
    name: 'Checkout abandonment over time',
    category: 'Behavior',
    description: 'Checkouts started vs completed, and the share abandoned.',
    async build(ctx) {
      const staleBefore = Date.now() - 60 * 60 * 1000;
      const load = async (w: Window) => {
        const checkouts = await ctx.checkouts(w);
        const map = new Map<string, { started: number; completed: number; abandoned: number }>();
        for (const c of checkouts) {
          const k = bucketOf(c.created_at, ctx.granularity);
          if (!map.has(k)) map.set(k, { started: 0, completed: 0, abandoned: 0 });
          const b = map.get(k)!;
          b.started += 1;
          if (c.status === 'completed' || c.status === 'recovered') b.completed += 1;
          else if (new Date(c.updated_at).getTime() < staleBefore) b.abandoned += 1;
        }
        return map;
      };
      const [cur, prev] = await Promise.all([load('current'), load('previous')]);
      const totalOf = (m: Awaited<ReturnType<typeof load>>) => {
        const t = { started: 0, completed: 0, abandoned: 0 };
        for (const b of m.values()) {
          t.started += b.started;
          t.completed += b.completed;
          t.abandoned += b.abandoned;
        }
        return t;
      };
      const totals = totalOf(cur);
      const prevTotals = totalOf(prev);
      const fill = (m: Awaited<ReturnType<typeof load>>) => (b: string) => {
        const v = m.get(b) ?? { started: 0, completed: 0, abandoned: 0 };
        return { ...v, abandonmentRate: rate(v.abandoned, v.started) };
      };
      return overTime(
        ctx,
        [
          col('started', 'Checkouts started', 'number'),
          col('completed', 'Completed', 'number'),
          col('abandoned', 'Abandoned', 'number'),
          col('abandonmentRate', 'Abandonment rate', 'percent'),
        ],
        makeSeries(ctx, 'current', fill(cur)),
        makeSeries(ctx, 'previous', fill(prev)),
        { ...totals, abandonmentRate: rate(totals.abandoned, totals.started) },
        { ...prevTotals, abandonmentRate: rate(prevTotals.abandoned, prevTotals.started) },
        [metric('abandonmentRate', 'Abandonment rate', rate(totals.abandoned, totals.started), rate(prevTotals.abandoned, prevTotals.started), 'percent')],
      );
    },
  },

  'sessions-by-device': {
    id: 'sessions-by-device',
    name: 'Sessions by device type',
    category: 'Behavior',
    description: 'Where visitors browse from: mobile, tablet or desktop.',
    build: (ctx) => sessionDimension(ctx, 'Device', (s) => s.device ?? 'Unknown'),
  },

  'sessions-by-referrer': {
    id: 'sessions-by-referrer',
    name: 'Sessions by referrer',
    category: 'Behavior',
    description: 'Which sites and channels send visitors to the storefront.',
    build: (ctx) => sessionDimension(ctx, 'Referrer', (s) => referrerLabel(s.referrer)),
  },

  'sessions-by-landing-page': {
    id: 'sessions-by-landing-page',
    name: 'Sessions by landing page',
    category: 'Behavior',
    description: 'The first page visitors land on when a session starts.',
    build: (ctx) => sessionDimension(ctx, 'Landing page', (s) => s.landingPage ?? '/'),
  },

  // ── Inventory ──────────────────────────────────────────────────────────────
  'sell-through-rate': {
    id: 'sell-through-rate',
    name: 'Products by sell-through rate',
    category: 'Inventory',
    description: 'Units sold as a share of units sold plus units still in stock.',
    async build(ctx) {
      const items = await ctx.orderItems('current');
      const byProduct = new Map<string, { product: string; unitsSold: number }>();
      for (const i of items) {
        if (!i.product_id) continue;
        if (!byProduct.has(i.product_id)) byProduct.set(i.product_id, { product: i.product_name, unitsSold: 0 });
        byProduct.get(i.product_id)!.unitsSold += i.quantity;
      }
      const ids = Array.from(byProduct.keys());
      const inventory = new Map<string, number>();
      for (let i = 0; i < ids.length; i += 200) {
        const { data } = await ctx.db
          .from('product_variants')
          .select('product_id, inventory_quantity')
          .in('product_id', ids.slice(i, i + 200));
        for (const v of data ?? []) {
          inventory.set(v.product_id, (inventory.get(v.product_id) ?? 0) + Math.max(v.inventory_quantity ?? 0, 0));
        }
      }
      const rows = Array.from(byProduct.entries())
        .map(([id, p]) => {
          const stock = inventory.get(id) ?? 0;
          return {
            product: p.product,
            unitsSold: p.unitsSold,
            inventory: stock,
            sellThroughRate: rate(p.unitsSold, p.unitsSold + stock),
          };
        })
        .sort((a, b) => b.sellThroughRate - a.sellThroughRate);
      const totalSold = rows.reduce((s, r) => s + r.unitsSold, 0);
      const totalStock = rows.reduce((s, r) => s + r.inventory, 0);
      return dimension(
        [
          col('product', 'Product', 'text'),
          col('unitsSold', 'Units sold', 'number'),
          col('inventory', 'In stock', 'number'),
          col('sellThroughRate', 'Sell-through rate', 'percent'),
        ],
        rows,
        { unitsSold: totalSold, inventory: totalStock, sellThroughRate: rate(totalSold, totalSold + totalStock) },
        [metric('sellThroughRate', 'Sell-through rate', rate(totalSold, totalSold + totalStock), null, 'percent')],
      );
    },
  },

  'inventory-levels': {
    id: 'inventory-levels',
    name: 'Inventory levels',
    category: 'Inventory',
    description: 'Current stock and retail value per product, lowest stock first.',
    async build(ctx) {
      const { data: variants } = await ctx.db
        .from('product_variants')
        .select('product_id, price, inventory_quantity, products!inner(title, deleted_at)')
        .is('products.deleted_at', null)
        .limit(5000);
      const byProduct = new Map<string, { product: string; inventory: number; retailValue: number }>();
      for (const v of (variants ?? []) as any[]) {
        const id = v.product_id;
        if (!byProduct.has(id)) byProduct.set(id, { product: v.products?.title ?? 'Unknown', inventory: 0, retailValue: 0 });
        const p = byProduct.get(id)!;
        const qty = Math.max(v.inventory_quantity ?? 0, 0);
        p.inventory += qty;
        p.retailValue += qty * num(v.price);
      }
      const rows = Array.from(byProduct.values()).sort((a, b) => a.inventory - b.inventory);
      const totals = {
        inventory: rows.reduce((s, r) => s + r.inventory, 0),
        retailValue: rows.reduce((s, r) => s + r.retailValue, 0),
      };
      return dimension(
        [col('product', 'Product', 'text'), col('inventory', 'Units in stock', 'number'), col('retailValue', 'Retail value', 'currency')],
        rows,
        totals,
        [
          metric('inventory', 'Units in stock', totals.inventory, null, 'number'),
          metric('retailValue', 'Retail value', totals.retailValue, null, 'currency'),
        ],
      );
    },
  },

  // ── Finances ───────────────────────────────────────────────────────────────
  'finances-summary': {
    id: 'finances-summary',
    name: 'Finances summary',
    category: 'Finances',
    description: 'Monthly P&L-style view: gross sales through to total sales.',
    defaultGranularity: 'month',
    async build(ctx) {
      return REPORTS['total-sales-over-time'].build(ctx);
    },
  },

  'payment-methods': {
    id: 'payment-methods',
    name: 'Sales by payment method',
    category: 'Finances',
    description: 'Orders and revenue by payment provider (online) and method (pop-up).',
    async build(ctx) {
      const [online, popup] = await Promise.all([ctx.onlineOrders('current'), ctx.popupOrders('current')]);
      const map = new Map<string, { orders: number; revenue: number }>();
      const add = (method: string, total: number) => {
        if (!map.has(method)) map.set(method, { orders: 0, revenue: 0 });
        const m = map.get(method)!;
        m.orders += 1;
        m.revenue += total;
      };
      for (const o of online) add(o.payment_provider ?? 'online', num(o.total));
      for (const o of popup) add(o.payment_method ?? 'unknown', num(o.total));
      const rows = Array.from(map.entries())
        .map(([method, v]) => ({ method, orders: v.orders, revenue: v.revenue }))
        .sort((a, b) => b.revenue - a.revenue);
      const totals = {
        orders: rows.reduce((s, r) => s + r.orders, 0),
        revenue: rows.reduce((s, r) => s + r.revenue, 0),
      };
      return dimension(
        [col('method', 'Payment method', 'text'), col('orders', 'Orders', 'number'), col('revenue', 'Revenue', 'currency')],
        rows,
        totals,
        [metric('revenue', 'Revenue', totals.revenue, null, 'currency')],
      );
    },
  },
};

// Cohort builder needs full history beyond the report window.
async function fetchAllOrders(ctx: ReportContext, table: 'orders' | 'popup_orders', select: string) {
  const statuses = table === 'orders' ? ['paid', 'processing', 'shipped', 'delivered'] : ['confirmed', 'completed'];
  const all: any[] = [];
  const PAGE = 1000;
  for (let page = 0; page < 100; page++) {
    let q = ctx.db.from(table).select(select).in('status', statuses).order('created_at', { ascending: true }).range(page * PAGE, page * PAGE + PAGE - 1);
    if (table === 'orders') q = q.is('deleted_at', null);
    const { data } = await q;
    if (!data || data.length === 0) break;
    all.push(...(data as any[]));
    if (data.length < PAGE) break;
  }
  return all;
}

export function listReports(): ReportMeta[] {
  return Object.values(REPORTS).map(({ id, name, category, description }) => ({ id, name, category, description }));
}
