import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../common/supabase/supabase.service';
import { EmailService } from '../email/email.service';
import {
  AbandonedCheckoutsQueryDto,
  OverviewQueryDto,
  RevenueChartDto,
  ReportQueryDto,
} from './dto/query-analytics.dto';
import { TrackEventsDto } from './dto/track-events.dto';
import { CheckoutSnapshotDto } from './dto/checkout-snapshot.dto';
import {
  Granularity,
  ONLINE_REVENUE_STATUSES,
  POPUP_REVENUE_STATUSES,
  ALLY_REVENUE_STATUSES,
  round2,
} from './analytics.constants';
import { SettingsService } from '../settings/settings.service';
import {
  aggregateSessions,
  num,
  onlineCustomerKey,
  popupCustomerKey,
  referrerLabel,
  ReportContext,
} from './reports/report-context';
import { listReports, REPORTS } from './reports/report-registry';
import { ReportPayload } from './reports/report-types';

// Shopify standard: a checkout counts as abandoned after 10 min of inactivity.
const ABANDON_AFTER_MS = 10 * 60 * 1000;
// But the recovery email only goes out once the checkout has been idle for an
// hour — long enough to be confident the customer has actually walked away.
const REMINDER_AFTER_MS = 60 * 60 * 1000;
// Don't email reminders for carts older than this; they're stale, not recoverable.
const MAX_REMINDER_AGE_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private supabase: SupabaseService,
    private email: EmailService,
    private config: ConfigService,
    private settings: SettingsService,
  ) {}

  /**
   * Run a Supabase query (`{ data, error }` thenable) with a few retries on
   * transient network failures — undici's `fetch failed` / ECONNRESET / DNS
   * blips that Postgrest surfaces in `error` (or, occasionally, throws). The
   * builder is re-created via `run()` on each attempt with a short linear
   * backoff. Deterministic Postgrest errors (bad query, RLS) return immediately.
   */
  private async withRetry<T>(
    label: string,
    run: () => PromiseLike<{ data: T; error: any }>,
    attempts = 3,
  ): Promise<{ data: T | null; error: any }> {
    let result: { data: T | null; error: any } = { data: null, error: null };
    for (let i = 0; i < attempts; i++) {
      try {
        result = await run();
      } catch (err: any) {
        result = { data: null, error: err };
      }
      if (!result.error) return result;
      const cause = (result.error as any)?.cause;
      const haystack = `${result.error?.message ?? result.error} ${cause?.code ?? cause ?? ''}`;
      const transient =
        /fetch failed|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|socket hang up|UND_ERR/i.test(haystack);
      if (!transient || i === attempts - 1) return result;
      this.logger.warn(
        `${label} transient failure (attempt ${i + 1}/${attempts}): ${result.error?.message ?? result.error} — retrying`,
      );
      await new Promise((r) => setTimeout(r, 500 * (i + 1)));
    }
    return result;
  }

  // ─── Road to HQ ────────────────────────────────────────────────────────────

  /**
   * Total units sold toward the HQ goal: online + popup + ally line-item
   * quantities (revenue statuses only) plus a manual baseline for historical
   * (Shopify) units not stored in this system. Public — powers the storefront
   * homepage.
   */
  async getRoadToHq(): Promise<{
    units: number;
    online: number;
    popup: number;
    allies: number;
    baseline: number;
    target: number;
  }> {
    const db = this.supabase.getAdminClient();

    const [onlineRes, popupRes, allyRes, baseline, target] = await Promise.all([
      db
        .from('order_items')
        .select('quantity, orders!inner(status, deleted_at)')
        .in('orders.status', ONLINE_REVENUE_STATUSES)
        .is('orders.deleted_at', null),
      db
        .from('popup_order_items')
        .select('quantity, popup_orders!inner(status)')
        .in('popup_orders.status', POPUP_REVENUE_STATUSES),
      db
        .from('ally_sale_items')
        .select('quantity, ally_sales!inner(status)')
        .in('ally_sales.status', ALLY_REVENUE_STATUSES),
      this.settings.getRoadToHqBaseline(),
      this.settings.getRoadToHqTarget(),
    ]);

    const online = (onlineRes.data ?? []).reduce((sum, r: any) => sum + (r.quantity ?? 0), 0);
    const popup = (popupRes.data ?? []).reduce((sum, r: any) => sum + (r.quantity ?? 0), 0);
    const allies = (allyRes.data ?? []).reduce((sum, r: any) => sum + (r.quantity ?? 0), 0);

    return { units: online + popup + allies + baseline, online, popup, allies, baseline, target };
  }

  // ─── Date Helpers ──────────────────────────────────────────────────────────

  private resolveDateRange(period?: string, from?: string, to?: string): { from: string; to: string } {
    const now = new Date();
    const toDate = to ? new Date(to) : now;

    if (from && to) return { from, to: toDate.toISOString() };

    const fromDate = new Date(now);
    switch (period) {
      case '7d':
        fromDate.setDate(now.getDate() - 7);
        break;
      case '90d':
        fromDate.setDate(now.getDate() - 90);
        break;
      case '12m':
        fromDate.setMonth(now.getMonth() - 12);
        break;
      case '30d':
      default:
        fromDate.setDate(now.getDate() - 30);
    }

    return { from: fromDate.toISOString(), to: toDate.toISOString() };
  }

  private truncDate(granularity: string): string {
    if (granularity === 'week') return 'week';
    if (granularity === 'month') return 'month';
    return 'day';
  }

  // ─── Overview / Dashboard ─────────────────────────────────────────────────

  async getOverview(query: OverviewQueryDto) {
    const db = this.supabase.getAdminClient();
    const { from, to } = this.resolveDateRange(query.period, query.from, query.to);

    // Previous period for % change
    const rangeMs = new Date(to).getTime() - new Date(from).getTime();
    const prevFrom = new Date(new Date(from).getTime() - rangeMs).toISOString();
    const prevTo = from;

    // ── Online orders (current + prev) ──
    const [{ data: curOrders }, { data: prevOrders }] = await Promise.all([
      db
        .from('orders')
        .select('total, status, created_at')
        .gte('created_at', from)
        .lte('created_at', to)
        .is('deleted_at', null),
      db
        .from('orders')
        .select('total, status, created_at')
        .gte('created_at', prevFrom)
        .lte('created_at', prevTo)
        .is('deleted_at', null),
    ]);

    // ── Popup orders (current + prev) — fetch all statuses for full breakdown ──
    const [{ data: curPopup }, { data: prevPopup }] = await Promise.all([
      db
        .from('popup_orders')
        .select('total, status, created_at')
        .gte('created_at', from)
        .lte('created_at', to),
      db
        .from('popup_orders')
        .select('total, status, created_at')
        .gte('created_at', prevFrom)
        .lte('created_at', prevTo),
    ]);

    // ── Customers ──
    const [{ count: curCustomers }, { count: prevCustomers }] = await Promise.all([
      db
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', from)
        .lte('created_at', to),
      db
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', prevFrom)
        .lte('created_at', prevTo),
    ]);

    // ── Newsletter subscribers ──
    const [{ count: curSubs }, { count: prevSubs }] = await Promise.all([
      db
        .from('newsletter_subscribers')
        .select('id', { count: 'exact', head: true })
        .gte('subscribed_at', from)
        .lte('subscribed_at', to),
      db
        .from('newsletter_subscribers')
        .select('id', { count: 'exact', head: true })
        .gte('subscribed_at', prevFrom)
        .lte('subscribed_at', prevTo),
    ]);

    // ── Total reviews ──
    const { count: totalReviews } = await db
      .from('product_reviews')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', from)
      .lte('created_at', to);

    // ── Calculations ──
    const onlineRevenueStatuses = ['paid', 'processing', 'shipped', 'delivered'];
    const popupRevenueStatuses = ['confirmed', 'completed'];

    const sumRevenue = (orders: any[], statuses: string[]) =>
      (orders ?? [])
        .filter((o) => statuses.includes(o.status))
        .reduce((s, o) => s + parseFloat(o.total ?? 0), 0);

    const curOnlineRevenue = sumRevenue(curOrders ?? [], onlineRevenueStatuses);
    const prevOnlineRevenue = sumRevenue(prevOrders ?? [], onlineRevenueStatuses);
    const curPopupRevenue = sumRevenue(curPopup ?? [], popupRevenueStatuses);
    const prevPopupRevenue = sumRevenue(prevPopup ?? [], popupRevenueStatuses);

    const curTotalRevenue = curOnlineRevenue + curPopupRevenue;
    const prevTotalRevenue = prevOnlineRevenue + prevPopupRevenue;

    const curOrderCount = (curOrders ?? []).length;
    const prevOrderCount = (prevOrders ?? []).length;
    const curPopupCount = (curPopup ?? []).length;
    const prevPopupCount = (prevPopup ?? []).length;

    // AOV based on revenue-generating orders only
    const curRevenueOrders =
      (curOrders ?? []).filter((o) => onlineRevenueStatuses.includes(o.status)).length +
      (curPopup ?? []).filter((o) => popupRevenueStatuses.includes(o.status)).length;
    const prevRevenueOrders =
      (prevOrders ?? []).filter((o) => onlineRevenueStatuses.includes(o.status)).length +
      (prevPopup ?? []).filter((o) => popupRevenueStatuses.includes(o.status)).length;

    const curAov = curRevenueOrders > 0 ? curTotalRevenue / curRevenueOrders : 0;
    const prevAov = prevRevenueOrders > 0 ? prevTotalRevenue / prevRevenueOrders : 0;

    const pct = (cur: number, prev: number) =>
      prev === 0 ? null : Math.round(((cur - prev) / prev) * 100 * 10) / 10;

    // ── Order status breakdown — both channels ──
    const onlineStatusBreakdown: Record<string, number> = {};
    for (const o of curOrders ?? []) {
      onlineStatusBreakdown[o.status] = (onlineStatusBreakdown[o.status] ?? 0) + 1;
    }
    const popupStatusBreakdown: Record<string, number> = {};
    for (const o of curPopup ?? []) {
      popupStatusBreakdown[o.status] = (popupStatusBreakdown[o.status] ?? 0) + 1;
    }

    return {
      period: { from, to },
      revenue: {
        total: Math.round(curTotalRevenue * 100) / 100,
        online: Math.round(curOnlineRevenue * 100) / 100,
        popup: Math.round(curPopupRevenue * 100) / 100,
        change: pct(curTotalRevenue, prevTotalRevenue),
      },
      orders: {
        total: curOrderCount + curPopupCount,
        online: curOrderCount,
        popup: curPopupCount,
        change: pct(curOrderCount + curPopupCount, prevOrderCount + prevPopupCount),
        onlineStatusBreakdown,
        popupStatusBreakdown,
      },
      averageOrderValue: {
        value: Math.round(curAov * 100) / 100,
        change: pct(curAov, prevAov),
      },
      customers: {
        new: curCustomers ?? 0,
        change: pct(curCustomers ?? 0, prevCustomers ?? 0),
      },
      newsletterSubscribers: {
        new: curSubs ?? 0,
        change: pct(curSubs ?? 0, prevSubs ?? 0),
      },
      reviews: {
        count: totalReviews ?? 0,
      },
    };
  }

  // ─── Revenue Chart ─────────────────────────────────────────────────────────

  async getRevenueChart(query: RevenueChartDto) {
    const db = this.supabase.getAdminClient();
    const { from, to } = this.resolveDateRange(query.period, query.from, query.to);
    const gran = query.granularity ?? 'day';

    const [{ data: onlineOrders }, { data: popupOrders }] = await Promise.all([
      db
        .from('orders')
        .select('total, status, created_at')
        .gte('created_at', from)
        .lte('created_at', to)
        .in('status', ['paid', 'processing', 'shipped', 'delivered'])
        .is('deleted_at', null),
      db
        .from('popup_orders')
        .select('total, created_at')
        .gte('created_at', from)
        .lte('created_at', to)
        .in('status', ['confirmed', 'completed']),
    ]);

    // Build time-bucketed map
    const bucket = (dateStr: string): string => {
      const d = new Date(dateStr);
      if (gran === 'month') return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (gran === 'week') {
        // ISO week start (Monday)
        const day = d.getDay() || 7;
        const monday = new Date(d);
        monday.setDate(d.getDate() - day + 1);
        return monday.toISOString().slice(0, 10);
      }
      return d.toISOString().slice(0, 10);
    };

    const map: Record<string, { date: string; online: number; popup: number; total: number }> = {};

    for (const o of onlineOrders ?? []) {
      const k = bucket(o.created_at);
      if (!map[k]) map[k] = { date: k, online: 0, popup: 0, total: 0 };
      map[k].online += parseFloat(o.total ?? 0);
      map[k].total += parseFloat(o.total ?? 0);
    }

    for (const o of popupOrders ?? []) {
      const k = bucket(o.created_at);
      if (!map[k]) map[k] = { date: k, online: 0, popup: 0, total: 0 };
      map[k].popup += parseFloat(o.total ?? 0);
      map[k].total += parseFloat(o.total ?? 0);
    }

    const series = Object.values(map)
      .map((v) => ({
        date: v.date,
        online: Math.round(v.online * 100) / 100,
        popup: Math.round(v.popup * 100) / 100,
        total: Math.round(v.total * 100) / 100,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return { granularity: gran, period: { from, to }, series };
  }

  // ─── Product Analytics ────────────────────────────────────────────────────

  async getTopProducts(query: ReportQueryDto) {
    const db = this.supabase.getAdminClient();
    const { from, to } = this.resolveDateRange(query.period, query.from, query.to);
    const limit = query.limit ?? 20;

    // Online order items
    const { data: onlineItems } = await db
      .from('order_items')
      .select('product_id, product_name, quantity, total_price, orders!inner(status, created_at)')
      .gte('orders.created_at', from)
      .lte('orders.created_at', to)
      .in('orders.status', ['paid', 'processing', 'shipped', 'delivered']);

    // Popup order items
    const { data: popupItems } = await db
      .from('popup_order_items')
      .select('product_id, product_name, quantity, total_price, popup_orders!inner(status, created_at)')
      .gte('popup_orders.created_at', from)
      .lte('popup_orders.created_at', to)
      .in('popup_orders.status', ['confirmed', 'completed']);

    // Aggregate by product
    const productMap: Record<string, { name: string; units: number; revenue: number }> = {};

    const aggregate = (items: any[], nameField = 'product_name') => {
      for (const item of items ?? []) {
        const key = item.product_id ?? item[nameField];
        if (!productMap[key]) productMap[key] = { name: item[nameField], units: 0, revenue: 0 };
        productMap[key].units += item.quantity ?? 0;
        productMap[key].revenue += parseFloat(item.total_price ?? 0);
      }
    };

    aggregate(onlineItems ?? []);
    aggregate(popupItems ?? []);

    const sorted = Object.entries(productMap)
      .map(([id, v]) => ({ productId: id, name: v.name, unitsSold: v.units, revenue: Math.round(v.revenue * 100) / 100 }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);

    return { period: { from, to }, products: sorted };
  }

  // ─── Customer Analytics ───────────────────────────────────────────────────

  async getCustomerAnalytics(query: ReportQueryDto) {
    const db = this.supabase.getAdminClient();
    const { from, to } = this.resolveDateRange(query.period, query.from, query.to);

    // Customer growth over time
    const { data: profiles } = await db
      .from('profiles')
      .select('id, created_at, role')
      .gte('created_at', from)
      .lte('created_at', to)
      .order('created_at', { ascending: true });

    // Total customers ever
    const { count: totalCustomers } = await db
      .from('profiles')
      .select('id', { count: 'exact', head: true });

    // Role breakdown
    const roleBreakdown: Record<string, number> = {};
    for (const p of profiles ?? []) {
      roleBreakdown[p.role ?? 'public'] = (roleBreakdown[p.role ?? 'public'] ?? 0) + 1;
    }

    // Top customers by combined spend — online orders + popup orders
    const [{ data: topOnlineOrders }, { data: topPopupOrders }] = await Promise.all([
      db
        .from('orders')
        .select('user_id, email, total')
        .gte('created_at', from)
        .lte('created_at', to)
        .in('status', ['paid', 'processing', 'shipped', 'delivered'])
        .is('deleted_at', null),
      db
        .from('popup_orders')
        .select('customer_email, customer_name, customer_phone, total')
        .gte('created_at', from)
        .lte('created_at', to)
        .in('status', ['confirmed', 'completed']),
    ]);

    const customerSpend: Record<string, { label: string; total: number; orders: number; channels: Set<string> }> = {};

    for (const o of topOnlineOrders ?? []) {
      const k = (o.email ?? '').toLowerCase();
      if (!k) continue;
      if (!customerSpend[k]) customerSpend[k] = { label: o.email, total: 0, orders: 0, channels: new Set() };
      customerSpend[k].total += parseFloat(o.total ?? 0);
      customerSpend[k].orders += 1;
      customerSpend[k].channels.add('online');
    }

    for (const o of topPopupOrders ?? []) {
      // Use email as key when available, fall back to customer_name
      const k = o.customer_email ? o.customer_email.toLowerCase() : `popup:${o.customer_name ?? 'unknown'}`;
      if (!customerSpend[k]) {
        customerSpend[k] = {
          label: o.customer_email ?? o.customer_name ?? 'Walk-in customer',
          total: 0,
          orders: 0,
          channels: new Set(),
        };
      }
      customerSpend[k].total += parseFloat(o.total ?? 0);
      customerSpend[k].orders += 1;
      customerSpend[k].channels.add('popup');
    }

    const topCustomers = Object.values(customerSpend)
      .sort((a, b) => b.total - a.total)
      .slice(0, query.limit ?? 20)
      .map((c) => ({
        customer: c.label,
        totalSpent: Math.round(c.total * 100) / 100,
        orderCount: c.orders,
        channels: Array.from(c.channels),
      }));

    // Growth series (day buckets)
    const growthMap: Record<string, number> = {};
    for (const p of profiles ?? []) {
      const day = new Date(p.created_at).toISOString().slice(0, 10);
      growthMap[day] = (growthMap[day] ?? 0) + 1;
    }
    const growthSeries = Object.entries(growthMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      period: { from, to },
      totalCustomers: totalCustomers ?? 0,
      newInPeriod: (profiles ?? []).length,
      roleBreakdown,
      growthSeries,
      topCustomers, // includes both online account holders and popup walk-ins
    };
  }

  // ─── Popup Event Analytics ────────────────────────────────────────────────

  async getPopupAnalytics(query: ReportQueryDto) {
    const db = this.supabase.getAdminClient();
    const { from, to } = this.resolveDateRange(query.period, query.from, query.to);

    const { data: events } = await db
      .from('popup_events')
      .select('id, name, event_date, status, location')
      .order('event_date', { ascending: false });

    const { data: orders } = await db
      .from('popup_orders')
      .select('id, event_id, total, status, payment_method, discount_amount, created_at')
      .gte('created_at', from)
      .lte('created_at', to);

    const { data: items } = await db
      .from('popup_order_items')
      .select('order_id, product_name, quantity, total_price, popup_orders!inner(event_id, status, created_at)')
      .gte('popup_orders.created_at', from)
      .lte('popup_orders.created_at', to)
      .in('popup_orders.status', ['confirmed', 'completed']);

    // Per-event aggregation
    const eventMap: Record<string, any> = {};
    for (const e of events ?? []) {
      eventMap[e.id] = { ...e, revenue: 0, orderCount: 0, completedOrders: 0, cancelledOrders: 0, refundedOrders: 0, discountTotal: 0 };
    }

    const paymentMethods: Record<string, number> = {};
    for (const o of orders ?? []) {
      if (eventMap[o.event_id]) {
        eventMap[o.event_id].orderCount += 1;
        if (['confirmed', 'completed'].includes(o.status)) {
          eventMap[o.event_id].revenue += parseFloat(o.total ?? 0);
          eventMap[o.event_id].completedOrders += 1;
        }
        if (o.status === 'cancelled') eventMap[o.event_id].cancelledOrders += 1;
        if (o.status === 'refunded') eventMap[o.event_id].refundedOrders += 1;
        eventMap[o.event_id].discountTotal += parseFloat(o.discount_amount ?? 0);
      }
      if (o.payment_method) {
        paymentMethods[o.payment_method] = (paymentMethods[o.payment_method] ?? 0) + 1;
      }
    }

    // Top popup products
    const popupProductMap: Record<string, { name: string; units: number; revenue: number }> = {};
    for (const item of items ?? []) {
      const k = item.product_name;
      if (!popupProductMap[k]) popupProductMap[k] = { name: k, units: 0, revenue: 0 };
      popupProductMap[k].units += item.quantity ?? 0;
      popupProductMap[k].revenue += parseFloat(item.total_price ?? 0);
    }
    const topPopupProducts = Object.values(popupProductMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, query.limit ?? 20)
      .map((p) => ({ name: p.name, unitsSold: p.units, revenue: Math.round(p.revenue * 100) / 100 }));

    const eventSummaries = Object.values(eventMap).map((e) => ({
      id: e.id,
      name: e.name,
      location: e.location,
      eventDate: e.event_date,
      status: e.status,
      revenue: Math.round(e.revenue * 100) / 100,
      orderCount: e.orderCount,
      completedOrders: e.completedOrders,
      cancelledOrders: e.cancelledOrders,
      refundedOrders: e.refundedOrders,
      discountTotal: Math.round(e.discountTotal * 100) / 100,
    }));

    return {
      period: { from, to },
      events: eventSummaries,
      paymentMethodBreakdown: paymentMethods,
      topProducts: topPopupProducts,
    };
  }

  // ─── Inventory Snapshot ───────────────────────────────────────────────────

  async getInventorySnapshot() {
    const db = this.supabase.getAdminClient();

    const { data: variants } = await db
      .from('product_variants')
      .select('id, sku, price, cost_per_item, inventory_quantity, available, products!inner(id, title, status, deleted_at)')
      .is('products.deleted_at', null)
      .eq('products.status', 'active');

    let totalUnits = 0;
    let totalRetailValue = 0;
    let totalCostValue = 0;
    let outOfStock = 0;
    let lowStock = 0;

    for (const v of variants ?? []) {
      const qty = v.inventory_quantity ?? 0;
      totalUnits += qty;
      totalRetailValue += qty * parseFloat(v.price ?? 0);
      totalCostValue += qty * parseFloat(v.cost_per_item ?? 0);
      if (qty === 0) outOfStock++;
      else if (qty <= 5) lowStock++;
    }

    // Recent movements (last 30 days)
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const { data: movements } = await db
      .from('inventory_movements')
      .select('movement_type, quantity_change')
      .gte('created_at', since.toISOString());

    const movementSummary: Record<string, number> = {};
    for (const m of movements ?? []) {
      movementSummary[m.movement_type] = (movementSummary[m.movement_type] ?? 0) + Math.abs(m.quantity_change ?? 0);
    }

    return {
      totalVariants: (variants ?? []).length,
      totalUnits,
      outOfStock,
      lowStock,
      retailValue: Math.round(totalRetailValue * 100) / 100,
      costValue: Math.round(totalCostValue * 100) / 100,
      potentialMargin: Math.round((totalRetailValue - totalCostValue) * 100) / 100,
      movementSummaryLast30Days: movementSummary,
    };
  }

  // ─── Reports ──────────────────────────────────────────────────────────────

  /**
   * Sales Report — line-item breakdown per order with totals.
   * Suitable for export / financial review.
   */
  async getSalesReport(query: ReportQueryDto) {
    const db = this.supabase.getAdminClient();
    const { from, to } = this.resolveDateRange(query.period, query.from, query.to);

    const [{ data: onlineOrders }, { data: popupOrders }] = await Promise.all([
      db
        .from('orders')
        .select('id, order_number, email, status, subtotal, discount, shipping_cost, tax, total, currency, payment_provider, payment_status, created_at')
        .gte('created_at', from)
        .lte('created_at', to)
        .is('deleted_at', null)
        .order('created_at', { ascending: false }),
      db
        .from('popup_orders')
        .select('id, order_number, customer_name, customer_email, customer_phone, status, payment_method, subtotal, total, discount_amount, discount_type, created_at, popup_events!inner(name)')
        .gte('created_at', from)
        .lte('created_at', to)
        .order('created_at', { ascending: false }),
    ]);

    const completedOnline = (onlineOrders ?? []).filter((o) =>
      ['paid', 'processing', 'shipped', 'delivered'].includes(o.status),
    );
    const completedPopup = (popupOrders ?? []).filter((o) =>
      ['confirmed', 'completed'].includes(o.status),
    );

    const onlineRevenue = completedOnline.reduce((s, o) => s + parseFloat(o.total ?? 0), 0);
    const popupRevenue = completedPopup.reduce((s, o) => s + parseFloat(o.total ?? 0), 0);
    const totalDiscount =
      (onlineOrders ?? []).reduce((s, o) => s + parseFloat(o.discount ?? 0), 0) +
      (popupOrders ?? []).reduce((s, o) => s + parseFloat(o.discount_amount ?? 0), 0);

    return {
      period: { from, to },
      summary: {
        totalOrders: (onlineOrders ?? []).length + (popupOrders ?? []).length,
        completedOrders: completedOnline.length + completedPopup.length,
        totalRevenue: Math.round((onlineRevenue + popupRevenue) * 100) / 100,
        onlineRevenue: Math.round(onlineRevenue * 100) / 100,
        popupRevenue: Math.round(popupRevenue * 100) / 100,
        totalDiscountGiven: Math.round(totalDiscount * 100) / 100,
        averageOrderValue:
          completedOnline.length + completedPopup.length > 0
            ? Math.round(((onlineRevenue + popupRevenue) / (completedOnline.length + completedPopup.length)) * 100) / 100
            : 0,
      },
      onlineOrders: onlineOrders ?? [],
      popupOrders: popupOrders ?? [],
    };
  }

  /**
   * Financial Summary Report — aggregated P&L-style view grouped by period.
   */
  async getFinancialSummary(query: ReportQueryDto) {
    const db = this.supabase.getAdminClient();
    const { from, to } = this.resolveDateRange(query.period, query.from, query.to);
    const gran = query.granularity ?? 'month';

    const bucket = (dateStr: string): string => {
      const d = new Date(dateStr);
      if (gran === 'month') return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (gran === 'week') {
        const day = d.getDay() || 7;
        const monday = new Date(d);
        monday.setDate(d.getDate() - day + 1);
        return monday.toISOString().slice(0, 10);
      }
      return d.toISOString().slice(0, 10);
    };

    const [{ data: onlineOrders }, { data: popupOrders }, { data: orderItems }] = await Promise.all([
      db
        .from('orders')
        .select('total, subtotal, discount, shipping_cost, tax, status, created_at')
        .gte('created_at', from)
        .lte('created_at', to)
        .is('deleted_at', null),
      db
        .from('popup_orders')
        .select('total, subtotal, discount_amount, status, created_at')
        .gte('created_at', from)
        .lte('created_at', to),
      db
        .from('order_items')
        .select('total_price, quantity, orders!inner(status, created_at)')
        .gte('orders.created_at', from)
        .lte('orders.created_at', to)
        .in('orders.status', ['paid', 'processing', 'shipped', 'delivered']),
    ]);

    const periodMap: Record<string, {
      period: string;
      grossRevenue: number;
      discounts: number;
      shippingRevenue: number;
      tax: number;
      netRevenue: number;
      orders: number;
    }> = {};

    const ensurePeriod = (k: string) => {
      if (!periodMap[k]) {
        periodMap[k] = { period: k, grossRevenue: 0, discounts: 0, shippingRevenue: 0, tax: 0, netRevenue: 0, orders: 0 };
      }
    };

    const completedOnlineStatuses = ['paid', 'processing', 'shipped', 'delivered'];
    for (const o of onlineOrders ?? []) {
      const k = bucket(o.created_at);
      ensurePeriod(k);
      periodMap[k].orders += 1;
      if (completedOnlineStatuses.includes(o.status)) {
        periodMap[k].grossRevenue += parseFloat(o.subtotal ?? 0);
        periodMap[k].discounts += parseFloat(o.discount ?? 0);
        periodMap[k].shippingRevenue += parseFloat(o.shipping_cost ?? 0);
        periodMap[k].tax += parseFloat(o.tax ?? 0);
        periodMap[k].netRevenue += parseFloat(o.total ?? 0);
      }
    }

    for (const o of popupOrders ?? []) {
      const k = bucket(o.created_at);
      ensurePeriod(k);
      periodMap[k].orders += 1;
      if (['confirmed', 'completed'].includes(o.status)) {
        periodMap[k].grossRevenue += parseFloat(o.subtotal ?? 0);
        periodMap[k].discounts += parseFloat(o.discount_amount ?? 0);
        periodMap[k].netRevenue += parseFloat(o.total ?? 0);
      }
    }

    const series = Object.values(periodMap)
      .map((p) => ({
        period: p.period,
        grossRevenue: Math.round(p.grossRevenue * 100) / 100,
        discounts: Math.round(p.discounts * 100) / 100,
        shippingRevenue: Math.round(p.shippingRevenue * 100) / 100,
        tax: Math.round(p.tax * 100) / 100,
        netRevenue: Math.round(p.netRevenue * 100) / 100,
        orders: p.orders,
      }))
      .sort((a, b) => a.period.localeCompare(b.period));

    const totals = series.reduce(
      (acc, p) => ({
        grossRevenue: acc.grossRevenue + p.grossRevenue,
        discounts: acc.discounts + p.discounts,
        shippingRevenue: acc.shippingRevenue + p.shippingRevenue,
        tax: acc.tax + p.tax,
        netRevenue: acc.netRevenue + p.netRevenue,
        orders: acc.orders + p.orders,
      }),
      { grossRevenue: 0, discounts: 0, shippingRevenue: 0, tax: 0, netRevenue: 0, orders: 0 },
    );

    return {
      granularity: gran,
      period: { from, to },
      totals: {
        grossRevenue: Math.round(totals.grossRevenue * 100) / 100,
        discounts: Math.round(totals.discounts * 100) / 100,
        shippingRevenue: Math.round(totals.shippingRevenue * 100) / 100,
        tax: Math.round(totals.tax * 100) / 100,
        netRevenue: Math.round(totals.netRevenue * 100) / 100,
        orders: totals.orders,
      },
      series,
    };
  }

  /**
   * Product Performance Report — revenue, units sold, return rate per product.
   */
  async getProductPerformanceReport(query: ReportQueryDto) {
    const db = this.supabase.getAdminClient();
    const { from, to } = this.resolveDateRange(query.period, query.from, query.to);

    const [{ data: onlineItems }, { data: popupItems }, { data: refunds }] = await Promise.all([
      db
        .from('order_items')
        .select('product_id, product_name, sku, quantity, unit_price, total_price, orders!inner(status, created_at)')
        .gte('orders.created_at', from)
        .lte('orders.created_at', to)
        .in('orders.status', ['paid', 'processing', 'shipped', 'delivered']),
      db
        .from('popup_order_items')
        .select('product_id, product_name, sku, quantity, unit_price, total_price, popup_orders!inner(status, created_at)')
        .gte('popup_orders.created_at', from)
        .lte('popup_orders.created_at', to)
        .in('popup_orders.status', ['confirmed', 'completed']),
      db
        .from('orders')
        .select('id')
        .gte('created_at', from)
        .lte('created_at', to)
        .eq('status', 'refunded'),
    ]);

    const productMap: Record<string, {
      name: string;
      sku: string;
      unitsSold: number;
      revenue: number;
      avgPrice: number;
      priceSum: number;
      count: number;
    }> = {};

    const addItem = (item: any) => {
      const key = item.product_id ?? item.product_name;
      if (!productMap[key]) {
        productMap[key] = { name: item.product_name, sku: item.sku ?? '', unitsSold: 0, revenue: 0, avgPrice: 0, priceSum: 0, count: 0 };
      }
      productMap[key].unitsSold += item.quantity ?? 0;
      productMap[key].revenue += parseFloat(item.total_price ?? 0);
      productMap[key].priceSum += parseFloat(item.unit_price ?? 0);
      productMap[key].count += 1;
    };

    for (const item of onlineItems ?? []) addItem(item);
    for (const item of popupItems ?? []) addItem(item);

    const products = Object.entries(productMap)
      .map(([id, p]) => ({
        productId: id,
        name: p.name,
        sku: p.sku,
        unitsSold: p.unitsSold,
        revenue: Math.round(p.revenue * 100) / 100,
        avgSellingPrice: p.count > 0 ? Math.round((p.priceSum / p.count) * 100) / 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, query.limit ?? 50);

    return {
      period: { from, to },
      refundedOrderCount: (refunds ?? []).length,
      products,
    };
  }

  /**
   * Customer Acquisition Report — how customers found Iris (based on registration over time).
   */
  async getCustomerAcquisitionReport(query: ReportQueryDto) {
    const db = this.supabase.getAdminClient();
    const { from, to } = this.resolveDateRange(query.period, query.from, query.to);
    const gran = query.granularity ?? 'day';

    const bucket = (dateStr: string): string => {
      const d = new Date(dateStr);
      if (gran === 'month') return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (gran === 'week') {
        const day = d.getDay() || 7;
        const monday = new Date(d);
        monday.setDate(d.getDate() - day + 1);
        return monday.toISOString().slice(0, 10);
      }
      return d.toISOString().slice(0, 10);
    };

    const [{ data: profiles }, { data: subscribers }] = await Promise.all([
      db
        .from('profiles')
        .select('id, created_at, role, migrated_from')
        .gte('created_at', from)
        .lte('created_at', to)
        .order('created_at', { ascending: true }),
      db
        .from('newsletter_subscribers')
        .select('id, subscribed_at')
        .gte('subscribed_at', from)
        .lte('subscribed_at', to)
        .order('subscribed_at', { ascending: true }),
    ]);

    const signupMap: Record<string, number> = {};
    const subMap: Record<string, number> = {};
    let migratedCount = 0;
    const roleBreakdown: Record<string, number> = {};

    for (const p of profiles ?? []) {
      const k = bucket(p.created_at);
      signupMap[k] = (signupMap[k] ?? 0) + 1;
      if (p.migrated_from) migratedCount++;
      roleBreakdown[p.role ?? 'public'] = (roleBreakdown[p.role ?? 'public'] ?? 0) + 1;
    }

    for (const s of subscribers ?? []) {
      const k = bucket(s.subscribed_at);
      subMap[k] = (subMap[k] ?? 0) + 1;
    }

    const allKeys = new Set([...Object.keys(signupMap), ...Object.keys(subMap)]);
    const series = Array.from(allKeys)
      .sort()
      .map((date) => ({ date, newSignups: signupMap[date] ?? 0, newsletterSubscribers: subMap[date] ?? 0 }));

    return {
      granularity: gran,
      period: { from, to },
      totals: {
        newCustomers: (profiles ?? []).length,
        migratedCustomers: migratedCount,
        organicCustomers: (profiles ?? []).length - migratedCount,
        newsletterSubscribers: (subscribers ?? []).length,
      },
      roleBreakdown,
      series,
    };
  }

  /**
   * Discount & Promotions Report — how much discount was given and in what form.
   */
  async getDiscountReport(query: ReportQueryDto) {
    const db = this.supabase.getAdminClient();
    const { from, to } = this.resolveDateRange(query.period, query.from, query.to);

    const [{ data: onlineOrders }, { data: popupOrders }] = await Promise.all([
      db
        .from('orders')
        .select('total, subtotal, discount, status, created_at')
        .gte('created_at', from)
        .lte('created_at', to)
        .is('deleted_at', null),
      db
        .from('popup_orders')
        .select('total, subtotal, discount_amount, discount_type, discount_reason, status, created_at')
        .gte('created_at', from)
        .lte('created_at', to),
    ]);

    const completedOnline = (onlineOrders ?? []).filter((o) =>
      ['paid', 'processing', 'shipped', 'delivered'].includes(o.status),
    );
    const completedPopup = (popupOrders ?? []).filter((o) =>
      ['confirmed', 'completed'].includes(o.status),
    );

    const onlineDiscount = completedOnline.reduce((s, o) => s + parseFloat(o.discount ?? 0), 0);
    const popupDiscount = completedPopup.reduce((s, o) => s + parseFloat(o.discount_amount ?? 0), 0);

    const ordersWithDiscount = completedOnline.filter((o) => parseFloat(o.discount ?? 0) > 0).length
      + completedPopup.filter((o) => parseFloat(o.discount_amount ?? 0) > 0).length;

    const popupDiscountByType: Record<string, { count: number; total: number }> = {};
    for (const o of completedPopup) {
      if (parseFloat(o.discount_amount ?? 0) > 0) {
        const type = o.discount_type ?? 'none';
        if (!popupDiscountByType[type]) popupDiscountByType[type] = { count: 0, total: 0 };
        popupDiscountByType[type].count += 1;
        popupDiscountByType[type].total += parseFloat(o.discount_amount ?? 0);
      }
    }

    const onlineRevenue = completedOnline.reduce((s, o) => s + parseFloat(o.total ?? 0), 0);
    const popupRevenue = completedPopup.reduce((s, o) => s + parseFloat(o.total ?? 0), 0);
    const totalRevenue = onlineRevenue + popupRevenue;
    const totalDiscount = onlineDiscount + popupDiscount;

    return {
      period: { from, to },
      summary: {
        totalDiscountGiven: Math.round(totalDiscount * 100) / 100,
        onlineDiscount: Math.round(onlineDiscount * 100) / 100,
        popupDiscount: Math.round(popupDiscount * 100) / 100,
        ordersWithDiscount,
        discountAsPercentOfRevenue: totalRevenue > 0 ? Math.round((totalDiscount / totalRevenue) * 10000) / 100 : 0,
      },
      popupDiscountBreakdown: popupDiscountByType,
    };
  }

  /**
   * Payment Methods Report — breakdown of how customers pay.
   */
  async getPaymentMethodsReport(query: ReportQueryDto) {
    const db = this.supabase.getAdminClient();
    const { from, to } = this.resolveDateRange(query.period, query.from, query.to);

    const [{ data: onlineOrders }, { data: popupOrders }, { data: splitPayments }] = await Promise.all([
      db
        .from('orders')
        .select('payment_provider, payment_status, total, status, created_at')
        .gte('created_at', from)
        .lte('created_at', to)
        .is('deleted_at', null),
      db
        .from('popup_orders')
        .select('payment_method, total, status, created_at')
        .gte('created_at', from)
        .lte('created_at', to),
      db
        .from('popup_split_payments')
        .select('method, amount, created_at')
        .gte('created_at', from)
        .lte('created_at', to),
    ]);

    const onlineByProvider: Record<string, { count: number; revenue: number }> = {};
    for (const o of onlineOrders ?? []) {
      const provider = o.payment_provider ?? 'unknown';
      if (!onlineByProvider[provider]) onlineByProvider[provider] = { count: 0, revenue: 0 };
      onlineByProvider[provider].count += 1;
      if (['paid', 'processing', 'shipped', 'delivered'].includes(o.status)) {
        onlineByProvider[provider].revenue += parseFloat(o.total ?? 0);
      }
    }

    const popupByMethod: Record<string, { count: number; revenue: number }> = {};
    for (const o of popupOrders ?? []) {
      const method = o.payment_method ?? 'unknown';
      if (!popupByMethod[method]) popupByMethod[method] = { count: 0, revenue: 0 };
      popupByMethod[method].count += 1;
      if (['confirmed', 'completed'].includes(o.status)) {
        popupByMethod[method].revenue += parseFloat(o.total ?? 0);
      }
    }

    const splitByMethod: Record<string, { count: number; amount: number }> = {};
    for (const s of splitPayments ?? []) {
      const method = s.method ?? 'unknown';
      if (!splitByMethod[method]) splitByMethod[method] = { count: 0, amount: 0 };
      splitByMethod[method].count += 1;
      splitByMethod[method].amount += parseFloat(s.amount ?? 0);
    }

    return {
      period: { from, to },
      online: Object.entries(onlineByProvider).map(([provider, d]) => ({
        provider,
        orderCount: d.count,
        revenue: Math.round(d.revenue * 100) / 100,
      })),
      popup: Object.entries(popupByMethod).map(([method, d]) => ({
        method,
        orderCount: d.count,
        revenue: Math.round(d.revenue * 100) / 100,
      })),
      splitPayments: Object.entries(splitByMethod).map(([method, d]) => ({
        method,
        transactionCount: d.count,
        amount: Math.round(d.amount * 100) / 100,
      })),
    };
  }

  // ─── Event Ingest (public, storefront beacon) ─────────────────────────────

  async trackEvents(dto: TrackEventsDto) {
    const db = this.supabase.getAdminClient();
    const rows = dto.events.map((e) => ({
      session_id: e.sessionId.slice(0, 64),
      visitor_id: e.visitorId?.slice(0, 64) ?? null,
      event_type: e.eventType,
      path: e.path?.slice(0, 512) ?? null,
      referrer: e.referrer?.slice(0, 512) ?? null,
      landing_page: e.landingPage?.slice(0, 512) ?? null,
      device_type: e.deviceType ?? null,
      user_id: e.userId ?? null,
      product_id: e.productId ?? null,
      order_id: e.orderId ?? null,
      value: e.value ?? null,
      metadata: e.metadata && JSON.stringify(e.metadata).length <= 2048 ? e.metadata : null,
    }));
    if (rows.length === 0) return;
    // Ingest must never throw into the storefront; drop on failure.
    await db.from('analytics_events').insert(rows);
  }

  // ─── Checkout snapshots (public, abandoned-checkout capture) ──────────────

  async saveCheckoutSnapshot(dto: CheckoutSnapshotDto) {
    const db = this.supabase.getAdminClient();
    const { data: existing } = await db
      .from('checkout_sessions')
      .select('id')
      .eq('session_id', dto.sessionId)
      .eq('status', 'open')
      .maybeSingle();

    const items = dto.items.map((i) => ({
      productId: i.productId ?? null,
      variantId: i.variantId ?? null,
      productName: i.productName.slice(0, 256),
      variantTitle: i.variantTitle?.slice(0, 256) ?? null,
      sku: i.sku ?? null,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      lineTotal: round2(i.unitPrice * i.quantity),
      imageUrl: i.imageUrl ?? null,
    }));

    const fields = {
      visitor_id: dto.visitorId ?? null,
      user_id: dto.userId ?? null,
      email: dto.email?.toLowerCase() ?? null,
      phone: dto.phone ?? null,
      customer_name: dto.customerName ?? null,
      items,
      subtotal: dto.subtotal ?? round2(items.reduce((s, i) => s + i.lineTotal, 0)),
      updated_at: new Date().toISOString(),
    };

    const completed = dto.completedOrderId
      ? { status: 'completed', order_id: dto.completedOrderId, completed_at: new Date().toISOString() }
      : {};

    const { error } = existing
      ? await db.from('checkout_sessions').update({ ...fields, ...completed }).eq('id', existing.id)
      : await db.from('checkout_sessions').insert({ session_id: dto.sessionId, ...fields, ...completed });

    // Surface write failures (e.g. missing grants / RLS) instead of swallowing
    // them — a silent failure here means abandoned checkouts never register.
    if (error) {
      this.logger.error(
        `Failed to save checkout snapshot (session ${dto.sessionId}): ${error.message}`,
      );
    }
  }

  // ─── Sessions / Conversion ─────────────────────────────────────────────────

  async getSessionsAnalytics(query: ReportQueryDto) {
    const db = this.supabase.getAdminClient();
    const range = this.resolveDateRange(query.period, query.from, query.to);
    const ctx = new ReportContext(db, range, (query.granularity as Granularity) ?? 'day');

    const [curEvents, prevEvents, firstEvent] = await Promise.all([
      ctx.events('current'),
      ctx.events('previous'),
      db.from('analytics_events').select('created_at').order('created_at', { ascending: true }).limit(1).maybeSingle(),
    ]);

    const summarize = (events: typeof curEvents) => {
      const sessions = aggregateSessions(events);
      const funnel = { sessions: 0, addedToCart: 0, reachedCheckout: 0, purchased: 0 };
      const sessionsByDay: Record<string, number> = {};
      const conversionByDay: Record<string, { sessions: number; purchased: number }> = {};
      const byDevice: Record<string, number> = {};
      const byReferrer: Record<string, number> = {};
      const byLandingPage: Record<string, number> = {};
      for (const s of sessions.values()) {
        const day = s.firstTs.slice(0, 10);
        funnel.sessions += 1;
        if (s.types.has('add_to_cart')) funnel.addedToCart += 1;
        if (s.types.has('checkout_started')) funnel.reachedCheckout += 1;
        if (s.types.has('purchase')) funnel.purchased += 1;
        sessionsByDay[day] = (sessionsByDay[day] ?? 0) + 1;
        if (!conversionByDay[day]) conversionByDay[day] = { sessions: 0, purchased: 0 };
        conversionByDay[day].sessions += 1;
        if (s.types.has('purchase')) conversionByDay[day].purchased += 1;
        const device = s.device ?? 'unknown';
        byDevice[device] = (byDevice[device] ?? 0) + 1;
        const ref = referrerLabel(s.referrer);
        byReferrer[ref] = (byReferrer[ref] ?? 0) + 1;
        const landing = s.landingPage ?? '/';
        byLandingPage[landing] = (byLandingPage[landing] ?? 0) + 1;
      }
      const conversionRate = funnel.sessions > 0 ? round2((funnel.purchased / funnel.sessions) * 100) : 0;
      return { funnel, conversionRate, sessionsByDay, conversionByDay, byDevice, byReferrer, byLandingPage };
    };

    const current = summarize(curEvents);
    const previous = summarize(prevEvents);

    return {
      range,
      trackingSince: firstEvent?.data?.created_at ?? null,
      ...current,
      previous: {
        funnel: previous.funnel,
        conversionRate: previous.conversionRate,
        sessionsByDay: previous.sessionsByDay,
      },
    };
  }

  // ─── Sales breakdown (Shopify "Total sales breakdown") ────────────────────

  async getSalesBreakdown(query: ReportQueryDto) {
    const db = this.supabase.getAdminClient();
    const range = this.resolveDateRange(query.period, query.from, query.to);
    const ctx = new ReportContext(db, range, 'day');

    const load = async (w: 'current' | 'previous') => {
      const [online, popup, refunded, popupRefunds] = await Promise.all([
        ctx.onlineOrders(w),
        ctx.popupOrders(w),
        ctx.refundedOrders(w),
        ctx.popupRefunds(w),
      ]);
      let grossSales = 0;
      let discounts = 0;
      let shipping = 0;
      let tax = 0;
      let returns = 0;
      let orders = 0;
      for (const o of online) {
        grossSales += num(o.subtotal);
        discounts += num(o.discount);
        shipping += num(o.shipping_cost);
        tax += num(o.tax);
        orders += 1;
      }
      for (const o of popup) {
        grossSales += num(o.subtotal);
        discounts += num(o.discount_amount);
        orders += 1;
      }
      for (const o of refunded) returns += num(o.total);
      for (const r of popupRefunds) returns += num(r.amount);
      const netSales = grossSales - discounts - returns;
      return {
        grossSales: round2(grossSales),
        discounts: round2(discounts),
        returns: round2(returns),
        netSales: round2(netSales),
        shipping: round2(shipping),
        tax: round2(tax),
        totalSales: round2(netSales + shipping + tax),
        orders,
      };
    };

    const [current, previous] = await Promise.all([load('current'), load('previous')]);
    return { range, ...current, previous };
  }

  // ─── Returning customer rate ───────────────────────────────────────────────

  async getReturningCustomerRate(query: ReportQueryDto) {
    const db = this.supabase.getAdminClient();
    const range = this.resolveDateRange(query.period, query.from, query.to);
    const ctx = new ReportContext(db, range, 'day');

    const firstOrders = await ctx.customerFirstOrder();

    // Profiles with migrated Shopify history count as returning even if this
    // is their first Iris-era order.
    const { data: shopifyProfiles } = await db
      .from('profiles')
      .select('id, email')
      .gt('shopify_total_orders', 0)
      .limit(5000);
    const shopifyKeys = new Set<string>();
    for (const p of shopifyProfiles ?? []) {
      shopifyKeys.add(`u:${p.id}`);
      if (p.email) shopifyKeys.add(`e:${p.email.toLowerCase()}`);
    }

    const compute = async (w: 'current' | 'previous') => {
      const [online, popup] = await Promise.all([ctx.onlineOrders(w), ctx.popupOrders(w)]);
      const customers = new Map<string, string>(); // key -> earliest order ts in window
      const consider = (key: string | null, ts: string) => {
        if (!key) return;
        const cur = customers.get(key);
        if (!cur || ts < cur) customers.set(key, ts);
      };
      for (const o of online) consider(onlineCustomerKey(o), o.created_at);
      for (const o of popup) consider(popupCustomerKey(o), o.created_at);

      let returning = 0;
      for (const [key, ts] of customers.entries()) {
        const first = firstOrders.get(key);
        if ((first && first < ts) || shopifyKeys.has(key)) returning += 1;
      }
      const total = customers.size;
      return { total, returning, rate: total > 0 ? round2((returning / total) * 100) : 0 };
    };

    const [current, previous] = await Promise.all([compute('current'), compute('previous')]);
    return {
      range,
      totalCustomers: current.total,
      returning: current.returning,
      rate: current.rate,
      previousRate: previous.rate,
      previousTotalCustomers: previous.total,
    };
  }

  // ─── Abandoned checkouts ───────────────────────────────────────────────────

  async getAbandonedCheckouts(query: AbandonedCheckoutsQueryDto) {
    const db = this.supabase.getAdminClient();
    const staleCutoff = new Date(Date.now() - ABANDON_AFTER_MS).toISOString();
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    let q = db
      .from('checkout_sessions')
      .select(
        'id, session_id, user_id, email, phone, customer_name, items, subtotal, status, reminder_sent_at, recovered_at, created_at, updated_at',
        { count: 'exact' },
      )
      .eq('status', 'open')
      .lt('updated_at', staleCutoff)
      .order('updated_at', { ascending: false });

    if (query.from) q = q.gte('created_at', query.from);
    if (query.to) q = q.lte('created_at', query.to);
    if (query.search) {
      const s = query.search.replace(/[%,()]/g, '');
      q = q.or(`email.ilike.%${s}%,customer_name.ilike.%${s}%,phone.ilike.%${s}%`);
    }

    const { data: rows, count } = await q.range((page - 1) * limit, page * limit - 1);
    const enriched = await this.enrichCheckouts(rows ?? []);
    const recovery = await this.getRecoverySummary(query.from, query.to);

    return {
      checkouts: enriched,
      total: count ?? 0,
      page,
      limit,
      recovery,
    };
  }

  /**
   * Recovery-rate stats over the (optional) date range: how many reminder
   * emails went out and how many of those carts were subsequently recovered.
   */
  private async getRecoverySummary(from?: string, to?: string) {
    const db = this.supabase.getAdminClient();
    const remindedQ = db
      .from('checkout_sessions')
      .select('id', { count: 'exact', head: true })
      .not('reminder_sent_at', 'is', null);
    const recoveredQ = db
      .from('checkout_sessions')
      .select('id', { count: 'exact', head: true })
      .not('reminder_sent_at', 'is', null)
      .not('recovered_at', 'is', null);

    if (from) {
      remindedQ.gte('created_at', from);
      recoveredQ.gte('created_at', from);
    }
    if (to) {
      remindedQ.lte('created_at', to);
      recoveredQ.lte('created_at', to);
    }

    const [{ count: remindersSent }, { count: recoveredCount }] = await Promise.all([
      remindedQ,
      recoveredQ,
    ]);
    const sent = remindersSent ?? 0;
    const recovered = recoveredCount ?? 0;
    return {
      remindersSent: sent,
      recoveredCount: recovered,
      recoveryRate: sent > 0 ? round2((recovered / sent) * 100) : 0,
    };
  }

  async getAbandonedCheckout(id: string) {
    const db = this.supabase.getAdminClient();
    const { data: row } = await db
      .from('checkout_sessions')
      .select('id, session_id, user_id, email, phone, customer_name, items, subtotal, status, order_id, completed_at, created_at, updated_at')
      .eq('id', id)
      .maybeSingle();
    if (!row) throw new NotFoundException('Checkout not found');
    const [enriched] = await this.enrichCheckouts([row]);
    return { ...enriched, items: row.items ?? [], sessionId: row.session_id, completedAt: row.completed_at };
  }

  /** Attach matched profile + recovered-order info to checkout rows. */
  private async enrichCheckouts(rows: any[]) {
    const db = this.supabase.getAdminClient();
    if (rows.length === 0) return [];

    const userIds = rows.map((r) => r.user_id).filter(Boolean);
    const emails = rows.map((r) => (r.email ?? '').toLowerCase()).filter(Boolean);

    const [profilesById, profilesByEmail, laterOrders] = await Promise.all([
      userIds.length
        ? db.from('profiles').select('id, email, first_name, last_name').in('id', userIds)
        : Promise.resolve({ data: [] as any[] }),
      emails.length
        ? db.from('profiles').select('id, email, first_name, last_name').in('email', emails)
        : Promise.resolve({ data: [] as any[] }),
      // Any later revenue order by the same user/email marks the checkout recovered.
      userIds.length || emails.length
        ? db
            .from('orders')
            .select('id, order_number, user_id, email, created_at, total')
            .is('deleted_at', null)
            .in('status', ONLINE_REVENUE_STATUSES)
            .or(
              [
                userIds.length ? `user_id.in.(${userIds.join(',')})` : null,
                emails.length ? `email.in.(${emails.map((e) => `"${e}"`).join(',')})` : null,
              ]
                .filter(Boolean)
                .join(','),
            )
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const profileMap = new Map<string, any>();
    for (const p of [...(profilesById.data ?? []), ...(profilesByEmail.data ?? [])]) {
      profileMap.set(`u:${p.id}`, p);
      if (p.email) profileMap.set(`e:${p.email.toLowerCase()}`, p);
    }

    return rows.map((r) => {
      const items: any[] = Array.isArray(r.items) ? r.items : [];
      const profile =
        (r.user_id && profileMap.get(`u:${r.user_id}`)) ||
        (r.email && profileMap.get(`e:${r.email.toLowerCase()}`)) ||
        null;
      const recoveredBy = (laterOrders.data ?? []).find(
        (o: any) =>
          o.created_at > r.updated_at &&
          ((r.user_id && o.user_id === r.user_id) ||
            (r.email && (o.email ?? '').toLowerCase() === r.email.toLowerCase())),
      );
      return {
        id: r.id,
        date: r.created_at,
        lastActivity: r.updated_at,
        status: recoveredBy ? 'recovered' : r.status === 'open' ? 'abandoned' : r.status,
        customer: {
          name:
            r.customer_name ||
            (profile ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() : null) ||
            null,
          email: r.email ?? profile?.email ?? null,
          phone: r.phone ?? null,
          profileId: profile?.id ?? null,
        },
        itemCount: items.reduce((s, i) => s + (i.quantity ?? 0), 0),
        itemThumbnails: items.map((i) => i.imageUrl).filter(Boolean).slice(0, 3),
        items,
        subtotal: num(r.subtotal),
        reminderSentAt: r.reminder_sent_at ?? null,
        recoveredAt: r.recovered_at ?? null,
        recoveredBy: recoveredBy
          ? { orderId: recoveredBy.id, orderNumber: recoveredBy.order_number, total: num(recoveredBy.total), date: recoveredBy.created_at }
          : null,
      };
    });
  }

  // ─── Abandoned checkout recovery (cron-driven) ─────────────────────────────

  /**
   * Entry point for the scheduled job: first reconcile any reminded carts that
   * have since converted, then send reminders for newly-eligible carts.
   */
  async runAbandonedCheckoutRecovery(): Promise<{ reminded: number; recovered: number }> {
    const recovered = await this.reconcileRecoveries();
    const reminded = await this.sendAbandonedCheckoutReminders();
    return { reminded, recovered };
  }

  /**
   * Mark reminded-but-still-open carts as recovered when the same customer has
   * since placed a revenue order. Powers the recovery-rate metric.
   */
  private async reconcileRecoveries(): Promise<number> {
    const db = this.supabase.getAdminClient();
    const { data: rows, error } = await this.withRetry('reconcileRecoveries', () =>
      db
        .from('checkout_sessions')
        .select('id, user_id, email, reminder_sent_at')
        .eq('status', 'open')
        .not('reminder_sent_at', 'is', null)
        .is('recovered_at', null),
    );

    if (error) {
      const cause = (error as any)?.cause;
      this.logger.error(
        `reconcileRecoveries query failed: ${error.message}${cause ? ` (cause: ${cause.code ?? cause})` : ''}`,
      );
      return 0;
    }
    if (!rows?.length) return 0;

    const userIds = rows.map((r) => r.user_id).filter(Boolean);
    const emails = rows.map((r) => (r.email ?? '').toLowerCase()).filter(Boolean);
    if (!userIds.length && !emails.length) return 0;

    const { data: orders } = await db
      .from('orders')
      .select('id, user_id, email, created_at')
      .is('deleted_at', null)
      .in('status', ONLINE_REVENUE_STATUSES)
      .or(
        [
          userIds.length ? `user_id.in.(${userIds.join(',')})` : null,
          emails.length ? `email.in.(${emails.map((e) => `"${e}"`).join(',')})` : null,
        ]
          .filter(Boolean)
          .join(','),
      );

    let recovered = 0;
    for (const r of rows) {
      const match = (orders ?? []).find(
        (o: any) =>
          o.created_at > r.reminder_sent_at &&
          ((r.user_id && o.user_id === r.user_id) ||
            (r.email && (o.email ?? '').toLowerCase() === (r.email ?? '').toLowerCase())),
      );
      if (!match) continue;
      await db
        .from('checkout_sessions')
        .update({ status: 'recovered', recovered_at: new Date().toISOString(), order_id: match.id })
        .eq('id', r.id);
      recovered += 1;
    }
    return recovered;
  }

  /**
   * Email a one-time recovery reminder for carts idle > REMINDER_AFTER_MS that
   * haven't been reminded yet. `reminder_sent_at` is set after each send so a
   * cart is only ever emailed once (assumes a single backend instance — revisit
   * with a DB-level claim if the API is ever scaled horizontally).
   */
  private async sendAbandonedCheckoutReminders(): Promise<number> {
    const db = this.supabase.getAdminClient();
    const now = Date.now();
    const idleCutoff = new Date(now - REMINDER_AFTER_MS).toISOString();
    const ageCutoff = new Date(now - MAX_REMINDER_AGE_MS).toISOString();
    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'https://storefront.1nri.store');

    const { data: rows, error } = await this.withRetry('sendAbandonedCheckoutReminders', () =>
      db
        .from('checkout_sessions')
        .select('id, recovery_token, email, customer_name, items, subtotal, status, updated_at')
        .eq('status', 'open')
        .is('reminder_sent_at', null)
        .not('email', 'is', null)
        .lt('updated_at', idleCutoff)
        .gt('created_at', ageCutoff)
        .order('updated_at', { ascending: true })
        .limit(100),
    );

    if (error) {
      const cause = (error as any)?.cause;
      this.logger.error(
        `sendAbandonedCheckoutReminders query failed: ${error.message}${cause ? ` (cause: ${cause.code ?? cause})` : ''}`,
      );
      return 0;
    }
    if (!rows?.length) return 0;

    let sent = 0;
    for (const r of rows) {
      const items: any[] = Array.isArray(r.items) ? r.items : [];
      if (items.length === 0) continue;

      // Re-check the row is still open right before sending — guards against a
      // checkout that completed between the batch read and now.
      const { data: fresh } = await db
        .from('checkout_sessions')
        .select('status, reminder_sent_at')
        .eq('id', r.id)
        .maybeSingle();
      if (!fresh || fresh.status !== 'open' || fresh.reminder_sent_at) continue;

      try {
        await this.email.sendAbandonedCheckoutReminder({
          email: r.email,
          customer_name: r.customer_name,
          recovery_url: `${frontendUrl}/checkout/recover?token=${r.recovery_token}`,
          subtotal: num(r.subtotal),
          session_id: r.id,
          items: items.map((i) => ({
            product_name: i.productName,
            variant_title: i.variantTitle ?? null,
            quantity: i.quantity,
            unit_price: num(i.unitPrice),
            image_url: i.imageUrl ?? null,
          })),
        });
        await db
          .from('checkout_sessions')
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq('id', r.id);
        sent += 1;
      } catch (err: any) {
        this.logger.error(`Abandoned-checkout reminder failed for ${r.id}: ${err.message}`);
      }
    }
    return sent;
  }

  /**
   * Resolve a recovery link token to its cart, re-validated against current
   * product availability and pricing (drops unavailable items, uses live price).
   * Public — reached from the email CTA, no auth.
   */
  async getCheckoutByRecoveryToken(token: string) {
    const db = this.supabase.getAdminClient();
    const { data: row } = await db
      .from('checkout_sessions')
      .select('id, items, status')
      .eq('recovery_token', token)
      .maybeSingle();
    if (!row) throw new NotFoundException('Recovery link not found');

    const items: any[] = Array.isArray(row.items) ? row.items : [];
    const variantIds = items.map((i) => i.variantId).filter(Boolean);
    if (variantIds.length === 0) return { status: row.status, items: [], dropped: 0 };

    const { data: variants } = await db
      .from('product_variants')
      .select('id, price, inventory_quantity, product_id, products!inner(title, status, deleted_at)')
      .in('id', variantIds);

    const variantMap = new Map<string, any>();
    for (const v of variants ?? []) variantMap.set(v.id, v);

    const validItems: any[] = [];
    for (const i of items) {
      const v = variantMap.get(i.variantId);
      const product = v?.products;
      const available =
        v && product && product.status === 'active' && !product.deleted_at && v.inventory_quantity > 0;
      if (!available) continue;
      validItems.push({
        variantId: i.variantId,
        productId: v.product_id,
        productTitle: product.title ?? i.productName,
        variantTitle: i.variantTitle ?? null,
        price: num(v.price),
        image: i.imageUrl ?? null,
        quantity: Math.min(i.quantity, v.inventory_quantity),
      });
    }

    return {
      status: row.status,
      items: validItems,
      dropped: items.length - validItems.length,
    };
  }

  // ─── Unified reports engine ────────────────────────────────────────────────

  listReportDefinitions() {
    return { reports: listReports() };
  }

  async runReport(reportId: string, query: ReportQueryDto): Promise<ReportPayload> {
    const def = REPORTS[reportId];
    if (!def) throw new NotFoundException(`Unknown report: ${reportId}`);

    const db = this.supabase.getAdminClient();
    const range = this.resolveDateRange(query.period, query.from, query.to);
    const granularity = (query.granularity as Granularity) ?? def.defaultGranularity ?? 'day';
    const ctx = new ReportContext(db, range, granularity);

    const built = await def.build(ctx);
    return {
      id: def.id,
      name: def.name,
      description: def.description,
      category: def.category,
      range: { from: ctx.from, to: ctx.to },
      previousRange: { from: ctx.prevFrom, to: ctx.prevTo },
      granularity,
      ...built,
    };
  }
}
