import { SupabaseClient } from '@supabase/supabase-js';
import {
  Granularity,
  ONLINE_REVENUE_STATUSES,
  POPUP_REVENUE_STATUSES,
  WALKIN_REVENUE_STATUSES,
} from '../analytics.constants';

export type Window = 'current' | 'previous';

export interface OnlineOrderRow {
  id: string;
  user_id: string | null;
  email: string | null;
  status: string;
  subtotal: string | number | null;
  discount: string | number | null;
  shipping_cost: string | number | null;
  tax: string | number | null;
  total: string | number | null;
  created_at: string;
  shipped_at: string | null;
  delivered_at: string | null;
  payment_provider: string | null;
}

export interface PopupOrderRow {
  id: string;
  customer_email: string | null;
  customer_phone: string | null;
  customer_name: string | null;
  status: string;
  subtotal: string | number | null;
  total: string | number | null;
  discount_amount: string | number | null;
  discount_type: string | null;
  payment_method: string | null;
  created_at: string;
}

export interface PromoRedemptionRow {
  id: string;
  promo_code_id: string | null;
  source: 'code' | 'pairing' | 'manual';
  channel: 'online' | 'popup' | 'walkin';
  code_snapshot: string | null;
  discount_type: string | null;
  rule_snapshot: Record<string, any> | null;
  subtotal: number | string;
  discount_amount: number | string;
  status: string;
  created_at: string;
}

export interface WalkinOrderRow {
  id: string;
  customer_email: string | null;
  customer_phone: string | null;
  customer_name: string | null;
  status: string;
  subtotal: string | number | null;
  total: string | number | null;
  discount_amount: string | number | null;
  discount_type: string | null;
  payment_method: string | null;
  brand: string | null;
  served_by: string | null;
  staff: { first_name: string | null; last_name: string | null }[] | null;
  created_at: string;
}

export interface ItemRow {
  product_id: string | null;
  product_name: string;
  sku: string | null;
  quantity: number;
  unit_price: string | number | null;
  total_price: string | number | null;
  vendor: string | null;
  order_id: string;
  created_at: string;
}

export interface EventRow {
  session_id: string;
  visitor_id: string | null;
  event_type: string;
  created_at: string;
  device_type: string | null;
  referrer: string | null;
  landing_page: string | null;
  path: string | null;
}

export interface CheckoutRow {
  id: string;
  session_id: string;
  status: string;
  subtotal: string | number | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface SessionAgg {
  sessionId: string;
  firstTs: string;
  types: Set<string>;
  device: string | null;
  referrer: string | null;
  landingPage: string | null;
  visitorId: string | null;
}

export const num = (v: string | number | null | undefined): number =>
  v == null ? 0 : typeof v === 'number' ? v : parseFloat(v) || 0;

/**
 * Supabase caps responses at 1000 rows; page through to get everything.
 *
 * Errors are thrown rather than swallowed. A silently-ignored PostgREST error
 * is indistinguishable from "no rows", which is how a brand-revenue query with
 * a wrong column name went unnoticed while quietly dropping a whole channel.
 */
export async function fetchAll<T>(
  build: (fromRow: number, toRow: number) => PromiseLike<{ data: T[] | null; error: any }>,
): Promise<T[]> {
  const PAGE = 1000;
  const all: T[] = [];
  for (let page = 0; page < 100; page++) {
    const { data, error } = await build(page * PAGE, page * PAGE + PAGE - 1);
    if (error) {
      throw new Error(`analytics query failed: ${error.message ?? String(error)}`);
    }
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
  }
  return all;
}

/**
 * Shared, lazily-cached data loaders for one report request. Every report
 * builder pulls from these so each underlying table is read at most once
 * per window regardless of how many metrics a report combines.
 */
export class ReportContext {
  readonly from: string;
  readonly to: string;
  readonly prevFrom: string;
  readonly prevTo: string;
  readonly granularity: Granularity;
  private cache = new Map<string, Promise<any>>();

  constructor(
    readonly db: SupabaseClient,
    range: { from: string; to: string },
    granularity: Granularity,
  ) {
    this.from = range.from;
    this.to = range.to;
    const span = new Date(range.to).getTime() - new Date(range.from).getTime();
    // The previous window ends 1ms before `from` so an order sitting exactly on
    // the boundary is counted once, not in both windows.
    this.prevFrom = new Date(new Date(range.from).getTime() - span).toISOString();
    this.prevTo = new Date(new Date(range.from).getTime() - 1).toISOString();
    this.granularity = granularity;
  }

