import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@Injectable()
export class OrdersService {
  constructor(private supabase: SupabaseService) {}

  /**
   * Sanitize a phone number from the database to a consistent local format (0XXXXXXXXX).
   * Strips whitespace, escape characters, and non-digit/+ characters, then converts
   * +233/233 prefixes to the local 0 prefix.
   */
  private normalizePhone(raw: string | null | undefined): string | null {
    if (!raw) return null;
    // Remove whitespace, control characters, and anything that isn't a digit or +
    let phone = raw.replace(/[^\d+]/g, '');
    if (!phone) return null;
    if (phone.startsWith('+233')) phone = '0' + phone.slice(4);
    else if (phone.startsWith('233') && phone.length >= 12) phone = '0' + phone.slice(3);
    if (!phone.startsWith('0')) phone = '0' + phone;
    return phone;
  }

  private async generateOrderNumber(): Promise<string> {
    const db = this.supabase.getAdminClient();
    const { data } = await db
      .from('orders')
      .select('order_number')
      .order('created_at', { ascending: false })
      .limit(1);

    let next = 1;
    if (data && data.length > 0) {
      const match = data[0].order_number.match(/IRD-(\d+)/);
      if (match) next = parseInt(match[1], 10) + 1;
    }

    return `IRD-${String(next).padStart(6, '0')}`;
  }

