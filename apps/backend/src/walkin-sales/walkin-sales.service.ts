import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../common/supabase/supabase.service';
import { EmailService } from '../email/email.service';
import { SmsService, SMS_TEMPLATES } from '../sms/sms.service';
import { PreordersService } from '../preorders/preorders.service';
import { CreateWalkinOrderDto } from './dto/create-walkin-order.dto';
import { UpdateWalkinOrderDto } from './dto/update-walkin-order.dto';
import { QueryWalkinOrdersDto } from './dto/query-walkin-orders.dto';
import { CreateWalkinCustomerDto } from './dto/create-walkin-customer.dto';
import { CreateWalkinPreorderDto } from './dto/create-walkin-preorder.dto';
import { RefundWalkinOrderDto } from './dto/refund-walkin-order.dto';
import { ChargeWalkinOrderDto } from './dto/charge-walkin-order.dto';
import { toE164, toPaystackMomoFormat } from '../common/utils/phone';

const ORDER_SELECT =
  '*, profiles!served_by(id, first_name, last_name), walkin_order_items(*)';

@Injectable()
export class WalkinSalesService {
  private frontendUrl: string;
  private paystackSecretKey: string;

  constructor(
    private supabase: SupabaseService,
    private configService: ConfigService,
    private emailService: EmailService,
    private smsService: SmsService,
    private preordersService: PreordersService,
  ) {
    this.frontendUrl = this.configService.get<string>(
      'NEXT_PUBLIC_FRONTEND_URL',
      this.configService.get<string>('FRONTEND_URL', 'https://1nri.store'),
    );
    this.paystackSecretKey = this.configService.get<string>(
      'PAYSTACK_SECRET_KEY',
      '',
    );
  }

  // ─── Orders: list & read ────────────────────────────────────────────────────