  window(w: Window): { from: string; to: string } {
    return w === 'current'
      ? { from: this.from, to: this.to }
      : { from: this.prevFrom, to: this.prevTo };
  }

  private memo<T>(key: string, fn: () => Promise<T>): Promise<T> {
    if (!this.cache.has(key)) this.cache.set(key, fn());
    return this.cache.get(key) as Promise<T>;
  }

  /** Whitelisted (revenue-generating) online orders in the window. */
  onlineOrders(w: Window): Promise<OnlineOrderRow[]> {
    const { from, to } = this.window(w);
    return this.memo(`online:${w}`, () =>
      fetchAll<OnlineOrderRow>((a, b) =>
        this.db
          .from('orders')
          .select(
            'id, user_id, email, status, subtotal, discount, shipping_cost, tax, total, created_at, shipped_at, delivered_at, payment_provider',
          )
          .is('deleted_at', null)
          .in('status', ONLINE_REVENUE_STATUSES)
          .gte('created_at', from)
          .lte('created_at', to)
          .order('created_at', { ascending: true })
          .range(a, b),
      ),
    );
  }

  /** Refunded online orders in the window (for the returns line). */
  refundedOrders(w: Window): Promise<OnlineOrderRow[]> {
    const { from, to } = this.window(w);
    return this.memo(`refunded:${w}`, () =>
      fetchAll<OnlineOrderRow>((a, b) =>
        this.db
          .from('orders')
          .select(
            'id, user_id, email, status, subtotal, discount, shipping_cost, tax, total, created_at, shipped_at, delivered_at, payment_provider',
          )
          .is('deleted_at', null)
          .eq('status', 'refunded')
          .gte('created_at', from)
          .lte('created_at', to)
          .range(a, b),
      ),
    );
  }

  popupOrders(w: Window): Promise<PopupOrderRow[]> {
    const { from, to } = this.window(w);
    return this.memo(`popup:${w}`, () =>
      fetchAll<PopupOrderRow>((a, b) =>
        this.db
          .from('popup_orders')
          .select(
            'id, customer_email, customer_phone, customer_name, status, subtotal, total, discount_amount, discount_type, payment_method, created_at',
          )
          .in('status', POPUP_REVENUE_STATUSES)
          .gte('created_at', from)
          .lte('created_at', to)
          .order('created_at', { ascending: true })
          .range(a, b),
      ),
    );
  }

  /**
   * Popup orders that were refunded. `refundOrder()` both writes a popup_refunds
   * row and flips the order status, so these rows fall out of the revenue
   * whitelist — they have to be added back into gross sales or the refund is
   * subtracted twice.
   */
  popupRefundedOrders(w: Window): Promise<PopupOrderRow[]> {
    const { from, to } = this.window(w);
    return this.memo(`popupRefunded:${w}`, () =>
      fetchAll<PopupOrderRow>((a, b) =>
        this.db
          .from('popup_orders')
          .select(
            'id, customer_email, customer_phone, customer_name, status, subtotal, total, discount_amount, discount_type, payment_method, created_at',
          )
          .eq('status', 'refunded')
          .gte('created_at', from)
          .lte('created_at', to)
          .range(a, b),
      ),
    );
  }

  /**
   * Refund rows for popup orders placed in the window. `orderCreatedAt` is the
   * parent order's date so a bucket's returns line up with the gross sales they
   * reverse, rather than landing wherever the refund happened to be issued.
   */
  popupRefunds(
    w: Window,
  ): Promise<{ amount: string | number | null; created_at: string; orderCreatedAt: string }[]> {
    const { from, to } = this.window(w);
    return this.memo(`popupRefunds:${w}`, async () => {
      const rows = await fetchAll<any>((a, b) =>
        this.db
          .from('popup_refunds')
          .select('amount, created_at, order:popup_orders!inner(created_at)')
          .neq('status', 'failed')
          .gte('popup_orders.created_at', from)
          .lte('popup_orders.created_at', to)
          .range(a, b),
      );
      return rows.map((r) => {
        // PostgREST types a to-one embed as an array; it arrives as an object.
        const order = Array.isArray(r.order) ? r.order[0] : r.order;
        return {
          amount: r.amount,
          created_at: r.created_at,
          orderCreatedAt: order?.created_at ?? r.created_at,
        };
      });
    });
  }

