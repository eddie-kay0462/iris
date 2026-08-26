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
import { DiscountEngineService } from '../promos/discount-engine.service';
import { CreateWalkinOrderDto } from './dto/create-walkin-order.dto';
import { UpdateWalkinOrderDto } from './dto/update-walkin-order.dto';
import { QueryWalkinOrdersDto } from './dto/query-walkin-orders.dto';
import { CreateWalkinCustomerDto } from './dto/create-walkin-customer.dto';
import { CreateWalkinPreorderDto } from './dto/create-walkin-preorder.dto';
import { RefundWalkinOrderDto } from './dto/refund-walkin-order.dto';
import { ChargeWalkinOrderDto } from './dto/charge-walkin-order.dto';
import { toE164, toPaystackMomoFormat } from '../common/utils/phone';
import {
  dayOf,
  round2,
  WALKIN_REVENUE_STATUSES,
} from '../analytics/analytics.constants';
import { fetchAll } from '../analytics/reports/report-context';

/** Postgres unique_violation. */
const UNIQUE_VIOLATION = '23505';

// Reconciliation windows for MoMo walk-ins stuck in 'awaiting_payment'
// (see reconcileAwaitingPayments).
// GRACE: leave the order alone while the admin tab's own poll is still the
// natural way it gets confirmed — only chase genuinely stuck ones.
const WALKIN_RECONCILE_GRACE_MS = 5 * 60_000; // 5 minutes
// After this, an order Paystack still reports as unpaid is treated as a charge
// the customer never completed, and cancelled so it stops sitting on the list.
const WALKIN_RECONCILE_CANCEL_AFTER_MS = 24 * 60 * 60_000; // 24 hours
// Cap per tick so a backlog can't blow up a single run.
const WALKIN_RECONCILE_BATCH_SIZE = 50;

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
    private discountEngine: DiscountEngineService,
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
    // Paged — a bare select silently stops at PostgREST's 1000-row ceiling,
    // which would quietly freeze these totals once walk-ins pass that mark.
    const rows = await fetchAll<{ status: string; total: string | number; created_at: string }>(
      (a, b) =>
        db
          .from('walkin_orders')
          .select('status, total, created_at')
          .range(a, b),
    );

    // UTC day, matching `dayOf` used across analytics (Ghana is UTC+0), rather
    // than the server's local midnight.
    const today = dayOf(new Date().toISOString());
    const isToday = (o: { created_at: string }) => dayOf(o.created_at) === today;

    const completed = rows.filter((o) =>
      WALKIN_REVENUE_STATUSES.includes(o.status),
    );
    const total_revenue = completed.reduce((sum, o) => sum + Number(o.total), 0);
    const todays = completed.filter(isToday);
    const today_revenue = todays.reduce((sum, o) => sum + Number(o.total), 0);

    return {
      total_revenue: round2(total_revenue),
      today_revenue: round2(today_revenue),
      orders_completed: completed.length,
      orders_today: todays.length,
    };
  }

  // ─── Create walk-in order ────────────────────────────────────────────────────

  async createOrder(dto: CreateWalkinOrderDto, userId: string) {
    const db = this.supabase.getAdminClient();

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('A walk-in order needs at least one item');
    }

    // A lost response must never cost the shop a duplicate sale. If this cart
    // was already rung up, hand back the order that exists.
    if (dto.idempotency_key) {
      const existing = await this.findByIdempotencyKey(dto.idempotency_key);
      if (existing) return this.findOrder(existing);
    }

    // Totals — resolved server-side by the shared discount engine, the same one
    // the storefront uses. A typed promo code and any automatic bundle rules
    // compete; a manual staff discount overrides both. The client's
    // discount_amount is deliberately ignored.
    const discount = await this.discountEngine.resolve({
      channel: 'walkin',
      items: dto.items.map((i) => ({
        // Ad-hoc counter lines carry no product_id. They still count toward the
        // subtotal and toward an anchor's paired-item count — they just can
        // never be an anchor themselves.
        productId: i.product_id ?? '',
        variantId: i.variant_id ?? null,
        unitPrice: i.unit_price,
        quantity: i.quantity,
      })),
      code: dto.promo_code,
      manualOverride:
        dto.discount_type && dto.discount_type !== 'none'
          ? {
              type: dto.discount_type,
              value: dto.discount_value ?? 0,
              reason: dto.discount_reason,
            }
          : null,
    });

    const subtotal = discount.subtotal;
    const discountAmount = discount.discountAmount;
    const total = round2(Math.max(0, subtotal - discountAmount));

    // Derive brand from the products so confirmation emails theme correctly.
    const brand = await this.deriveBrand(dto.items.map((i) => i.product_id));

    const customerPhone = dto.customer_phone
      ? toE164(dto.customer_phone)
      : null;

    // MoMo is charged live via Paystack — the order stays 'awaiting_payment'
    // (no stock deducted, no confirmation sent) until the charge is confirmed.
    // Cash and bank transfer are collected on the spot → complete immediately.
    const isMomo = dto.payment_method === 'momo';

    const insertOrder = (order_number: string) =>
      db
        .from('walkin_orders')
        .insert({
          order_number,
          idempotency_key: dto.idempotency_key || null,
          customer_name: dto.customer_name || null,
          customer_phone: customerPhone,
          customer_email: dto.customer_email || null,
          customer_profile_id: dto.customer_profile_id || null,
          served_by: userId,
          status: isMomo ? 'awaiting_payment' : 'completed',
          payment_method: dto.payment_method || null,
          payment_reference: dto.payment_reference || null,
          subtotal: round2(subtotal),
          discount_type: discount.channelDiscountType,
          discount_amount: discountAmount,
          discount_reason: discount.label,
          applied_promo_code_id: discount.promoCodeId,
          total,
          notes: dto.notes || null,
          brand,
        })
        .select()
        .single();

    // The order number is a read-then-increment against a UNIQUE column, so two
    // sales rung up at the same moment collide. Re-read and retry rather than
    // failing a sale the customer is standing there paying for.
    let order: any = null;
    let orderError: any = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const result = await insertOrder(await this.nextOrderNumber());
      order = result.data;
      orderError = result.error;
      if (!orderError && order) break;

      // Someone else's request won the race on this cart's key — their order is
      // this order.
      if (
        orderError?.code === UNIQUE_VIOLATION &&
        orderError?.message?.includes('idempotency_key') &&
        dto.idempotency_key
      ) {
        const existing = await this.findByIdempotencyKey(dto.idempotency_key);
        if (existing) return this.findOrder(existing);
      }

      if (orderError?.code !== UNIQUE_VIOLATION) break;
    }

    if (orderError || !order) {
      throw new InternalServerErrorException(
        `Could not create the walk-in order: ${orderError?.message ?? 'no row returned'}`,
      );
    }

    // Reserve the promo usage seat. Cash and bank transfer are collected on the
    // spot, so they confirm immediately; MoMo waits for the Paystack charge.
    try {
      await this.discountEngine.reserve({
        resolution: discount,
        channel: 'walkin',
        orderTable: 'walkin_orders',
        orderId: order.id,
        orderNumber: order.order_number,
        customerEmail: dto.customer_email ?? null,
        customerPhone: customerPhone,
        customerProfileId: dto.customer_profile_id ?? null,
        appliedBy: userId,
        confirmImmediately: !isMomo,
      });
    } catch (err) {
      // Do not strand a half-built order behind an exhausted code.
      await db.from('walkin_orders').delete().eq('id', order.id);
      throw err;
    }

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
    if (itemsError) {
      // Without this the order row survives as 'completed' and revenue-counted
      // with zero items, exactly as the promo-reserve path already guards
      // against.
      await db.from('walkin_orders').delete().eq('id', order.id);
      await this.discountEngine
        .revertForOrder('walkin_orders', order.id, 'Order items insert failed')
        .catch(() => {});
      throw new InternalServerErrorException(
        `Could not save the walk-in order's items: ${itemsError.message}`,
      );
    }

    // Cash/bank complete now: deduct stock + send confirmations. MoMo waits for
    // the Paystack charge to confirm (see chargeOrder → verifyPayment).
    if (!isMomo) {
      await this.applyCompletion(order.id);
    }

    return this.findOrder(order.id);
  }

  /** The id of the order already recorded for this cart key, if there is one. */
  private async findByIdempotencyKey(key: string): Promise<string | null> {
    const { data } = await this.supabase
      .getAdminClient()
      .from('walkin_orders')
      .select('id')
      .eq('idempotency_key', key)
      .maybeSingle();
    return data?.id ?? null;
  }

  /**
   * Next number in the WLK-YYYY-XXXX series. Ordered by the numeric tail rather
   * than the whole string, which would put WLK-2026-9999 above WLK-2026-10000.
   * Callers must handle a unique collision — this is a read, not a reservation.
   */
  private async nextOrderNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const { data: lastOrder } = await this.supabase
      .getAdminClient()
      .from('walkin_orders')
      .select('order_number')
      .like('order_number', `WLK-${year}-%`)
      .order('created_at', { ascending: false })
      .limit(200);

    let sequence = 1;
    for (const row of lastOrder ?? []) {
      const seq = parseInt(row.order_number.split('-')[2], 10);
      if (Number.isFinite(seq) && seq >= sequence) sequence = seq + 1;
    }
    return `WLK-${year}-${String(sequence).padStart(4, '0')}`;
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

    await this.discountEngine
      .confirmForOrder('walkin_orders', orderId)
      .catch((err) =>
        console.error(
          `Failed to confirm promo redemption for walk-in ${order.order_number}:`,
          err,
        ),
      );

    // Deduct inventory + log movements. Quantities are summed per variant
    // first: two lines for the same variant would otherwise read the same
    // `before` and the second write would clobber the first. Distinct variants
    // touch distinct rows, so they run together — this is on the response path.
    const byVariant = new Map<string, number>();
    for (const item of items) {
      if (!item.variant_id) continue;
      byVariant.set(
        item.variant_id,
        (byVariant.get(item.variant_id) ?? 0) + item.quantity,
      );
    }

    await Promise.all(
      [...byVariant].map(async ([variantId, quantity]) => {
        const { data: variant } = await db
          .from('product_variants')
          .select('inventory_quantity')
          .eq('id', variantId)
          .single();
        if (!variant) return;

        const before = variant.inventory_quantity ?? 0;
        const after = Math.max(0, before - quantity);

        await db
          .from('product_variants')
          .update({ inventory_quantity: after })
          .eq('id', variantId);

        await db.from('inventory_movements').insert({
          variant_id: variantId,
          quantity_change: -quantity,
          quantity_before: before,
          quantity_after: after,
          movement_type: 'sale',
          notes: `Walk-in order ${order.order_number}`,
        });
      }),
    );

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
          `Hi${name}, ` + SMS_TEMPLATES.walkinOrderConfirmation(order.order_number),
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
      await this.discountEngine
        .revertForOrder(
          'walkin_orders',
          id,
          `Order ${data.order_number} cancelled`,
        )
        .catch((err) =>
          console.error(
            `Failed to revert promo redemption for walk-in ${data.order_number}:`,
            err,
          ),
        );
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

    await this.discountEngine
      .revertForOrder(
        'walkin_orders',
        id,
        `Order ${order.order_number} refunded`,
      )
      .catch((err) =>
        console.error(
          `Failed to revert promo redemption for walk-in ${order.order_number}:`,
          err,
        ),
      );

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

    const paystackStatus =
      (await this.fetchChargeStatus(order.payment_reference)) ?? 'unknown';

    if (paystackStatus === 'success') {
      await this.completeByReference(order.payment_reference);
      return { status: 'completed', confirmed: true };
    }

    return { status: paystackStatus, confirmed: false };
  }

  /**
   * Paystack's view of a MoMo charge, or null if we couldn't get an answer.
   * Null means "don't know", never "not paid" — callers must retry rather than
   * act on it.
   */
  private async fetchChargeStatus(reference: string): Promise<string | null> {
    try {
      const response = await fetch(
        `https://api.paystack.co/charge/${reference}`,
        { headers: { Authorization: `Bearer ${this.paystackSecretKey}` } },
      );
      const result = (await response.json()) as any;
      return result?.data?.status ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Safety net for a MoMo walk-in whose confirmation never arrived by either
   * route: the admin tab was closed mid-payment (killing its poll) AND the
   * Paystack webhook was never delivered. Without this the sale sits in
   * 'awaiting_payment' forever — cash taken, stock never deducted, customer
   * never sent their receipt. Runs on a schedule (see WalkinReconciliationCron).
   *
   * For each awaiting order past the grace window we ask Paystack for the truth:
   *   - success                          → completeByReference() recovers the sale
   *   - unpaid AND older than CANCEL age → cancel it, and free the promo seat
   *   - unpaid but still young           → leave it, retry next tick
   * Every order is handled independently so one failure can't stall the batch.
   */
  async reconcileAwaitingPayments(): Promise<{
    recovered: number;
    cancelled: number;
  }> {
    if (!this.paystackSecretKey) return { recovered: 0, cancelled: 0 };

    const db = this.supabase.getAdminClient();
    const now = Date.now();
    const graceCutoff = new Date(
      now - WALKIN_RECONCILE_GRACE_MS,
    ).toISOString();

    const { data: rows, error } = await db
      .from('walkin_orders')
      .select('id, order_number, payment_reference, created_at')
      .eq('status', 'awaiting_payment')
      .not('payment_reference', 'is', null)
      .lt('created_at', graceCutoff)
      .order('created_at', { ascending: true })
      .limit(WALKIN_RECONCILE_BATCH_SIZE);

    if (error) throw error;
    if (!rows?.length) return { recovered: 0, cancelled: 0 };

    let recovered = 0;
    let cancelled = 0;

    for (const order of rows) {
      try {
        const status = await this.fetchChargeStatus(order.payment_reference);
        if (status === null) continue; // lookup failed — retry next tick

        if (status === 'success') {
          // Idempotent: gated on status still being 'awaiting_payment'.
          if (await this.completeByReference(order.payment_reference)) {
            recovered += 1;
          }
          continue;
        }

        const age = now - new Date(order.created_at).getTime();
        if (age <= WALKIN_RECONCILE_CANCEL_AFTER_MS) continue;

        const { data: updated } = await db
          .from('walkin_orders')
          .update({ status: 'cancelled' })
          .eq('id', order.id)
          .eq('status', 'awaiting_payment') // guard: never cancel a paid order
          .select('id')
          .maybeSingle();
        if (!updated) continue;

        // No inventory to restore — stock is only deducted on completion. The
        // promo seat, though, was reserved when the order was created and has
        // to go back.
        await this.discountEngine
          .revertForOrder(
            'walkin_orders',
            order.id,
            `Order ${order.order_number} never paid`,
          )
          .catch((err) =>
            console.error(
              `Failed to revert promo redemption for walk-in ${order.order_number}:`,
              err,
            ),
          );
        cancelled += 1;
      } catch (err: any) {
        console.error(
          `reconcileAwaitingPayments failed for ${order.order_number}:`,
          err?.message ?? err,
        );
      }
    }

    return { recovered, cancelled };
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
