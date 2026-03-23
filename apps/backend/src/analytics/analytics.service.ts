import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';
import { OverviewQueryDto, RevenueChartDto, ReportQueryDto } from './dto/query-analytics.dto';

@Injectable()
export class AnalyticsService {
  constructor(private supabase: SupabaseService) {}

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
}