  /** Whitelisted (revenue-generating) walk-in orders in the window. */
  /**
   * Confirmed promo redemptions in the window — the ledger behind every
   * discount on every channel, including automatic bundle rules and manual
   * staff discounts. Reverted rows are excluded: a refunded or cancelled
   * order's discount is not money the business gave away.
   */
  promoRedemptions(w: Window): Promise<PromoRedemptionRow[]> {
    const { from, to } = this.window(w);
    return this.memo(`promoRedemptions:${w}`, () =>
      fetchAll<PromoRedemptionRow>((a, b) =>
        this.db
          .from('promo_redemptions')
          .select(
            'id, promo_code_id, source, channel, code_snapshot, discount_type, rule_snapshot, subtotal, discount_amount, status, created_at',
          )
          .in('status', ['pending', 'confirmed'])
          .gte('created_at', from)
          .lte('created_at', to)
          .order('created_at', { ascending: true })
          .range(a, b),
      ),
    );
  }

  walkinOrders(w: Window): Promise<WalkinOrderRow[]> {
    const { from, to } = this.window(w);
    return this.memo(`walkin:${w}`, () =>
      fetchAll<WalkinOrderRow>((a, b) =>
        this.db
          .from('walkin_orders')
          .select(
            'id, customer_email, customer_phone, customer_name, status, subtotal, total, discount_amount, discount_type, payment_method, brand, served_by, created_at, staff:profiles!served_by(first_name, last_name)',
          )
          .in('status', WALKIN_REVENUE_STATUSES)
          .gte('created_at', from)
          .lte('created_at', to)
          .order('created_at', { ascending: true })
          .range(a, b),
      ),
    );
  }

  /**
   * Refunded walk-in orders in the window. There is no `walkin_refunds` table —
   * a refund flips `walkin_orders.status` to 'refunded' (walkin-sales.service),
   * so the refunded order total is the returned amount.
   */
  walkinRefunds(w: Window): Promise<WalkinOrderRow[]> {
    const { from, to } = this.window(w);
    return this.memo(`walkinRefunds:${w}`, () =>
      fetchAll<WalkinOrderRow>((a, b) =>
        this.db
          .from('walkin_orders')
          .select(
            'id, customer_email, customer_phone, customer_name, status, subtotal, total, discount_amount, discount_type, payment_method, brand, served_by, created_at, staff:profiles!served_by(first_name, last_name)',
          )
          .eq('status', 'refunded')
          .gte('created_at', from)
          .lte('created_at', to)
          .range(a, b),
      ),
    );
  }

  /** Order items (online + popup + walk-in combined) for whitelisted orders. */
  orderItems(w: Window): Promise<ItemRow[]> {
    const { from, to } = this.window(w);
    return this.memo(`items:${w}`, async () => {
      const [online, popup, walkin] = await Promise.all([
        fetchAll<any>((a, b) =>
          this.db
            .from('order_items')
            .select(
              'order_id, product_id, product_name, sku, quantity, unit_price, total_price, product:products(vendor), order:orders!inner(status, created_at, deleted_at)',
            )
            .gte('orders.created_at', from)
            .lte('orders.created_at', to)
            .in('orders.status', ONLINE_REVENUE_STATUSES)
            .is('orders.deleted_at', null)
            .range(a, b),
        ),
        fetchAll<any>((a, b) =>
          this.db
            .from('popup_order_items')
            .select(
              'order_id, product_id, product_name, sku, quantity, unit_price, total_price, product:products(vendor), order:popup_orders!inner(status, created_at)',
            )
            .gte('popup_orders.created_at', from)
            .lte('popup_orders.created_at', to)
            .in('popup_orders.status', POPUP_REVENUE_STATUSES)
            .range(a, b),
        ),
        fetchAll<any>((a, b) =>
          this.db
            .from('walkin_order_items')
            .select(
              'walkin_order_id, product_id, product_name, sku, quantity, unit_price, total_price, product:products(vendor), order:walkin_orders!inner(status, created_at)',
            )
            .gte('walkin_orders.created_at', from)
            .lte('walkin_orders.created_at', to)
            .in('walkin_orders.status', WALKIN_REVENUE_STATUSES)
            .range(a, b),
        ),
      ]);
      const mapRow = (item: any, channel: string): ItemRow => ({
        product_id: item.product_id ?? null,
        product_name: item.product_name,
        sku: item.sku ?? null,
        quantity: item.quantity ?? 0,
        unit_price: item.unit_price,
        total_price: item.total_price,
        vendor: item.product?.vendor ?? null,
        order_id: `${channel}_${item.order_id ?? item.walkin_order_id}`,
        created_at: item.order?.created_at ?? '',
      });
      return [
        ...online.map((i) => mapRow(i, 'online')),
        ...popup.map((i) => mapRow(i, 'popup')),
        ...walkin.map((i) => mapRow(i, 'walkin')),
      ];
    });
  }

