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
