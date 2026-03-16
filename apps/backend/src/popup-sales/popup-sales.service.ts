import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../common/supabase/supabase.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { CreatePopupOrderDto } from './dto/create-popup-order.dto';
import { UpdatePopupOrderDto } from './dto/update-popup-order.dto';
import { QueryPopupOrdersDto } from './dto/query-popup-orders.dto';
import { ChargePopupOrderDto } from './dto/charge-popup-order.dto';
import { CreatePopupCustomerDto } from './dto/create-popup-customer.dto';

@Injectable()
export class PopupSalesService {
  private paystackSecretKey: string;

  constructor(
    private supabase: SupabaseService,
    private configService: ConfigService,
  ) {
    this.paystackSecretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY', '');
  }

  // ─── Events ────────────────────────────────────────────────────────────────

  async findAllEvents() {
    const db = this.supabase.getAdminClient();
    const { data, error } = await db
      .from('popup_events')
      .select('*, profiles!popup_events_created_by_fkey(id, first_name, last_name)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async createEvent(dto: CreateEventDto, userId: string) {
    const db = this.supabase.getAdminClient();
    const { data, error } = await db
      .from('popup_events')
      .insert({
        name: dto.name,
        description: dto.description || null,
        location: dto.location || null,
        event_date: dto.event_date || null,
        status: dto.status || 'draft',
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateEvent(id: string, dto: UpdateEventDto) {
    const db = this.supabase.getAdminClient();
    const { data, error } = await db
      .from('popup_events')
      .update({ ...dto })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) throw new NotFoundException('Event not found');
    return data;
  }

  // ─── Stats ──────────────────────────────────────────────────────────────────

  async getEventStats(eventId: string) {
    const db = this.supabase.getAdminClient();

    const { data: orders, error } = await db
      .from('popup_orders')
      .select('status, total')
      .eq('event_id', eventId)
      .neq('status', 'cancelled');

    if (error) throw error;

    const allOrders = orders || [];
    const session_revenue = allOrders
      .filter((o) => o.status === 'completed' || o.status === 'confirmed')
      .reduce((sum, o) => sum + Number(o.total), 0);

    return {
      session_revenue: Math.round(session_revenue * 100) / 100,
      orders_completed: allOrders.filter((o) => o.status === 'completed').length,
      on_hold: allOrders.filter((o) => o.status === 'on_hold').length,
      awaiting_payment: allOrders.filter((o) => o.status === 'awaiting_payment').length,
    };
  }

  // ─── Orders ─────────────────────────────────────────────────────────────────

  async findOrders(eventId: string, query: QueryPopupOrdersDto) {
    const db = this.supabase.getAdminClient();
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '50', 10);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let q = db
      .from('popup_orders')
      .select(
        '*, profiles!popup_orders_served_by_fkey(id, first_name, last_name), popup_order_items(*)',
        { count: 'exact' },
      )
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (query.status) {
      q = q.eq('status', query.status);
    }

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

  async findOrder(id: string) {
    const db = this.supabase.getAdminClient();
    const { data, error } = await db
      .from('popup_orders')
      .select(
        '*, profiles!popup_orders_served_by_fkey(id, first_name, last_name), popup_order_items(*)',
      )
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException('Order not found');
    return data;
  }

  async createOrder(eventId: string, dto: CreatePopupOrderDto, userId: string) {
    const db = this.supabase.getAdminClient();

    // Verify event exists and is active
    const { data: event, error: eventError } = await db
      .from('popup_events')
      .select('id, status')
      .eq('id', eventId)
      .single();

    if (eventError || !event) throw new NotFoundException('Event not found');

    // Generate order number: POP-YYYY-XXXX
    const year = new Date().getFullYear();
    const { data: lastOrder } = await db
      .from('popup_orders')
      .select('order_number')
      .like('order_number', `POP-${year}-%`)
      .order('order_number', { ascending: false })
      .limit(1);

    let sequence = 1;
    if (lastOrder && lastOrder.length > 0) {
      const lastSeq = parseInt(lastOrder[0].order_number.split('-')[2], 10);
      sequence = lastSeq + 1;
    }
    const order_number = `POP-${year}-${String(sequence).padStart(4, '0')}`;

    // Calculate totals
    const subtotal = dto.items.reduce(
      (sum, item) => sum + item.unit_price * item.quantity,
      0,
    );
    const discountAmount = Math.round((dto.discount_amount ?? 0) * 100) / 100;
    const total = Math.max(0, Math.round((subtotal - discountAmount) * 100) / 100);

    // Create order
    const { data: order, error: orderError } = await db
      .from('popup_orders')
      .insert({
        event_id: eventId,
        order_number,
        customer_name: dto.customer_name || null,
        customer_phone: dto.customer_phone || null,
        customer_email: dto.customer_email || null,
        served_by: userId,
        status: 'active',
        payment_method: dto.payment_method || null,
        payment_reference: dto.payment_reference || null,
        subtotal: Math.round(subtotal * 100) / 100,
        discount_type: dto.discount_type || 'none',
        discount_amount: discountAmount,
        discount_reason: dto.discount_reason || null,
        hold_duration_minutes: dto.hold_duration_minutes || null,
        hold_note: dto.hold_note || null,
        total,
        notes: dto.notes || null,
      })
      .select()
      .single();

    if (orderError || !order) throw orderError;

    // Insert order items
    const items = dto.items.map((item) => ({
      order_id: order.id,
      product_id: item.product_id || null,
      variant_id: item.variant_id || null,
      product_name: item.product_name,
      variant_title: item.variant_title || null,
      sku: item.sku || null,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: Math.round(item.unit_price * item.quantity * 100) / 100,
    }));

    const { error: itemsError } = await db
      .from('popup_order_items')
      .insert(items);

    if (itemsError) throw itemsError;

    // Insert split payments if provided
    if (dto.split_payments && dto.split_payments.length > 0) {
      const splits = dto.split_payments.map((sp) => {
        let phone = sp.phone?.trim().replace(/\s+/g, '') || null;
        if (phone) {
          if (phone.startsWith('+233')) phone = '0' + phone.slice(4);
          else if (phone.startsWith('233')) phone = '0' + phone.slice(3);
          else if (!phone.startsWith('0')) phone = '0' + phone;
        }
        return {
          order_id: order.id,
          method: sp.method,
          amount: Math.round(sp.amount * 100) / 100,
          network: sp.network || null,
          phone,
          reference: sp.reference || null,
          bank_name: sp.bank_name || null,
          sent_to_paystack: sp.sent_to_paystack ?? false,
        };
      });
      const { error: splitError } = await db
        .from('popup_split_payments')
        .insert(splits);
      if (splitError) throw splitError;
    }

    return this.findOrder(order.id);
  }

  async updateOrder(id: string, dto: UpdatePopupOrderDto) {
    const db = this.supabase.getAdminClient();

    // Fetch current order status so we can detect a transition to 'completed'
    const { data: existingOrder } = await db
      .from('popup_orders')
      .select('id, status')
      .eq('id', id)
      .single();

    const wasAlreadyCompleted = existingOrder?.status === 'completed';
    const isBeingCompleted = dto.status === 'completed' && !wasAlreadyCompleted;

    const updatePayload: Record<string, any> = {};
    if (dto.status !== undefined) updatePayload.status = dto.status;
    if (dto.payment_method !== undefined) updatePayload.payment_method = dto.payment_method;
    if (dto.payment_reference !== undefined) updatePayload.payment_reference = dto.payment_reference;
    if (dto.customer_name !== undefined) updatePayload.customer_name = dto.customer_name;
    if (dto.customer_phone !== undefined) updatePayload.customer_phone = dto.customer_phone;
    if (dto.customer_email !== undefined) updatePayload.customer_email = dto.customer_email;
    if (dto.discount_type !== undefined) updatePayload.discount_type = dto.discount_type;
    if (dto.discount_amount !== undefined) updatePayload.discount_amount = dto.discount_amount;
    if (dto.discount_reason !== undefined) updatePayload.discount_reason = dto.discount_reason;
    if (dto.hold_duration_minutes !== undefined) updatePayload.hold_duration_minutes = dto.hold_duration_minutes;
    if (dto.hold_note !== undefined) updatePayload.hold_note = dto.hold_note;
    if (dto.notes !== undefined) updatePayload.notes = dto.notes;

    const { data, error } = await db
      .from('popup_orders')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) throw new NotFoundException('Order not found');

    // ── Inventory deduction on completion ─────────────────────────────────────
    if (isBeingCompleted) {
      const { data: orderItems } = await db
        .from('popup_order_items')
        .select('variant_id, quantity')
        .eq('order_id', id);

      if (orderItems && orderItems.length > 0) {
        for (const item of orderItems) {
          if (!item.variant_id) continue;

          // Read current quantity
          const { data: variant } = await db
            .from('product_variants')
            .select('inventory_quantity')
            .eq('id', item.variant_id)
            .single();

          if (!variant) continue;

          const newQty = Math.max(0, (variant.inventory_quantity ?? 0) - item.quantity);

          // Decrement inventory
          await db
            .from('product_variants')
            .update({ inventory_quantity: newQty })
            .eq('id', item.variant_id);

          // Log movement
          await db.from('inventory_movements').insert({
            variant_id: item.variant_id,
            quantity_change: -item.quantity,
            quantity_before: variant.inventory_quantity ?? 0,
            quantity_after: newQty,
            movement_type: 'sale',
            notes: `Pop-up order ${id} completed`,
          });
        }
      }
    }

    return data;
  }


  // ─── Paystack MoMo Charge ────────────────────────────────────────────────────

  async chargeOrder(id: string, dto: ChargePopupOrderDto) {
    if (!this.paystackSecretKey) {
      throw new InternalServerErrorException('PAYSTACK_SECRET_KEY not configured');
    }

    const db = this.supabase.getAdminClient();
    const { data: order, error } = await db
      .from('popup_orders')
      .select('id, order_number, total, status')
      .eq('id', id)
      .single();

    if (error || !order) throw new NotFoundException('Order not found');
    if (order.status === 'cancelled' || order.status === 'completed') {
      throw new BadRequestException(`Cannot charge an order with status "${order.status}"`);
    }

    // Amount in pesewas (GHS * 100)
    const amountInPesewas = Math.round(Number(order.total) * 100);
    const email = `popup-${order.order_number.toLowerCase()}@iris-store.com`;

    // Normalize phone to local format (0XXXXXXXXX) expected by Paystack Ghana
    let phone = dto.phone.trim().replace(/\s+/g, '');
    if (phone.startsWith('+233')) phone = '0' + phone.slice(4);
    else if (phone.startsWith('233')) phone = '0' + phone.slice(3);
    else if (!phone.startsWith('0')) phone = '0' + phone;

    const response = await fetch('https://api.paystack.co/charge', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountInPesewas,
        email,
        currency: 'GHS',
        mobile_money: {
          phone,
          provider: dto.provider,
        },
      }),
    });