  events(w: Window): Promise<EventRow[]> {
    const { from, to } = this.window(w);
    return this.memo(`events:${w}`, () =>
      fetchAll<EventRow>((a, b) =>
        this.db
          .from('analytics_events')
          .select('session_id, visitor_id, event_type, created_at, device_type, referrer, landing_page, path')
          .gte('created_at', from)
          .lte('created_at', to)
          .order('created_at', { ascending: true })
          .range(a, b),
      ),
    );
  }

  checkouts(w: Window): Promise<CheckoutRow[]> {
    const { from, to } = this.window(w);
    return this.memo(`checkouts:${w}`, () =>
      fetchAll<CheckoutRow>((a, b) =>
        this.db
          .from('checkout_sessions')
          .select('id, session_id, status, subtotal, created_at, updated_at, completed_at')
          .gte('created_at', from)
          .lte('created_at', to)
          .range(a, b),
      ),
    );
  }

  /**
   * Full-history first-order date per customer key (online user_id/email,
   * popup/walk-in email/phone). Powers new-vs-returning and cohort reports.
   */
  customerFirstOrder(): Promise<Map<string, string>> {
    return this.memo('firstOrders', async () => {
      const [online, popup, walkin] = await Promise.all([
        fetchAll<any>((a, b) =>
          this.db
            .from('orders')
            .select('user_id, email, created_at')
            .is('deleted_at', null)
            .in('status', ONLINE_REVENUE_STATUSES)
            .order('created_at', { ascending: true })
            .range(a, b),
        ),
        fetchAll<any>((a, b) =>
          this.db
            .from('popup_orders')
            .select('customer_email, customer_phone, created_at')
            .in('status', POPUP_REVENUE_STATUSES)
            .order('created_at', { ascending: true })
            .range(a, b),
        ),
        fetchAll<any>((a, b) =>
          this.db
            .from('walkin_orders')
            .select('customer_email, customer_phone, created_at')
            .in('status', WALKIN_REVENUE_STATUSES)
            .order('created_at', { ascending: true })
            .range(a, b),
        ),
      ]);
      const first = new Map<string, string>();
      const consider = (key: string | null, ts: string) => {
        if (!key) return;
        const existing = first.get(key);
        if (!existing || ts < existing) first.set(key, ts);
      };
      for (const o of online) consider(onlineCustomerKey(o), o.created_at);
      for (const o of popup) consider(popupCustomerKey(o), o.created_at);
      for (const o of walkin) consider(walkinCustomerKey(o), o.created_at);
      return first;
    });
  }
}

export function onlineCustomerKey(o: { user_id?: string | null; email?: string | null }): string | null {
  if (o.user_id) return `u:${o.user_id}`;
  const email = (o.email ?? '').trim().toLowerCase();
  return email ? `e:${email}` : null;
}

export function popupCustomerKey(o: { customer_email?: string | null; customer_phone?: string | null }): string | null {
  const email = (o.customer_email ?? '').trim().toLowerCase();
  if (email) return `e:${email}`;
  const phone = (o.customer_phone ?? '').trim();
  return phone ? `p:${phone}` : null;
}

/**
 * Walk-in orders carry the same customer columns as popup orders, so they share
 * the key space — one person buying at a pop-up and at HQ is one customer.
 */
export const walkinCustomerKey = popupCustomerKey;

/** Collapse raw events into one aggregate per session. */
export function aggregateSessions(events: EventRow[]): Map<string, SessionAgg> {
  const sessions = new Map<string, SessionAgg>();
  for (const e of events) {
    let s = sessions.get(e.session_id);
    if (!s) {
      s = {
        sessionId: e.session_id,
        firstTs: e.created_at,
        types: new Set(),
        device: null,
        referrer: null,
        landingPage: null,
        visitorId: null,
      };
      sessions.set(e.session_id, s);
    }
    if (e.created_at < s.firstTs) s.firstTs = e.created_at;
    s.types.add(e.event_type);
    if (!s.device && e.device_type) s.device = e.device_type;
    if (!s.referrer && e.referrer) s.referrer = e.referrer;
    if (!s.landingPage && e.landing_page) s.landingPage = e.landing_page;
    if (!s.visitorId && e.visitor_id) s.visitorId = e.visitor_id;
  }
  return sessions;
}

/** Normalize a referrer URL to its host (or a friendly label). */
export function referrerLabel(referrer: string | null): string {
  if (!referrer) return 'Direct / None';
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, '');
    return host || 'Direct / None';
  } catch {
    return referrer.slice(0, 64);
  }
}