  async create(dto: CreateOrderDto, userId: string, email: string) {
    const db = this.supabase.getAdminClient();

    // 1. Validate stock for all items
    for (const item of dto.items) {
      const { data: variant, error } = await db
        .from('product_variants')
        .select('id, inventory_quantity, sku')
        .eq('id', item.variantId)
        .single();

      if (error || !variant) {
        throw new BadRequestException(
          `Variant ${item.variantId} not found`,
        );
      }

      if (variant.inventory_quantity < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for "${item.productTitle}". Available: ${variant.inventory_quantity}`,
        );
      }
    }

    // 2. Calculate totals
    const subtotal = dto.items.reduce(
      (sum, i) => sum + i.price * i.quantity,
      0,
    );
    const total = subtotal; // No shipping/tax for now

    // 3. Generate order number
    const orderNumber = await this.generateOrderNumber();

    // 4. Insert order
    const { data: order, error: orderError } = await db
      .from('orders')
      .insert({
        user_id: userId,
        email,
        order_number: orderNumber,
        status: 'paid',
        subtotal,
        total,
        currency: 'GHS',
        shipping_address: dto.shippingAddress,
        payment_provider: 'paystack',
        payment_reference: dto.paymentReference,
        payment_status: 'paid',
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // 5. Insert order items
    const orderItems = dto.items.map((item) => ({
      order_id: order.id,
      product_id: item.productId,
      variant_id: item.variantId,
      product_name: item.productTitle,
      variant_title: item.variantTitle || null,
      quantity: item.quantity,
      unit_price: item.price,
      total_price: item.price * item.quantity,
    }));

    const { error: itemsError } = await db
      .from('order_items')
      .insert(orderItems);

    if (itemsError) throw itemsError;

    // 6. Deduct inventory
    for (const item of dto.items) {
      const { data: variant } = await db
        .from('product_variants')
        .select('inventory_quantity')
        .eq('id', item.variantId)
        .single();

      const previousQty = variant?.inventory_quantity ?? 0;
      const newQty = Math.max(0, previousQty - item.quantity);

      await db
        .from('product_variants')
        .update({ inventory_quantity: newQty })
        .eq('id', item.variantId);

      await db.from('inventory_movements').insert({
        variant_id: item.variantId,
        quantity_change: -item.quantity,
        quantity_before: previousQty,
        quantity_after: newQty,
        movement_type: 'sale',
        notes: `Order ${orderNumber}`,
        created_by: userId,
      });
    }

    return this.findOne(order.id);
  }

  async findOne(id: string) {
    const db = this.supabase.getAdminClient();
    const { data, error } = await db
      .from('orders')
      .select('*, order_items(*), order_status_history(*)')
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException('Order not found');
    return data;
  }

  async findMyOrders(userId: string, query: QueryOrdersDto) {
    const db = this.supabase.getAdminClient();
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '20', 10);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let q = db
      .from('orders')
      .select('*, order_items(*)', { count: 'exact' })
      .eq('user_id', userId)
      .is('deleted_at', null);

    if (query.status) {
      q = q.eq('status', query.status);
    }

    q = q.order('created_at', { ascending: false }).range(from, to);

    const { data, count, error } = await q;
    if (error) throw error;

    return {
      data: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  }

  async findMyOrder(userId: string, orderId: string) {
    const db = this.supabase.getAdminClient();
    const { data, error } = await db
      .from('orders')
      .select('*, order_items(*), order_status_history(*)')
      .eq('id', orderId)
      .eq('user_id', userId)
      .single();

    if (error || !data) throw new NotFoundException('Order not found');
    return data;
  }

  async findAdmin(query: QueryOrdersDto) {
    const db = this.supabase.getAdminClient();
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '20', 10);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let q = db
      .from('orders')
      .select('*, order_items(*)', { count: 'exact' })
      .is('deleted_at', null);

    if (query.status) {
      q = q.eq('status', query.status);
    }
    if (query.search) {
      q = q.or(
        `order_number.ilike.%${query.search}%,email.ilike.%${query.search}%`,
      );
    }
    if (query.from_date) {
      q = q.gte('created_at', query.from_date);
    }
    if (query.to_date) {
      q = q.lte('created_at', query.to_date);
    }

    q = q.order('created_at', { ascending: false }).range(from, to);

    const { data, count, error } = await q;
    if (error) throw error;

    return {
      data: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  }

  async findAdminOrder(orderId: string) {
    return this.findOne(orderId);
  }

  async updateStatus(
    orderId: string,
    dto: UpdateOrderStatusDto,
    userId: string,
  ) {
    const db = this.supabase.getAdminClient();
    const order = await this.findOne(orderId);

    const updates: Record<string, unknown> = {
      status: dto.status,
      updated_at: new Date().toISOString(),
    };

    if (dto.trackingNumber) updates.tracking_number = dto.trackingNumber;
    if (dto.carrier) updates.carrier = dto.carrier;
    if (dto.status === 'shipped') updates.shipped_at = new Date().toISOString();
    if (dto.status === 'delivered')
      updates.delivered_at = new Date().toISOString();

    const { error } = await db
      .from('orders')
      .update(updates)
      .eq('id', orderId);

    if (error) throw error;

    // DB trigger should auto-log to order_status_history,
    // but insert manually if trigger doesn't capture notes/changed_by
    await db.from('order_status_history').insert({
      order_id: orderId,
      from_status: order.status,
      to_status: dto.status,
      notes: dto.notes || null,
      changed_by: userId,
    });

    return this.findOne(orderId);
  }

  async cancelOrder(orderId: string, userId: string) {
    const db = this.supabase.getAdminClient();
    const order = await this.findOne(orderId);

    // Only the owner can cancel
    if (order.user_id !== userId) {
      throw new ForbiddenException('Not your order');
    }

    if (!['pending', 'paid'].includes(order.status)) {
      throw new BadRequestException(
        'Order can only be cancelled when pending or paid',
      );
    }

    // Update status
    const { error } = await db
      .from('orders')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (error) throw error;

    // Restore inventory
    if (order.order_items && order.order_items.length > 0) {
      for (const item of order.order_items) {
        const { data: variant } = await db
          .from('product_variants')
          .select('inventory_quantity')
          .eq('id', item.variant_id)
          .single();

        const previousQty = variant?.inventory_quantity ?? 0;
        const newQty = previousQty + item.quantity;

        await db
          .from('product_variants')
          .update({ inventory_quantity: newQty })
          .eq('id', item.variant_id);

        await db.from('inventory_movements').insert({
          variant_id: item.variant_id,
          quantity_change: item.quantity,
          quantity_before: previousQty,
          quantity_after: newQty,
          movement_type: 'cancellation_reversal',
          notes: `Cancelled order ${order.order_number}`,
          created_by: userId,
        });
      }
    }

    return this.findOne(orderId);
  }

  async getAdminStats() {
    const db = this.supabase.getAdminClient();

    // Total revenue (non-cancelled/refunded orders)
    const { data: revenueData } = await db
      .from('orders')
      .select('total')
      .is('deleted_at', null)
      .not('status', 'in', '("cancelled","refunded")');

    const totalRevenue = (revenueData || []).reduce(
      (sum, o) => sum + Number(o.total),
      0,
    );

    // Order count
    const { count: orderCount } = await db
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null);

    // Customer count (distinct user_ids who have orders)
    const { data: customerData } = await db
      .from('orders')
      .select('user_id')
      .is('deleted_at', null);

    const uniqueCustomers = new Set(
      (customerData || []).map((o) => o.user_id),
    ).size;

    // Low stock items
    const { data: lowStockData } = await db
      .from('product_variants')
      .select('id')
      .gt('inventory_quantity', 0)
      .lt('inventory_quantity', 10);

    const lowStockCount = lowStockData?.length || 0;

    // Orders by status
    const { data: statusData } = await db
      .from('orders')
      .select('status')
      .is('deleted_at', null);

    const ordersByStatus: Record<string, number> = {};
    (statusData || []).forEach((o) => {
      ordersByStatus[o.status] = (ordersByStatus[o.status] || 0) + 1;
    });

    // Recent revenue (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentData } = await db
      .from('orders')
      .select('total, created_at')
      .is('deleted_at', null)
      .not('status', 'in', '("cancelled","refunded")')
      .gte('created_at', thirtyDaysAgo.toISOString());

    const recentRevenue = (recentData || []).reduce(
      (sum, o) => sum + Number(o.total),
      0,
    );

    return {
      totalRevenue,
      recentRevenue,
      orderCount: orderCount || 0,
      customerCount: uniqueCustomers,
      lowStockCount,
      ordersByStatus,
    };
  }

  async findAdminCustomers(query: {
    search?: string;
    page?: string;
    limit?: string;
    min_orders?: string;
    max_orders?: string;
  }) {
    const db = this.supabase.getAdminClient();
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '20', 10);
    const hasOrderFilter = query.min_orders !== undefined || query.max_orders !== undefined;

    // ── 1. Fetch profiles ────────────────────────────────────────────────────
    // When an order-count filter is active we must fetch ALL matching profiles
    // first (no DB-level pagination), because the DB doesn't know order counts.
    // We then enrich all of them, filter, and paginate in memory.
    // When there is no filter the DB handles pagination directly (fast path).

    const buildBaseQuery = () => {
      let q = db
        .from('profiles')
        .select('*', { count: 'exact' })
        .or('role.eq.public,role.is.null');

      if (query.search) {
        q = q.or(
          `email.ilike.%${query.search}%,phone_number.ilike.%${query.search}%,first_name.ilike.%${query.search}%,last_name.ilike.%${query.search}%`,
        );
      }

      return q.order('created_at', { ascending: false });
    };

    let profiles: any[];
    let dbCount: number;

    if (hasOrderFilter) {
      // No .range() — fetch the full matching set so we can filter accurately
      const { data, count, error } = await buildBaseQuery();
      if (error) throw error;
      profiles = data || [];
      dbCount = count || 0;
    } else {
      // DB-paginated fast path
      const from = (page - 1) * limit;
      const { data, count, error } = await buildBaseQuery().range(from, from + limit - 1);
      if (error) throw error;
      profiles = data || [];
      dbCount = count || 0;
    }

    if (profiles.length === 0) {
      return { data: [], total: 0, page, limit, totalPages: 0 };
    }

    // ── 2. Batch fetch order data for all profiles in one round-trip each ────

    const userIds = profiles.map((p) => p.id).filter(Boolean) as string[];
    const emails = profiles
      .map((p) => p.email?.toLowerCase())
      .filter((e): e is string => !!e);
    const phones = profiles
      .map((p) => this.normalizePhone(p.phone_number))
      .filter((p): p is string => p !== null);

    const [{ data: allOnlineOrders }, { data: popupByEmailData }, { data: popupByPhoneData }] =
      await Promise.all([
        userIds.length > 0
          ? db
              .from('orders')
              .select('user_id, total, created_at')
              .in('user_id', userIds)
              .is('deleted_at', null)
              .not('status', 'in', '("cancelled","refunded")')
          : Promise.resolve({ data: [] }),
        emails.length > 0
          ? db
              .from('popup_orders')
              .select('id, customer_email, customer_phone, total, created_at')
              .in('customer_email', emails)
              .neq('status', 'cancelled')
          : Promise.resolve({ data: [] }),
        phones.length > 0
          ? db
              .from('popup_orders')
              .select('id, customer_email, customer_phone, total, created_at')
              .in('customer_phone', phones)
              .neq('status', 'cancelled')
          : Promise.resolve({ data: [] }),
      ]);

    // Deduplicate popup orders (email + phone queries may return the same row)
    const popupById = new Map<string, { customer_email: string | null; customer_phone: string | null; total: string; created_at: string }>();
    for (const po of [...(popupByEmailData || []), ...(popupByPhoneData || [])]) {
      if (!popupById.has(po.id)) popupById.set(po.id, po);
    }
    const allPopupOrders = Array.from(popupById.values());

    // ── 3. Build per-profile aggregation maps ────────────────────────────────

    const onlineByUser = new Map<string, { total: number; count: number; lastDate: string }>();
    for (const o of allOnlineOrders || []) {
      const entry = onlineByUser.get(o.user_id) ?? { total: 0, count: 0, lastDate: '' };
      entry.total += Number(o.total);
      entry.count += 1;
      if (o.created_at > entry.lastDate) entry.lastDate = o.created_at;
      onlineByUser.set(o.user_id, entry);
    }

    const popupByEmailMap = new Map<string, { total: number; count: number; lastDate: string }>();
    const popupByPhoneMap = new Map<string, { total: number; count: number; lastDate: string }>();
    for (const po of allPopupOrders) {
      const email = po.customer_email?.toLowerCase();
      const phone = po.customer_phone;
      // Attribute to email first; only fall back to phone when no email present
      const key = email || phone;
      if (!key) continue;
      const map = email ? popupByEmailMap : popupByPhoneMap;
      const entry = map.get(key) ?? { total: 0, count: 0, lastDate: '' };
      entry.total += Number(po.total);
      entry.count += 1;
      if (po.created_at > entry.lastDate) entry.lastDate = po.created_at;
      map.set(key, entry);
    }

    // ── 4. Enrich each profile ───────────────────────────────────────────────

    const zero = { total: 0, count: 0, lastDate: '' };
    const enriched = profiles.map((profile) => {
      const normalizedPhone = this.normalizePhone(profile.phone_number);
      const email = profile.email?.toLowerCase();

      const online = onlineByUser.get(profile.id) ?? zero;
      const popupE = email ? (popupByEmailMap.get(email) ?? zero) : zero;
      // Use phone-based popup only when the profile has no email (avoid double-counting)
      const popupP = !email && normalizedPhone ? (popupByPhoneMap.get(normalizedPhone) ?? zero) : zero;

      const irisOrderCount = online.count + popupE.count + popupP.count;
      const irisSpent = online.total + popupE.total + popupP.total;
      const shopifyOrders = profile.shopify_total_orders ?? 0;
      const shopifySpent = parseFloat(profile.shopify_total_spent ?? 0);

      const dates = [online.lastDate, popupE.lastDate, popupP.lastDate].filter(Boolean);
      const lastOrderDate = dates.length > 0 ? dates.sort().reverse()[0] : null;

      return {
        ...profile,
        phone_number: normalizedPhone,
        order_count: irisOrderCount + shopifyOrders,
        iris_order_count: irisOrderCount,
        shopify_order_count: shopifyOrders,
        total_spent: irisSpent + shopifySpent,
        iris_total_spent: irisSpent,
        shopify_total_spent_amt: shopifySpent,
        last_order_date: lastOrderDate || null,
      };
    });

    // ── 5. Apply order-count filter and paginate ─────────────────────────────

    if (hasOrderFilter) {
      const min = query.min_orders !== undefined ? parseInt(query.min_orders, 10) : null;
      const max = query.max_orders !== undefined ? parseInt(query.max_orders, 10) : null;

      const filtered = enriched.filter((c) => {
        if (min !== null && c.order_count < min) return false;
        if (max !== null && c.order_count > max) return false;
        return true;
      });

      const total = filtered.length;
      const start = (page - 1) * limit;
      const pageData = filtered.slice(start, start + limit);

      return { data: pageData, total, page, limit, totalPages: Math.ceil(total / limit) };
    }

    return { data: enriched, total: dbCount, page, limit, totalPages: Math.ceil(dbCount / limit) };
  }

  async findAdminCustomer(customerId: string) {
    const db = this.supabase.getAdminClient();

    const { data: profile, error } = await db
      .from('profiles')
      .select('*')
      .eq('id', customerId)
      .single();

    if (error || !profile) {
      throw new NotFoundException('Customer not found');
    }

    const normalizedPhone = this.normalizePhone(profile.phone_number);

    // Iris online orders (with items for the timeline)
    const { data: orders } = await db
      .from('orders')
      .select('*, order_items(*)')
      .eq('user_id', customerId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    const irisOnlineSpent = (orders || [])
      .filter((o) => !['cancelled', 'refunded'].includes(o.status))
      .reduce((sum, o) => sum + Number(o.total), 0);

    // Popup orders matched by email or phone
    const popupConditions: string[] = [];
    if (profile.email) popupConditions.push(`customer_email.eq.${profile.email}`);
    if (normalizedPhone) popupConditions.push(`customer_phone.eq.${normalizedPhone}`);

    let popupOrders: any[] = [];
    if (popupConditions.length > 0) {
      const { data } = await db
        .from('popup_orders')
        .select('id, order_number, total, status, payment_method, created_at, popup_events(name)')
        .or(popupConditions.join(','))
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false });
      popupOrders = data || [];
    }

    // Deduplicate popup orders by ID (email+phone match could return same order twice)
    const seen = new Set<string>();
    const uniquePopupOrders = popupOrders.filter((po) => {
      if (seen.has(po.id)) return false;
      seen.add(po.id);
      return true;
    });

    const popupSpent = uniquePopupOrders.reduce((sum, o) => sum + Number(o.total), 0);

    // Historical Shopify data
    const shopifyOrders = profile.shopify_total_orders ?? 0;
    const shopifySpent = parseFloat(profile.shopify_total_spent ?? 0);

    // Billing address: prefer most recent order's billing_address, then shipping_address, then default_address
    const recentOrderWithAddress = (orders || []).find(
      (o) => o.billing_address || o.shipping_address,
    );
    const billingAddress =
      recentOrderWithAddress?.billing_address ||
      recentOrderWithAddress?.shipping_address ||
      profile.default_address ||
      null;

    return {
      ...profile,
      phone_number: normalizedPhone,
      // Iris orders (full objects for timeline)
      orders: orders || [],
      popup_orders: uniquePopupOrders,
      // Aggregated spend including Shopify history
      iris_order_count: (orders?.length || 0) + uniquePopupOrders.length,
      shopify_order_count: shopifyOrders,
      order_count: (orders?.length || 0) + uniquePopupOrders.length + shopifyOrders,
      iris_total_spent: irisOnlineSpent + popupSpent,
      shopify_total_spent_amt: shopifySpent,
      total_spent: irisOnlineSpent + popupSpent + shopifySpent,
      // Metadata
      billing_address: billingAddress,
      default_address: profile.default_address,
      tags: profile.tags ?? [],
      shopify_customer_id: profile.shopify_customer_id,
      migrated_from: profile.migrated_from,
    };
  }

  async getCustomerStats() {
    const db = this.supabase.getAdminClient();

    // Total customers (role = 'public' or unset — excludes admin/staff/manager)
    const { count: totalCustomers } = await db
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .or('role.eq.public,role.is.null');

    // New this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count: newThisMonth } = await db
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .or('role.eq.public,role.is.null')
      .gte('created_at', startOfMonth.toISOString());

    // Avg order value
    const { data: orderTotals } = await db
      .from('orders')
      .select('total')
      .is('deleted_at', null)
      .not('status', 'in', '("cancelled","refunded")');

    const totals = orderTotals || [];
    const avgOrderValue =
      totals.length > 0
        ? totals.reduce((sum, o) => sum + Number(o.total), 0) / totals.length
        : 0;

    // Top spender
    const { data: allOrders } = await db
      .from('orders')
      .select('user_id, total, email')
      .is('deleted_at', null)
      .not('status', 'in', '("cancelled","refunded")');

    const spendByUser: Record<string, { email: string; amount: number }> = {};
    (allOrders || []).forEach((o) => {
      if (!spendByUser[o.user_id]) {
        spendByUser[o.user_id] = { email: o.email, amount: 0 };
      }
      spendByUser[o.user_id].amount += Number(o.total);
    });

    // Also add popup order spend, matched back to profiles by email
    const { data: allPopupOrders } = await db
      .from('popup_orders')
      .select('customer_email, total')
      .neq('status', 'cancelled')
      .not('customer_email', 'is', null);

    const popupSpendByEmail: Record<string, number> = {};
    (allPopupOrders || []).forEach((po) => {
      if (po.customer_email) {
        popupSpendByEmail[po.customer_email] =
          (popupSpendByEmail[po.customer_email] || 0) + Number(po.total);
      }
    });

    for (const data of Object.values(spendByUser)) {
      const extra = popupSpendByEmail[data.email] || 0;
      if (extra > 0) data.amount += extra;
    }

    let topSpender: { name: string; amount: number } | null = null;
    const entries = Object.entries(spendByUser);
    if (entries.length > 0) {
      const [userId, best] = entries.sort(
        (a, b) => b[1].amount - a[1].amount,
      )[0];

      // Try to get their name from profiles
      const { data: profile } = await db
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', userId)
        .single();

      const name = profile
        ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') ||
          best.email
        : best.email;

      topSpender = { name, amount: best.amount };
    }

    return {
      totalCustomers: totalCustomers || 0,
      newThisMonth: newThisMonth || 0,
      avgOrderValue,
      topSpender,
    };
  }

  async getAnalytics(query: { from_date?: string; to_date?: string }) {
    const db = this.supabase.getAdminClient();

    const fromDate =
      query.from_date ||
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const toDate = query.to_date || new Date().toISOString();

    // Revenue by day
    const { data: orders } = await db
      .from('orders')
      .select('total, status, created_at')
      .is('deleted_at', null)
      .gte('created_at', fromDate)
      .lte('created_at', toDate)
      .order('created_at', { ascending: true });

    const revenueByDay: Record<string, number> = {};
    const ordersByDay: Record<string, number> = {};

    (orders || []).forEach((o) => {
      if (!['cancelled', 'refunded'].includes(o.status)) {
        const day = o.created_at.slice(0, 10);
        ordersByDay[day] = (ordersByDay[day] || 0) + 1;
        revenueByDay[day] = (revenueByDay[day] || 0) + Number(o.total);
      }
    });

    // ── Popup orders: add to combined revenueByDay / ordersByDay ──────────────
    const { data: popupOrdersData } = await db
      .from('popup_orders')
      .select('total, status, created_at')
      .gte('created_at', fromDate)
      .lte('created_at', toDate)
      .not('status', 'in', '("cancelled","refunded")');

    let popupRevenue = 0;
    let popupOrderCount = 0;
    (popupOrdersData || []).forEach((po) => {
      const day = po.created_at.slice(0, 10);
      revenueByDay[day] = (revenueByDay[day] || 0) + Number(po.total);
      ordersByDay[day] = (ordersByDay[day] || 0) + 1;
      popupRevenue += Number(po.total);
      popupOrderCount += 1;
    });

    // Previous period comparison
    const fromMs = new Date(fromDate).getTime();
    const toMs = new Date(toDate).getTime();
    const periodLength = toMs - fromMs;
    const prevFrom = new Date(fromMs - periodLength).toISOString();
    const prevTo = fromDate;

    const { data: prevOrders } = await db
      .from('orders')
      .select('total, status')
      .is('deleted_at', null)
      .gte('created_at', prevFrom)
      .lte('created_at', prevTo);

    const validPrev = (prevOrders || []).filter(
      (o) => !['cancelled', 'refunded'].includes(o.status),
    );
    const previousPeriodRevenue = validPrev.reduce(
      (sum, o) => sum + Number(o.total),
      0,
    );
    const previousPeriodOrders = prevOrders?.length || 0;

    // Funnel counts from current orders
    const validOrders = (orders || []).filter(
      (o) => !['cancelled', 'refunded'].includes(o.status),
    );
    const funnelStages = ['paid', 'processing', 'shipped', 'delivered'];
    const stagePriority: Record<string, number> = {
      paid: 0,
      processing: 1,
      shipped: 2,
      delivered: 3,
    };
    const funnelCounts: Record<string, number> = {};
    funnelStages.forEach((stage) => {
      funnelCounts[stage] = validOrders.filter(
        (o) => (stagePriority[o.status] ?? -1) >= stagePriority[stage],
      ).length;
    });

    // Top products by revenue
    const { data: topItems } = await db
      .from('order_items')
      .select('order_id, product_id, product_name, quantity, total_price, order:orders!inner(status, created_at, deleted_at), product:products(vendor)')
      .gte('orders.created_at', fromDate)
      .lte('orders.created_at', toDate)
      .is('orders.deleted_at', null);

    const productMap: Record<
      string,
      { name: string; revenue: number; unitsSold: number; productId: string | null; vendor: string | null }
    > = {};
    (topItems || []).forEach((item: any) => {
      if (['cancelled', 'refunded'].includes(item.order?.status)) return;
      const name = item.product_name;
      if (!productMap[name]) {
        productMap[name] = { name, revenue: 0, unitsSold: 0, productId: item.product_id || null, vendor: item.product?.vendor || null };
      }
      productMap[name].revenue += Number(item.total_price);
      productMap[name].unitsSold += item.quantity;
    });

    // ── Brand revenue breakdown ────────────────────────────────────────────────
    // Computed from storefront order items (vendor via products table)
    const brandRevenue: Record<string, number> = {};
    const brandRevenueByDay: Record<string, Record<string, number>> = {};
    const brandOrders: Record<string, Set<string>> = {};

    const applyVendorMetrics = (
      vendor: string,
      amount: number,
      day: string | undefined,
      orderId: string,
    ) => {
      brandRevenue[vendor] = (brandRevenue[vendor] || 0) + amount;
      if (day) {
        if (!brandRevenueByDay[vendor]) brandRevenueByDay[vendor] = {};
        brandRevenueByDay[vendor][day] =
          (brandRevenueByDay[vendor][day] || 0) + amount;
      }
      if (!brandOrders[vendor]) brandOrders[vendor] = new Set();
      brandOrders[vendor].add(orderId);
    };

    (topItems || []).forEach((item: any) => {
      if (['cancelled', 'refunded'].includes(item.order?.status)) return;
      applyVendorMetrics(
        item.product?.vendor || '1NRI',
        Number(item.total_price),
        item.order?.created_at?.slice(0, 10),
        `online_${item.order_id}`
      );
    });

    // Also attribute popup order items to vendors
    const { data: popupItemsBrand } = await db
      .from('popup_order_items')
      .select('popup_order_id, total_price, product:products(vendor), order:popup_orders!inner(created_at, status)')
      .gte('popup_orders.created_at', fromDate)
      .lte('popup_orders.created_at', toDate);

    (popupItemsBrand || []).forEach((item: any) => {
      if (['cancelled', 'refunded'].includes(item.order?.status)) return;
      applyVendorMetrics(
        item.product?.vendor || '1NRI',
        Number(item.total_price),
        item.order?.created_at?.slice(0, 10),
        `popup_${item.popup_order_id}`
      );
    });

    const topProducts = Object.values(productMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 50);

    // Batch-fetch product images for top products
    const productIds = topProducts
      .map((p) => p.productId)
      .filter((id): id is string => id !== null);

    let imageMap: Record<string, string> = {};
    if (productIds.length > 0) {
      // product_images uses `src` as the image URL column, ordered by `position`
      const { data: images } = await db
        .from('product_images')
        .select('product_id, src')
        .in('product_id', productIds)
        .eq('position', 1);

      (images || []).forEach((img: any) => {
        if (!imageMap[img.product_id]) {
          imageMap[img.product_id] = img.src;
        }
      });
    }

    const topProductsWithImages = topProducts.map((p) => ({
      ...p,
      imageUrl: p.productId ? imageMap[p.productId] || null : null,
    }));

    // Status breakdown
    const statusBreakdown: Record<string, number> = {};
    (orders || []).forEach((o) => {
      statusBreakdown[o.status] = (statusBreakdown[o.status] || 0) + 1;
    });

    const brandOrderCount: Record<string, number> = {};
    for (const [vendor, orderSet] of Object.entries(brandOrders)) {
      brandOrderCount[vendor] = orderSet.size;
    }

    return {
      revenueByDay,
      ordersByDay,
      topProducts: topProductsWithImages,
      statusBreakdown,
      totalOrders: (orders?.length || 0) + popupOrderCount,
      totalRevenue:
        validOrders.reduce((sum, o) => sum + Number(o.total), 0) + popupRevenue,
      previousPeriodRevenue,
      previousPeriodOrders,
      funnelCounts,
      brandRevenue,
      brandRevenueByDay,
      brandOrderCount,
      popupRevenue,
    };
  }

  // --- Revenue Targets ---

  async getRevenueTarget(year: number) {
    const db = this.supabase.getAdminClient();
    const { data } = await db
      .from('revenue_targets')
      .select('target')
      .eq('year', year);
    
    const target = data && data.length > 0 ? Number(data[0].target) : null;
    return { target };
  }

  async setRevenueTarget(year: number, target: number) {
    const db = this.supabase.getAdminClient();
    const { data, error } = await db
      .from('revenue_targets')
      .upsert({ year, target, updated_at: new Date().toISOString() })
      .select('target')
      .single();
    
    if (error) {
      console.error('Failed to set revenue target:', error);
      throw new Error(`DB Error: ${error.message}`);
    }
    return { target: Number(data.target) };
  }

  /**
   * Create an order in `pending` state BEFORE payment is initiated.
   * Validates stock and inserts order + items, but does not deduct inventory yet.
   * Idempotent: returns the existing order if one already exists for the same
   * payment_reference (so retries / double-clicks are safe).
   */
  async createPending(dto: CreateOrderDto, userId: string, email: string) {
    const db = this.supabase.getAdminClient();

    // Idempotency: if an order with this reference already exists, return it.
    const { data: existing } = await db
      .from('orders')
      .select('*, order_items(*)')
      .eq('payment_reference', dto.paymentReference)
      .maybeSingle();
    if (existing) return existing;

    // 1. Validate stock for all items
    for (const item of dto.items) {
      const { data: variant, error } = await db
        .from('product_variants')
        .select('id, inventory_quantity, sku')
        .eq('id', item.variantId)
        .single();

      if (error || !variant) {
        throw new BadRequestException(`Variant ${item.variantId} not found`);
      }

      if (variant.inventory_quantity < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for "${item.productTitle}". Available: ${variant.inventory_quantity}`,
        );
      }
    }