  async findOrders(query: QueryWalkinOrdersDto) {
    const db = this.supabase.getAdminClient();
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '20', 10);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let q = db
      .from('walkin_orders')
      .select(ORDER_SELECT, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (query.status) q = q.eq('status', query.status);
    if (query.search) {
      q = q.or(
        `order_number.ilike.%${query.search}%,customer_name.ilike.%${query.search}%,customer_email.ilike.%${query.search}%,customer_phone.ilike.%${query.search}%`,
      );
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
      .from('walkin_orders')
      .select(ORDER_SELECT)
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException('Order not found');
    return data;
  }

  // ─── Stats ──────────────────────────────────────────────────────────────────

  async getStats() {
    const db = this.supabase.getAdminClient();
    const { data, error } = await db
      .from('walkin_orders')
      .select('status, total, created_at');
    if (error) throw error;

    const rows = data || [];
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const completed = rows.filter((o) => o.status === 'completed');
    const total_revenue = completed.reduce((sum, o) => sum + Number(o.total), 0);
    const today_revenue = completed
      .filter((o) => new Date(o.created_at) >= startOfDay)
      .reduce((sum, o) => sum + Number(o.total), 0);

    return {
      total_revenue: Math.round(total_revenue * 100) / 100,
      today_revenue: Math.round(today_revenue * 100) / 100,
      orders_completed: completed.length,
      orders_today: completed.filter((o) => new Date(o.created_at) >= startOfDay)
        .length,
    };
  }

  // ─── Create walk-in order ────────────────────────────────────────────────────

  async createOrder(dto: CreateWalkinOrderDto, userId: string) {
    const db = this.supabase.getAdminClient();

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('A walk-in order needs at least one item');
    }

    // Generate order number: WLK-YYYY-XXXX
    const year = new Date().getFullYear();
    const { data: lastOrder } = await db
      .from('walkin_orders')
      .select('order_number')
      .like('order_number', `WLK-${year}-%`)
      .order('order_number', { ascending: false })
      .limit(1);

    let sequence = 1;
    if (lastOrder && lastOrder.length > 0) {
      const lastSeq = parseInt(lastOrder[0].order_number.split('-')[2], 10);
      sequence = lastSeq + 1;
    }
    const order_number = `WLK-${year}-${String(sequence).padStart(4, '0')}`;

    // Totals — the frontend resolves the discount to a fixed amount.
    const subtotal = dto.items.reduce(
      (sum, item) => sum + item.unit_price * item.quantity,
      0,
    );
    const discountAmount = Math.round((dto.discount_amount ?? 0) * 100) / 100;
    const total = Math.max(
      0,
      Math.round((subtotal - discountAmount) * 100) / 100,
    );

    // Derive brand from the products so confirmation emails theme correctly.
    const brand = await this.deriveBrand(dto.items.map((i) => i.product_id));

    const customerPhone = dto.customer_phone
      ? toE164(dto.customer_phone)
      : null;

    // MoMo is charged live via Paystack — the order stays 'awaiting_payment'
    // (no stock deducted, no confirmation sent) until the charge is confirmed.
    // Cash and bank transfer are collected on the spot → complete immediately.
    const isMomo = dto.payment_method === 'momo';

    const { data: order, error: orderError } = await db
      .from('walkin_orders')
      .insert({
        order_number,
        customer_name: dto.customer_name || null,
        customer_phone: customerPhone,
        customer_email: dto.customer_email || null,
        customer_profile_id: dto.customer_profile_id || null,
        served_by: userId,
        status: isMomo ? 'awaiting_payment' : 'completed',
        payment_method: dto.payment_method || null,
        payment_reference: dto.payment_reference || null,
        subtotal: Math.round(subtotal * 100) / 100,
        discount_type: dto.discount_type || 'none',
        discount_amount: discountAmount,
        discount_reason: dto.discount_reason || null,
        total,
        notes: dto.notes || null,
        brand,
      })
      .select()
      .single();

    if (orderError || !order) throw orderError;

    // Insert items
    const items = dto.items.map((item) => ({
      walkin_order_id: order.id,
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
      .from('walkin_order_items')
      .insert(items);
    if (itemsError) throw itemsError;

    // Cash/bank complete now: deduct stock + send confirmations. MoMo waits for
    // the Paystack charge to confirm (see chargeOrder → verifyPayment).
    if (!isMomo) {
      await this.applyCompletion(order.id);
    }

    return this.findOrder(order.id);
  }

  /**
   * Runs the side effects of an order reaching 'completed' exactly once:
   * deducts inventory (with movement rows) and sends the customer email + SMS.
   * Reads items from the DB so it works for both the create path and the async
   * MoMo confirmation path.
   */
  private async applyCompletion(orderId: string) {
    const db = this.supabase.getAdminClient();

    const { data: order } = await db
      .from('walkin_orders')
      .select('*, walkin_order_items(*)')
      .eq('id', orderId)
      .single();
    if (!order) return;

    const items: any[] = order.walkin_order_items ?? [];

    // Deduct inventory + log movements.
    for (const item of items) {
      if (!item.variant_id) continue;
      const { data: variant } = await db
        .from('product_variants')
        .select('inventory_quantity')
        .eq('id', item.variant_id)
        .single();
      if (!variant) continue;

      const before = variant.inventory_quantity ?? 0;
      const after = Math.max(0, before - item.quantity);

      await db
        .from('product_variants')
        .update({ inventory_quantity: after })
        .eq('id', item.variant_id);

      await db.from('inventory_movements').insert({
        variant_id: item.variant_id,
        quantity_change: -item.quantity,
        quantity_before: before,
        quantity_after: after,
        movement_type: 'sale',
        notes: `Walk-in order ${order.order_number}`,
      });
    }

    // Confirmations (fire-and-forget). Walk-ins get a dedicated in-store
    // summary email (no shipping/tracking), styled like the pop-up email.
    if (order.customer_email) {
      this.emailService
        .sendWalkinOrderSummary({
          email: order.customer_email,
          customer_name: order.customer_name ?? null,
          order_number: order.order_number,
          order_date: order.created_at ?? null,
          items: items.map((i) => ({
            product_name: i.product_name,
            variant_title: i.variant_title ?? null,
            quantity: i.quantity,
            unit_price: Number(i.unit_price),
            total_price: Number(i.total_price),
          })),
          subtotal: Number(order.subtotal),
          discount_amount:
            Number(order.discount_amount) > 0
              ? Number(order.discount_amount)
              : null,
          total: Number(order.total),
          payment_method: order.payment_method ?? null,
          brand: order.brand ?? '1NRI',
        })
        .catch(() => {});
    }

    if (order.customer_phone) {
      const name = order.customer_name ? ` ${order.customer_name}` : '';
      this.smsService
        .sendSMS(
          order.customer_phone,
          `Hi${name}, ` + SMS_TEMPLATES.orderConfirmation(order.order_number),
        )
        .catch(() => {});
    }
  }

  // ─── Update / cancel ─────────────────────────────────────────────────────────

  async updateOrder(id: string, dto: UpdateWalkinOrderDto) {
    const db = this.supabase.getAdminClient();

    const { data: existing } = await db
      .from('walkin_orders')
      .select('id, status')
      .eq('id', id)
      .single();
    if (!existing) throw new NotFoundException('Order not found');

    const updatePayload: Record<string, any> = {};
    if (dto.status !== undefined) updatePayload.status = dto.status;
    if (dto.payment_method !== undefined)
      updatePayload.payment_method = dto.payment_method;
    if (dto.payment_reference !== undefined)
      updatePayload.payment_reference = dto.payment_reference;
    if (dto.customer_name !== undefined)
      updatePayload.customer_name = dto.customer_name;
    if (dto.customer_phone !== undefined)
      updatePayload.customer_phone = dto.customer_phone
        ? toE164(dto.customer_phone)
        : null;
    if (dto.customer_email !== undefined)
      updatePayload.customer_email = dto.customer_email;
    if (dto.notes !== undefined) updatePayload.notes = dto.notes;

    // Cancelling a completed order returns its stock.
    const isBeingCancelled =
      dto.status === 'cancelled' && existing.status === 'completed';
    // Manually completing an order (e.g. confirming a MoMo charge by hand)
    // runs the same completion side effects as an automatic confirmation.
    const isBeingCompleted =
      dto.status === 'completed' && existing.status !== 'completed';

    const { data, error } = await db
      .from('walkin_orders')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();
    if (error || !data) throw new NotFoundException('Order not found');

    if (isBeingCancelled) {
      await this.restoreInventory(id, data.order_number);
    }
    if (isBeingCompleted) {
      await this.applyCompletion(id);
    }

    return this.findOrder(id);
  }

  // ─── Refund ──────────────────────────────────────────────────────────────────

  async refundOrder(id: string, dto: RefundWalkinOrderDto, staffId: string) {
    const db = this.supabase.getAdminClient();

    const { data: order } = await db
      .from('walkin_orders')
      .select('*, walkin_order_items(*)')
      .eq('id', id)
      .single();
    if (!order) throw new NotFoundException('Order not found');

    if (order.status !== 'completed') {
      throw new BadRequestException(
        `Only completed orders can be refunded. Current status: "${order.status}"`,
      );
    }

    const refundAmount = dto.amount
      ? Math.round(dto.amount * 100) / 100
      : Math.round(Number(order.total) * 100) / 100;
    if (refundAmount <= 0 || refundAmount > Number(order.total)) {
      throw new BadRequestException(
        'Refund amount must be between 0.01 and the order total',
      );
    }

    await db
      .from('walkin_orders')
      .update({
        status: 'refunded',
        notes: dto.reason
          ? `${order.notes ? order.notes + ' | ' : ''}Refund: ${dto.reason} (by ${staffId})`
          : order.notes,
      })
      .eq('id', id);

    await this.restoreInventory(id, order.order_number);

    if (order.customer_phone) {
      const name = order.customer_name ? `, ${order.customer_name}` : '';
      this.smsService
        .sendSMS(
          order.customer_phone,
          `Hi${name}, your refund of GH₵${refundAmount.toFixed(2)} for order ${order.order_number} has been processed. Thank you.`,
        )
        .catch(() => {});
    }

    return this.findOrder(id);
  }

  // ─── Paystack MoMo charge ────────────────────────────────────────────────────

  async chargeOrder(id: string, dto: ChargeWalkinOrderDto) {
    if (!this.paystackSecretKey) {
      throw new InternalServerErrorException('PAYSTACK_SECRET_KEY not configured');
    }

    const db = this.supabase.getAdminClient();
    const { data: order, error } = await db
      .from('walkin_orders')
      .select('id, order_number, total, status')
      .eq('id', id)
      .single();

    if (error || !order) throw new NotFoundException('Order not found');
    if (order.status === 'cancelled' || order.status === 'completed') {
      throw new BadRequestException(
        `Cannot charge an order with status "${order.status}"`,
      );
    }

    const amountInPesewas = Math.round(Number(order.total) * 100);
    const email = `walkin-${order.order_number.toLowerCase()}@iris-store.com`;

    const e164Phone = toE164(dto.phone);
    if (!e164Phone) throw new BadRequestException('Invalid phone number format');
    const phone = toPaystackMomoFormat(e164Phone);

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
        mobile_money: { phone, provider: dto.provider },
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

    await db
      .from('walkin_orders')
      .update({
        payment_method: 'momo',
        payment_reference: reference,
        status: 'awaiting_payment',
        customer_phone: e164Phone,
      })
      .eq('id', id);

    return {
      reference,
      paystack_status: result.data?.status,
      message:
        result.data?.status === 'send_otp'
          ? 'OTP sent to customer. Ask them for the OTP to complete the charge.'
          : 'MoMo charge initiated. Customer will receive a USSD prompt.',
    };
  }

  async submitOtp(
    id: string,
    otp: string,
  ): Promise<{ paystack_status: string; message: string }> {
    if (!this.paystackSecretKey) {
      throw new InternalServerErrorException('PAYSTACK_SECRET_KEY not configured');
    }

    const db = this.supabase.getAdminClient();
    const { data: order, error } = await db
      .from('walkin_orders')
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
      message:
        result.data?.status === 'success'
          ? 'Payment successful!'
          : 'OTP accepted. Customer will receive the PIN prompt now.',
    };
  }

  // Poll Paystack for the charge status; complete the order when it succeeds.
  async verifyPayment(
    id: string,
  ): Promise<{ status: string; confirmed: boolean }> {
    if (!this.paystackSecretKey) {
      throw new InternalServerErrorException('PAYSTACK_SECRET_KEY not configured');
    }

    const db = this.supabase.getAdminClient();
    const { data: order, error } = await db
      .from('walkin_orders')
      .select('id, payment_reference, status')
      .eq('id', id)
      .single();

    if (error || !order) throw new NotFoundException('Order not found');
    if (!order.payment_reference) {
      throw new BadRequestException('No payment reference for this order');
    }
    if (order.status === 'completed') {
      return { status: 'completed', confirmed: true };
    }

    const response = await fetch(
      `https://api.paystack.co/charge/${order.payment_reference}`,
      { headers: { Authorization: `Bearer ${this.paystackSecretKey}` } },
    );
    const result = (await response.json()) as any;
    const paystackStatus: string = result.data?.status ?? 'unknown';

    if (paystackStatus === 'success') {
      await this.completeByReference(order.payment_reference);
      return { status: 'completed', confirmed: true };
    }

    return { status: paystackStatus, confirmed: false };
  }

  // Flip an awaiting MoMo order to completed exactly once, then run completion
  // side effects (stock + confirmations). Also called by the Paystack webhook.
  async completeByReference(reference: string): Promise<boolean> {
    const db = this.supabase.getAdminClient();
    const { data, error } = await db
      .from('walkin_orders')
      .update({ status: 'completed' })
      .eq('payment_reference', reference)
      .eq('status', 'awaiting_payment')
      .select('id')
      .maybeSingle();

    if (error) {
      console.error('Error completing walk-in order by reference:', error.message);
    }
    if (data?.id) {
      await this.applyCompletion(data.id);
      return true;
    }
    return false;
  }

  // ─── Pre-orders (out-of-stock walk-in items) ─────────────────────────────────

  async createPreorder(dto: CreateWalkinPreorderDto, userId: string) {
    // Reuse the shared pre-order engine (notifications, FIFO restock,
    // Road-to-HQ counting) tagged with source 'walkin'.
    const results = await this.preordersService.createPopup(
      dto as any,
      userId,
      'walkin',
    );

    // The popup path emails but doesn't SMS — add an SMS confirmation here.
    if (dto.customer_phone && results.length > 0) {
      const orderNumber = (results[0] as any).order_number;
      this.smsService
        .sendSMS(
          dto.customer_phone,
          SMS_TEMPLATES.preorderConfirmation(
            orderNumber,
            'a few weeks',
            this.frontendUrl,
          ),
        )
        .catch(() => {});
    }

    return results;
  }

  // ─── Customer capture (allies-style: invite email customers to profiles) ─────

  async createCustomer(dto: CreateWalkinCustomerDto) {
    const db = this.supabase.getAdminClient();

    const email = dto.email?.trim() || null;
    const phone = dto.phone_number ? toE164(dto.phone_number) : null;
    const firstName = dto.first_name?.trim() || null;
    const lastName = dto.last_name?.trim() || null;

    if (!email && !phone) {
      throw new BadRequestException(
        'At least an email or phone is required to save a customer',
      );
    }

    // Return an existing profile rather than creating a duplicate.
    if (email) {
      const { data: existing } = await db
        .from('profiles')
        .select(
          'id, first_name, last_name, email, phone_number, is_activated, invited_at',
        )
        .eq('email', email)
        .maybeSingle();
      if (existing) return this.normalizeCustomer(existing);
    } else if (phone) {
      const { data: existing } = await db
        .from('profiles')
        .select(
          'id, first_name, last_name, email, phone_number, is_activated, invited_at',
        )
        .eq('phone_number', phone)
        .maybeSingle();
      if (existing) return this.normalizeCustomer(existing);
    }

    // Email path: send a Supabase invite so the customer can claim a storefront
    // account, then store the profile under that auth UUID.
    if (email) {
      const { data: authData, error: inviteError } =
        await db.auth.admin.inviteUserByEmail(email, {
          data: { first_name: firstName, last_name: lastName },
          redirectTo: this.frontendUrl,
        });

      let profileId: string;
      const alreadyRegistered =
        inviteError?.message?.toLowerCase().includes('already been registered') ||
        inviteError?.message?.toLowerCase().includes('user already registered');

      if (!inviteError && authData?.user) {
        profileId = authData.user.id;
      } else if (alreadyRegistered) {
        const { data: listData } = await db.auth.admin.listUsers();
        const existingAuthUser = listData?.users?.find(
          (u: any) => u.email === email,
        );
        profileId = existingAuthUser?.id ?? crypto.randomUUID();
      } else {
        profileId = crypto.randomUUID();
      }

      const invitedAt =
        !inviteError && authData?.user ? new Date().toISOString() : null;

      const { data, error } = await db
        .from('profiles')
        .insert({
          id: profileId,
          first_name: firstName,
          last_name: lastName,
          email,
          phone_number: phone,
          invited_at: invitedAt,
        })
        .select(
          'id, first_name, last_name, email, phone_number, is_activated, invited_at',
        )
        .single();

      if (error) {
        throw new InternalServerErrorException('Failed to save customer profile');
      }
      return this.normalizeCustomer(data);
    }

    // Phone-only path: offline record, no invite possible.
    const { data, error } = await db
      .from('profiles')
      .insert({
        id: crypto.randomUUID(),
        first_name: firstName,
        last_name: lastName,
        email: null,
        phone_number: phone,
      })
      .select(
        'id, first_name, last_name, email, phone_number, is_activated, invited_at',
      )
      .single();

    if (error) {
      throw new InternalServerErrorException('Failed to save customer profile');
    }
    return this.normalizeCustomer(data);
  }

  async searchCustomers(q: string) {
    if (!q?.trim()) return [];
    const db = this.supabase.getAdminClient();
    const { data } = await db
      .from('profiles')
      .select(
        'id, first_name, last_name, email, phone_number, is_activated, invited_at',
      )
      .or(
        `first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%,phone_number.ilike.%${q}%`,
      )
      .limit(8);
    return (data ?? []).map((r) => this.normalizeCustomer(r));
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  private normalizeCustomer(r: any) {
    return {
      id: r.id,
      first_name: r.first_name ?? null,
      last_name: r.last_name ?? null,
      email: r.email ?? null,
      phone_number: r.phone_number ?? null,
      is_activated: r.is_activated ?? false,
      invited_at: r.invited_at ?? null,
    };
  }

  private async deriveBrand(
    productIds: (string | undefined)[],
  ): Promise<string> {
    const ids = productIds.filter(Boolean) as string[];
    if (ids.length === 0) return '1NRI';
    const db = this.supabase.getAdminClient();
    const { data } = await db
      .from('products')
      .select('vendor')
      .in('id', ids);
    const vendors = (data ?? []).map((p: any) => p.vendor || '1NRI');
    return vendors.length > 0 &&
      vendors.every((v: string) => v === 'Unlikely Alliances')
      ? 'Unlikely Alliances'
      : '1NRI';
  }

  private async restoreInventory(orderId: string, orderNumber: string) {
    const db = this.supabase.getAdminClient();
    const { data: items } = await db
      .from('walkin_order_items')
      .select('variant_id, quantity')
      .eq('walkin_order_id', orderId);

    for (const item of items ?? []) {
      if (!item.variant_id) continue;
      const { data: variant } = await db
        .from('product_variants')
        .select('inventory_quantity')
        .eq('id', item.variant_id)
        .single();
      if (!variant) continue;

      const before = variant.inventory_quantity ?? 0;
      const after = before + item.quantity;

      await db
        .from('product_variants')
        .update({ inventory_quantity: after })
        .eq('id', item.variant_id);

      await db.from('inventory_movements').insert({
        variant_id: item.variant_id,
        quantity_change: item.quantity,
        quantity_before: before,
        quantity_after: after,
        movement_type: 'return',
        notes: `Refund/cancel for walk-in order ${orderNumber}`,
      });
    }
  }
}