    const result = (await response.json()) as any;

    if (!result.status) {
      throw new BadRequestException(result.message || 'Paystack charge failed');
    }

    const reference: string = result.data?.reference;
    if (!reference) {
      throw new InternalServerErrorException('No reference returned from Paystack');
    }

    // Update order: set momo payment method, store reference, move to awaiting_payment
    await db
      .from('popup_orders')
      .update({
        payment_method: 'momo',
        payment_reference: reference,
        status: 'awaiting_payment',
        customer_phone: dto.phone,
      })
      .eq('id', id);

    return {
      reference,
      paystack_status: result.data?.status,
      message: result.data?.status === 'send_otp'
        ? 'OTP sent to customer. Ask them for the OTP to complete the charge.'
        : 'MoMo charge initiated. Customer will receive a USSD prompt.',
    };
  }

  async submitOtp(id: string, otp: string): Promise<{ paystack_status: string; message: string }> {
    if (!this.paystackSecretKey) {
      throw new InternalServerErrorException('PAYSTACK_SECRET_KEY not configured');
    }

    const db = this.supabase.getAdminClient();
    const { data: order, error } = await db
      .from('popup_orders')
      .select('id, payment_reference, status')
      .eq('id', id)
      .single();

    if (error || !order) throw new NotFoundException('Order not found');
    if (!order.payment_reference) {
      throw new BadRequestException('No pending charge reference for this order');
    }

    const response = await fetch('https://api.paystack.co/charge/submit_otp', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ otp, reference: order.payment_reference }),
    });

    const result = (await response.json()) as any;

    if (!result.status) {
      throw new BadRequestException(result.message || 'OTP submission failed');
    }

    return {
      paystack_status: result.data?.status,
      message: result.data?.status === 'success'
        ? 'Payment successful!'
        : 'OTP accepted. Customer will receive the PIN prompt now.',
    };
  }

  // Called by the Paystack webhook when charge.success fires
  async confirmByReference(reference: string): Promise<boolean> {
    const db = this.supabase.getAdminClient();
    const { data, error } = await db
      .from('popup_orders')
      .update({ status: 'confirmed' })
      .eq('payment_reference', reference)
      .eq('status', 'awaiting_payment')
      .select('id')
      .maybeSingle();

    if (error) {
      console.error('Error confirming popup order by reference:', error.message);
    }

    return !!data;
  }

  // ─── Customer: find existing or create new profile ───────────────────────────

  async findOrCreateCustomer(dto: CreatePopupCustomerDto): Promise<{ id: string; isNew: boolean }> {
    if (!dto.email && !dto.phone) {
      throw new BadRequestException('At least an email or phone is required to save a customer');
    }

    const db = this.supabase.getAdminClient();

    // Normalize phone to 0XXXXXXXXX before saving
    let phone = dto.phone?.trim().replace(/\s+/g, '') || null;
    if (phone) {
      if (phone.startsWith('+233')) phone = '0' + phone.slice(4);
      else if (phone.startsWith('233')) phone = '0' + phone.slice(3);
      else if (!phone.startsWith('0')) phone = '0' + phone;
    }

    // Check if a profile already exists with this email or phone
    let existingQuery = db.from('profiles').select('id').eq('role', 'public');
    if (dto.email && phone) {
      existingQuery = existingQuery.or(`email.eq.${dto.email},phone_number.eq.${phone}`);
    } else if (dto.email) {
      existingQuery = existingQuery.eq('email', dto.email);
    } else {
      existingQuery = existingQuery.eq('phone_number', phone);
    }

    const { data: existing } = await existingQuery.limit(1).maybeSingle();
    if (existing) {
      return { id: existing.id, isNew: false };
    }

    // Split name into first + last
    const nameParts = (dto.name || '').trim().split(/\s+/).filter(Boolean);
    const first_name = nameParts[0] || null;
    const last_name = nameParts.length > 1 ? nameParts.slice(1).join(' ') : null;

    // Create Supabase auth user (service-role, no password, pre-confirmed)
    const { data: authData, error: authError } = await db.auth.admin.createUser({
      ...(dto.email ? { email: dto.email, email_confirm: true } : {}),
      ...(phone ? { phone, phone_confirm: true } : {}),
      user_metadata: { first_name, last_name },
    });

    if (authError || !authData?.user) {
      throw new InternalServerErrorException(authError?.message || 'Failed to create customer account');
    }

    // Insert profile record
    const { error: profileError } = await db.from('profiles').insert({
      id: authData.user.id,
      email: dto.email || null,
      phone_number: phone,
      first_name,
      last_name,
      role: 'public',
    });

    if (profileError) {
      // Roll back the auth user if profile insert fails
      await db.auth.admin.deleteUser(authData.user.id);
      throw new InternalServerErrorException('Failed to save customer profile');
    }

    return { id: authData.user.id, isNew: true };
  }
}