    // 2. Calculate totals
    const subtotal = dto.items.reduce(
      (sum, i) => sum + i.price * i.quantity,
      0,
    );
    const total = subtotal;

    // 3. Generate order number
    const orderNumber = await this.generateOrderNumber();

    // 4. Insert order as pending
    const { data: order, error: orderError } = await db
      .from('orders')
      .insert({
        user_id: userId,
        email,
        order_number: orderNumber,
        status: 'pending',
        subtotal,
        total,
        currency: 'GHS',
        shipping_address: dto.shippingAddress,
        payment_provider: 'paystack',
        payment_reference: dto.paymentReference,
        payment_status: 'pending',
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // 5. Insert order items
    const orderItems = dto.items.map((item) => ({
      order_id: order.id,
      product_id: item.productId,
      variant_id: item.variantId,
      product_name: item.productTitle,
      variant_title: item.variantTitle || null,
      quantity: item.quantity,
      unit_price: item.price,
      total_price: item.price * item.quantity,
    }));

    const { error: itemsError } = await db
      .from('order_items')
      .insert(orderItems);

    if (itemsError) throw itemsError;

    return this.findOne(order.id);
  }

  /**
   * Mark an order as paid by its payment_reference.
   * Idempotent: safe to call multiple times (frontend success callback +
   * Paystack webhook). Deducts inventory exactly once on the first transition
   * to paid.
   */
  async confirmPayment(paymentReference: string) {
    const db = this.supabase.getAdminClient();
    const { data: order, error } = await db
      .from('orders')
      .select('id, payment_status, order_number, user_id, order_items(*)')
      .eq('payment_reference', paymentReference)
      .maybeSingle();

    if (error || !order) return null; // Order not found — might not exist yet
    if (order.payment_status === 'paid') {
      return this.findOne(order.id); // Already confirmed
    }

    // Flip to paid
    const { error: updateError } = await db
      .from('orders')
      .update({
        payment_status: 'paid',
        status: 'paid',
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    if (updateError) throw updateError;

    // Deduct inventory now that payment is confirmed
    for (const item of order.order_items || []) {
      if (!item.variant_id) continue;

      const { data: variant } = await db
        .from('product_variants')
        .select('inventory_quantity')
        .eq('id', item.variant_id)
        .single();

      const previousQty = variant?.inventory_quantity ?? 0;
      const newQty = Math.max(0, previousQty - item.quantity);

      await db
        .from('product_variants')
        .update({ inventory_quantity: newQty })
        .eq('id', item.variant_id);

      await db.from('inventory_movements').insert({
        variant_id: item.variant_id,
        quantity_change: -item.quantity,
        quantity_before: previousQty,
        quantity_after: newQty,
        movement_type: 'sale',
        notes: `Order ${order.order_number}`,
        created_by: order.user_id,
      });
    }

    return this.findOne(order.id);
  }
}
