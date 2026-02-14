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
  }) {
    const db = this.supabase.getAdminClient();
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '20', 10);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Get profiles (customers only = role 'public')
    let q = db
      .from('profiles')
      .select('*', { count: 'exact' })
      .eq('role', 'public');

    if (query.search) {
      q = q.or(
        `email.ilike.%${query.search}%,first_name.ilike.%${query.search}%,last_name.ilike.%${query.search}%`,
      );
    }

    q = q.order('created_at', { ascending: false }).range(from, to);

    const { data: profiles, count, error } = await q;
    if (error) throw error;

    // For each profile, get order count and total spent
    const enriched = await Promise.all(
      (profiles || []).map(async (profile) => {
        const { data: orders } = await db
          .from('orders')
          .select('total, created_at')
          .eq('user_id', profile.id)
          .is('deleted_at', null)
          .not('status', 'in', '("cancelled","refunded")');

        const orderCount = orders?.length || 0;
        const totalSpent = (orders || []).reduce(
          (sum, o) => sum + Number(o.total),
          0,
        );
        const lastOrderDate =
          orders && orders.length > 0
            ? orders.sort(
                (a, b) =>
                  new Date(b.created_at).getTime() -
                  new Date(a.created_at).getTime(),
              )[0].created_at
            : null;

        return {
          ...profile,
          order_count: orderCount,
          total_spent: totalSpent,
          last_order_date: lastOrderDate,
        };
      }),
    );

    return {
      data: enriched,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
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

    // Get their orders
    const { data: orders } = await db
      .from('orders')
      .select('*, order_items(*)')
      .eq('user_id', customerId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    const totalSpent = (orders || [])
      .filter((o) => !['cancelled', 'refunded'].includes(o.status))
      .reduce((sum, o) => sum + Number(o.total), 0);

    return {
      ...profile,
      orders: orders || [],
      order_count: orders?.length || 0,
      total_spent: totalSpent,
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
      const day = o.created_at.slice(0, 10);
      ordersByDay[day] = (ordersByDay[day] || 0) + 1;
      if (!['cancelled', 'refunded'].includes(o.status)) {
        revenueByDay[day] = (revenueByDay[day] || 0) + Number(o.total);
      }
    });

    // Top products by revenue
    const { data: topItems } = await db
      .from('order_items')
      .select('product_name, quantity, total_price, order:orders!inner(status, created_at, deleted_at)')
      .gte('orders.created_at', fromDate)
      .lte('orders.created_at', toDate)
      .is('orders.deleted_at', null);

    const productMap: Record<
      string,
      { name: string; revenue: number; unitsSold: number }
    > = {};
    (topItems || []).forEach((item: any) => {
      if (['cancelled', 'refunded'].includes(item.order?.status)) return;
      const name = item.product_name;
      if (!productMap[name]) {
        productMap[name] = { name, revenue: 0, unitsSold: 0 };
      }
      productMap[name].revenue += Number(item.total_price);
      productMap[name].unitsSold += item.quantity;
    });

    const topProducts = Object.values(productMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Status breakdown
    const statusBreakdown: Record<string, number> = {};
    (orders || []).forEach((o) => {
      statusBreakdown[o.status] = (statusBreakdown[o.status] || 0) + 1;
    });

    return {
      revenueByDay,
      ordersByDay,
      topProducts,
      statusBreakdown,
      totalOrders: orders?.length || 0,
      totalRevenue: (orders || [])
        .filter((o) => !['cancelled', 'refunded'].includes(o.status))
        .reduce((sum, o) => sum + Number(o.total), 0),
    };
  }

  async confirmPayment(paymentReference: string) {
    const db = this.supabase.getAdminClient();
    const { data, error } = await db
      .from('orders')
      .select('id, payment_status')
      .eq('payment_reference', paymentReference)
      .single();

    if (error || !data) return; // Order not found — might not exist yet

    if (data.payment_status === 'paid') return; // Already confirmed

    await db
      .from('orders')
      .update({
        payment_status: 'paid',
        status: 'paid',
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.id);
  }
}
