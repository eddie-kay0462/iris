import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../common/supabase/supabase.service';
import { LetsfishService } from '../letsfish/letsfish.service';
import { EmailService } from '../email/email.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { CreatePopupOrderDto } from './dto/create-popup-order.dto';
import { UpdatePopupOrderDto } from './dto/update-popup-order.dto';
import { QueryPopupOrdersDto } from './dto/query-popup-orders.dto';
import { ChargePopupOrderDto } from './dto/charge-popup-order.dto';
import { CreatePopupCustomerDto } from './dto/create-popup-customer.dto';
import { RefundPopupOrderDto } from './dto/refund-popup-order.dto';
import { toE164, toPaystackMomoFormat } from '../common/utils/phone';
import { POPUP_REVENUE_STATUSES, round2 } from '../analytics/analytics.constants';
import { DiscountEngineService } from '../promos/discount-engine.service';

/** Postgres unique_violation. */
const UNIQUE_VIOLATION = '23505';

// Reconciliation windows for MoMo pop-up orders stuck in 'awaiting_payment'
// (see reconcileAwaitingPayments) — same shape as the walk-in cron.
// GRACE: leave the order alone while the stand's own poll is still the natural
// way it gets confirmed; only chase genuinely stuck ones.
const POPUP_RECONCILE_GRACE_MS = 5 * 60_000; // 5 minutes
// After this, a charge Paystack still reports as unpaid is treated as one the
// customer never completed, and cancelled so it stops sitting on the queue.
const POPUP_RECONCILE_CANCEL_AFTER_MS = 24 * 60 * 60_000; // 24 hours
// Cap per tick so a backlog can't blow up a single run.
const POPUP_RECONCILE_BATCH_SIZE = 50;

// Split rows are part of how an order was paid, so every read of an order
// carries them — without this the breakdown is write-only.
const ORDER_SELECT =
  '*, profiles!served_by(id, first_name, last_name), popup_order_items(*), popup_split_payments(*)';

@Injectable()
export class PopupSalesService {
  private paystackSecretKey: string;

  constructor(
    private supabase: SupabaseService,
    private configService: ConfigService,
    private letsfish: LetsfishService,
    private emailService: EmailService,
    private discountEngine: DiscountEngineService,
  ) {
    this.paystackSecretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY', '');
  }

  // ─── Events ────────────────────────────────────────────────────────────────

  async findAllEvents() {
    const db = this.supabase.getAdminClient();
    const { data, error } = await db
      .from('popup_events')
      .select('*, profiles!created_by(id, first_name, last_name)')
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
        visitor_count: (dto as any).visitor_count ?? null,
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

  // ─── Analytics ──────────────────────────────────────────────────────────────

  async getEventAnalytics(eventId: string) {
    const db = this.supabase.getAdminClient();

    // Fetch event details (includes visitor_count if column exists)
    const { data: event } = await db
      .from('popup_events')
      .select('*')
      .eq('id', eventId)
      .single();

    // Fetch all orders with items
    const { data: orders, error } = await db
      .from('popup_orders')
      .select('*, popup_order_items(*)')
      .eq('event_id', eventId)
      .neq('status', 'cancelled');

    if (error) throw error;
    const allOrders = orders || [];

    // ── Revenue & conversion ─────────────────────────────────────────────────
    const revenueOrders = allOrders.filter(
      (o) => POPUP_REVENUE_STATUSES.includes(o.status),
    );
    const totalRevenue = revenueOrders.reduce((s, o) => s + Number(o.total), 0);
    const totalTransactions = revenueOrders.length;
    const totalOrders = allOrders.length;
    const conversionRate = totalOrders > 0 ? (totalTransactions / totalOrders) * 100 : 0;
    const aov = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    const visitorCount: number | null = (event as any)?.visitor_count ?? null;
    const revenuePerVisitor =
      visitorCount && visitorCount > 0 ? totalRevenue / visitorCount : null;

    // ── Existing vs New customer AOV ─────────────────────────────────────────
    // Treat orders with no email AND no phone as walk-ins (new)
    const existingOrders = revenueOrders.filter(
      (o) => o.customer_email || o.customer_phone,
    );
    const newOrders = revenueOrders.filter(
      (o) => !o.customer_email && !o.customer_phone,
    );
    const existingRevenue = existingOrders.reduce((s, o) => s + Number(o.total), 0);
    const newRevenue = newOrders.reduce((s, o) => s + Number(o.total), 0);
    const existingAov =
      existingOrders.length > 0 ? existingRevenue / existingOrders.length : 0;
    const newAov = newOrders.length > 0 ? newRevenue / newOrders.length : 0;

    // ── Discount impact ──────────────────────────────────────────────────────
    const discountedOrders = revenueOrders.filter((o) => Number(o.discount_amount) > 0);
    const fullPriceOrders = revenueOrders.filter((o) => !Number(o.discount_amount));
    const discountedRevenue = discountedOrders.reduce((s, o) => s + Number(o.total), 0);
    const fullPriceRevenue = fullPriceOrders.reduce((s, o) => s + Number(o.total), 0);
    const avgDiscountPct =
      discountedOrders.length > 0
        ? discountedOrders.reduce((s, o) => {
            const sub = Number(o.subtotal) || Number(o.total);
            return s + (sub > 0 ? (Number(o.discount_amount) / sub) * 100 : 0);
          }, 0) / discountedOrders.length
        : 0;

    // ── Payment method breakdown ─────────────────────────────────────────────
    const paymentBreakdown: Record<string, { count: number; revenue: number }> = {};
    for (const o of revenueOrders) {
      const method = o.payment_method || 'unknown';
      if (!paymentBreakdown[method]) paymentBreakdown[method] = { count: 0, revenue: 0 };
      paymentBreakdown[method].count++;
      paymentBreakdown[method].revenue += Number(o.total);
    }

    // ── Revenue over time (by hour) ─────────────────────────────────────────
    const revenueByHour: Record<string, number> = {};
    for (const o of revenueOrders) {
      const hour = new Date(o.created_at).getHours();
      const label = `${String(hour).padStart(2, '0')}:00`;
      revenueByHour[label] = (revenueByHour[label] || 0) + Number(o.total);
    }

    // ── Orders by hour ───────────────────────────────────────────────────────
    const ordersByHour: Record<string, number> = {};
    for (const o of allOrders) {
      const hour = new Date(o.created_at).getHours();
      const label = `${String(hour).padStart(2, '0')}:00`;
      ordersByHour[label] = (ordersByHour[label] || 0) + 1;
    }

    // ── Product performance ──────────────────────────────────────────────────
    const productMap: Record<
      string,
      { name: string; unitsSold: number; revenue: number; sku: string | null }
    > = {};
    for (const o of revenueOrders) {
      for (const item of o.popup_order_items ?? []) {
        const key = item.product_id || item.product_name;
        if (!productMap[key]) {
          productMap[key] = {
            name: item.product_name,
            unitsSold: 0,
            revenue: 0,
            sku: item.sku || null,
          };
        }
        productMap[key].unitsSold += item.quantity;
        productMap[key].revenue += Number(item.total_price);
      }
    }
    const productPerformance = Object.values(productMap).sort(
      (a, b) => b.revenue - a.revenue,
    );

    // ── Status breakdown ─────────────────────────────────────────────────────
    const statusBreakdown: Record<string, number> = {};
    for (const o of [...allOrders]) {
      statusBreakdown[o.status] = (statusBreakdown[o.status] || 0) + 1;
    }

    // ── Customer capture list ────────────────────────────────────────────────
    const seen = new Set<string>();
    const customerCapture: {
      name: string | null;
      phone: string | null;
      email: string | null;
      totalSpend: number;
    }[] = [];

    for (const o of allOrders) {
      const key = o.customer_email || o.customer_phone || o.id;
      if (!seen.has(key)) {
        seen.add(key);
        const spend = revenueOrders
          .filter(
            (r) =>
              (o.customer_email && r.customer_email === o.customer_email) ||
              (o.customer_phone && r.customer_phone === o.customer_phone),
          )
          .reduce((s, r) => s + Number(r.total), 0);
        customerCapture.push({
          name: o.customer_name,
          phone: o.customer_phone,
          email: o.customer_email,
          totalSpend: spend,
        });
      }
    }

    // ── 1NRI loyalty discount (5%) tracking ──────────────────────────────────
    const loyaltyOrders = discountedOrders.filter(
      (o) =>
        o.discount_reason &&
        (o.discount_reason.toLowerCase().includes('1nri') ||
          o.discount_reason.toLowerCase().includes('loyalty')),
    );

    return {
      eventId,
      eventName: event?.name ?? null,
      eventDate: event?.event_date ?? null,
      eventLocation: event?.location ?? null,
      visitorCount,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalTransactions,
      totalOrders,
      conversionRate: Math.round(conversionRate * 100) / 100,
      aov: Math.round(aov * 100) / 100,
      revenuePerVisitor:
        revenuePerVisitor !== null ? Math.round(revenuePerVisitor * 100) / 100 : null,
      existingCustomer: {
        orderCount: existingOrders.length,
        aov: Math.round(existingAov * 100) / 100,
        revenue: Math.round(existingRevenue * 100) / 100,
      },
      newCustomer: {
        orderCount: newOrders.length,
        aov: Math.round(newAov * 100) / 100,
        revenue: Math.round(newRevenue * 100) / 100,
      },
      discountImpact: {
        discountedCount: discountedOrders.length,
        discountedRevenue: Math.round(discountedRevenue * 100) / 100,
        fullPriceCount: fullPriceOrders.length,
        fullPriceRevenue: Math.round(fullPriceRevenue * 100) / 100,
        avgDiscountPct: Math.round(avgDiscountPct * 100) / 100,
        loyaltyOrderCount: loyaltyOrders.length,
      },
      paymentBreakdown,
      revenueByHour,
      ordersByHour,
      productPerformance,
      statusBreakdown,
      customerCapture,
    };
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
      .filter((o) => POPUP_REVENUE_STATUSES.includes(o.status))
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
      .select(ORDER_SELECT, { count: 'exact' })
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
      .select(ORDER_SELECT)
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException('Order not found');
    return data;
  }

  async createOrder(eventId: string, dto: CreatePopupOrderDto, userId: string) {
    const db = this.supabase.getAdminClient();

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('A pop-up order needs at least one item');
    }

    // Verify event exists and is active
    const { data: event, error: eventError } = await db
      .from('popup_events')
      .select('id, status, name, location, event_date')
      .eq('id', eventId)
      .single();

    if (eventError || !event) throw new NotFoundException('Event not found');
    if (event.status === 'closed') throw new BadRequestException('This event is closed and cannot accept new orders');

    // A lost response must never cost the stand a duplicate sale. If this cart
    // was already rung up, hand back the order that exists.
    if (dto.idempotency_key) {
      const existing = await this.findByIdempotencyKey(dto.idempotency_key);
      if (existing) return this.findOrder(existing);
    }

    // Totals — resolved server-side by the shared discount engine, same as the
    // storefront and walk-in. A typed promo code and any automatic bundle rules
    // compete; a manual staff discount overrides both. The client's
    // discount_amount is deliberately ignored.
    const discount = await this.discountEngine.resolve({
      channel: 'popup',
      items: dto.items.map((i) => ({
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

    // The stall's tally bar checks the split against a total the browser worked
    // out. The figure that gets charged is the one resolved just above, and the
    // two can differ — a promo that expired between preview and submit, a bundle
    // rule that fires differently. Check the split against the real total before
    // anything is written, so a mismatch is a refused sale rather than a silent
    // discrepancy nobody finds until the till is counted.
    const splitInputs = (dto.split_payments ?? []).filter(
      (sp) => Number(sp.amount) > 0,
    );
    if (splitInputs.length === 1) {
      // A single leg is the whole order by definition — the stall sends one for
      // a plain MoMo sale just to carry the network and number. Snap it to the
      // real total rather than refusing a sale over a stale preview.
      splitInputs[0] = { ...splitInputs[0], amount: total };
    } else if (splitInputs.length > 1) {
      const allocated = round2(
        splitInputs.reduce((sum, sp) => sum + Number(sp.amount), 0),
      );
      if (Math.abs(allocated - total) > 0.01) {
        throw new BadRequestException(
          `Split payments add up to GH₵${allocated.toFixed(2)} but the order total is GH₵${total.toFixed(2)}. ` +
            'Re-check the amounts — the discount may have changed since the total was shown.',
        );
      }
    }

    // Normalised on the way in, the way walk-ins do it. chargeOrder writes E.164
    // back later regardless, so storing the raw form here left the same customer
    // under two formats and broke profile de-duplication.
    const customerPhone = dto.customer_phone ? toE164(dto.customer_phone) : null;

    // Cash is in the tin the moment the order is rung up — there is nothing left
    // to confirm, so the sale completes here rather than waiting for someone to
    // pick "Mark as Completed" off the row menu. A split counts as cash only if
    // every leg is; anything with a MoMo or transfer leg still needs confirming.
    // MoMo waits for Paystack (see chargeOrder → verifyPayment), and a bank
    // transfer waits for the reference to be checked.
    //
    // A held ticket is the exception: it is deliberately unfinished, and the
    // hold path transitions to 'on_hold' straight after this call — which
    // 'completed' would refuse.
    const isCashSale =
      !dto.hold_duration_minutes &&
      (splitInputs.length > 0
        ? splitInputs.every((sp) => sp.method === 'cash')
        : dto.payment_method === 'cash');

    const insertOrder = (order_number: string) =>
      db
        .from('popup_orders')
        .insert({
          event_id: eventId,
          order_number,
          idempotency_key: dto.idempotency_key || null,
          customer_name: dto.customer_name || null,
          customer_phone: customerPhone,
          customer_email: dto.customer_email || null,
          served_by: userId,
          status: isCashSale ? 'completed' : 'active',
          payment_method: dto.payment_method || null,
          payment_reference: dto.payment_reference || null,
          subtotal: round2(subtotal),
          discount_type: discount.channelDiscountType,
          discount_amount: discountAmount,
          discount_reason: discount.label,
          applied_promo_code_id: discount.promoCodeId,
          hold_duration_minutes: dto.hold_duration_minutes || null,
          hold_note: dto.hold_note || null,
          total,
          notes: dto.notes || null,
        })
        .select()
        .single();

    // The order number is a read-then-increment against a UNIQUE column, so two
    // tills ringing up at the same moment collide. Re-read and retry rather than
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
        `Could not create the pop-up order: ${orderError?.message ?? 'no row returned'}`,
      );
    }

    /**
     * Everything below this point can fail with the order row already written.
     * Leaving it behind gives the stand a ghost order — no items, or no record
     * of how it was paid — that staff will re-ring anyway. Undo and rethrow, the
     * way walkin-sales.service does.
     */
    const rollback = async (reason: string) => {
      await db.from('popup_orders').delete().eq('id', order.id);
      await this.discountEngine
        .revertForOrder('popup_orders', order.id, reason)
        .catch(() => {});
    };

    try {
      await this.discountEngine.reserve({
        resolution: discount,
        channel: 'popup',
        orderTable: 'popup_orders',
        orderId: order.id,
        orderNumber: order.order_number,
        customerEmail: dto.customer_email ?? null,
        customerPhone: customerPhone,
        appliedBy: userId,
        // Cash is collected on the spot, so its seat is taken outright rather
        // than left pending on a sale that might never be confirmed.
        confirmImmediately: isCashSale,
      });
    } catch (err) {
      // Do not strand a half-built order behind an exhausted code.
      await db.from('popup_orders').delete().eq('id', order.id);
      throw err;
    }

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

    if (itemsError) {
      await rollback('Order items insert failed');
      throw new InternalServerErrorException(
        `Could not save the pop-up order's items: ${itemsError.message}`,
      );
    }

    // Insert split payments if provided
    if (splitInputs.length > 0) {
      const splits = splitInputs.map((sp) => {
        const phone = sp.phone ? toE164(sp.phone) : null;
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
      if (splitError) {
        await rollback('Split payment insert failed');
        throw new InternalServerErrorException(
          `Could not save the pop-up order's split payments: ${splitError.message}`,
        );
      }
    }

    // Deduct stock and send the receipt. Runs last so it reads a complete order
    // — and so a failed item or split insert rolls back before any of it fires.
    if (isCashSale) {
      await this.applyCompletion(order.id);
    }

    return this.findOrder(order.id);
  }

  /** The id of the order already recorded for this cart key, if there is one. */
  private async findByIdempotencyKey(key: string): Promise<string | null> {
    const { data } = await this.supabase
      .getAdminClient()
      .from('popup_orders')
      .select('id')
      .eq('idempotency_key', key)
      .maybeSingle();
    return data?.id ?? null;
  }

  /**
   * Next number in the POP-YYYY-XXXX series. Ordered by the numeric tail rather
   * than the whole string, which would put POP-2026-9999 above POP-2026-10000.
   * Callers must handle a unique collision — this is a read, not a reservation.
   */
  private async nextOrderNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const { data: recent } = await this.supabase
      .getAdminClient()
      .from('popup_orders')
      .select('order_number')
      .like('order_number', `POP-${year}-%`)
      .order('created_at', { ascending: false })
      .limit(200);

    let sequence = 1;
    for (const row of recent ?? []) {
      const seq = parseInt(row.order_number.split('-')[2], 10);
      if (Number.isFinite(seq) && seq >= sequence) sequence = seq + 1;
    }
    return `POP-${year}-${String(sequence).padStart(4, '0')}`;
  }

  async updateOrder(id: string, dto: UpdatePopupOrderDto) {
    const db = this.supabase.getAdminClient();

    // Fetch current order status so we can detect a transition to 'completed'
    const { data: existingOrder } = await db
      .from('popup_orders')
      .select('id, status, discount_type, order_number, customer_email, customer_phone, served_by')
      .eq('id', id)
      .single();

    const wasAlreadyCompleted = existingOrder?.status === 'completed';
    const isBeingCompleted = dto.status === 'completed' && !wasAlreadyCompleted;
    // Only a completed order has stock to give back — nothing else deducted any.
    const isBeingCancelled = dto.status === 'cancelled' && wasAlreadyCompleted;

    const VALID_TRANSITIONS: Partial<Record<string, string[]>> = {
      active:           ['awaiting_payment', 'on_hold', 'completed', 'cancelled'],
      on_hold:          ['active', 'cancelled'],
      awaiting_payment: ['completed', 'active', 'cancelled'],
      confirmed:        ['completed', 'cancelled'],
      // Cash sales are now completed the moment they're rung up, so a mis-ring
      // has to be undoable without going through a refund. Cancelling returns
      // the stock, same as the walk-in counter.
      completed:        ['refunded', 'cancelled'],
      cancelled:        [],
      refunded:         [],
    };
    if (dto.status && existingOrder?.status && dto.status !== existingOrder.status) {
      const allowed = VALID_TRANSITIONS[existingOrder.status] ?? [];
      if (!allowed.includes(dto.status)) {
        throw new BadRequestException(
          `Cannot transition order from '${existingOrder.status}' to '${dto.status}'`,
        );
      }
    }

    const updatePayload: Record<string, any> = {};
    if (dto.status !== undefined) updatePayload.status = dto.status;
    if (dto.payment_method !== undefined) updatePayload.payment_method = dto.payment_method;
    if (dto.payment_reference !== undefined) updatePayload.payment_reference = dto.payment_reference;
    if (dto.customer_name !== undefined) updatePayload.customer_name = dto.customer_name;
    if (dto.customer_phone !== undefined) updatePayload.customer_phone = dto.customer_phone;
    if (dto.customer_email !== undefined) updatePayload.customer_email = dto.customer_email;
    if (dto.hold_duration_minutes !== undefined) updatePayload.hold_duration_minutes = dto.hold_duration_minutes;
    if (dto.hold_note !== undefined) updatePayload.hold_note = dto.hold_note;
    if (dto.notes !== undefined) updatePayload.notes = dto.notes;

    // ── Re-price when the discount is edited ──────────────────────────────────
    // This block previously wrote discount_type/amount/reason but left `total`
    // untouched, so an edited discount silently desynced the order total from
    // its own subtotal. Re-resolve against the order's real line items instead,
    // and replace the ledger row so the log matches what was actually charged.
    const discountTouched =
      dto.discount_type !== undefined ||
      dto.discount_value !== undefined ||
      dto.discount_reason !== undefined ||
      dto.promo_code !== undefined;

    let reResolved: Awaited<ReturnType<DiscountEngineService['resolve']>> | null =
      null;

    if (discountTouched) {
      const { data: currentItems } = await db
        .from('popup_order_items')
        .select('product_id, variant_id, unit_price, quantity')
        .eq('order_id', id);

      const discountType = dto.discount_type ?? existingOrder?.discount_type;

      reResolved = await this.discountEngine.resolve({
        channel: 'popup',
        items: (currentItems ?? []).map((i: any) => ({
          productId: i.product_id ?? '',
          variantId: i.variant_id ?? null,
          unitPrice: Number(i.unit_price),
          quantity: Number(i.quantity),
        })),
        code: dto.promo_code,
        manualOverride:
          discountType && discountType !== 'none' && discountType !== 'code' && discountType !== 'pairing'
            ? {
                type: discountType as 'percentage' | 'fixed',
                value: dto.discount_value ?? 0,
                reason: dto.discount_reason,
              }
            : null,
      });

      updatePayload.subtotal = round2(reResolved.subtotal);
      updatePayload.discount_type = reResolved.channelDiscountType;
      updatePayload.discount_amount = reResolved.discountAmount;
      updatePayload.discount_reason = reResolved.label;
      updatePayload.applied_promo_code_id = reResolved.promoCodeId;
      updatePayload.total = round2(
        Math.max(0, reResolved.subtotal - reResolved.discountAmount),
      );
    }

    const { data, error } = await db
      .from('popup_orders')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) throw new NotFoundException('Order not found');

    // Swap the ledger row for one that matches the re-priced order.
    if (reResolved) {
      await this.discountEngine.revertForOrder(
        'popup_orders',
        id,
        `Discount edited on ${data.order_number}`,
      );
      await this.discountEngine.reserve({
        resolution: reResolved,
        channel: 'popup',
        orderTable: 'popup_orders',
        orderId: id,
        orderNumber: data.order_number,
        customerEmail: data.customer_email ?? null,
        customerPhone: data.customer_phone ?? null,
        appliedBy: existingOrder?.served_by ?? null,
        // An already-completed order has been paid for, so its new seat is
        // taken outright rather than left pending.
        confirmImmediately: data.status === 'completed',
      });
    }

    if (isBeingCancelled) {
      await this.restoreInventory(id, data.order_number);
    }

    // A cancelled order gives its promo seat back; a completed one has money
    // behind it, and confirms the seat inside applyCompletion below.
    if (dto.status === 'cancelled') {
      await this.discountEngine
        .revertForOrder('popup_orders', id, `Order ${data.order_number} cancelled`)
        .catch((err) =>
          console.error(
            `Failed to revert promo redemption for pop-up ${data.order_number}:`,
            err,
          ),
        );
    }

    // Stock deduction + receipt. Both live in applyCompletion so the async MoMo
    // confirmation path runs exactly the same side effects — it used to run none
    // of them, and every MoMo sale at the stand oversold its stock.
    if (isBeingCompleted) {
      await this.applyCompletion(id);
    }

    return data;
  }

  /**
   * Runs the side effects of a pop-up order reaching 'completed' exactly once:
   * confirms the promo seat, deducts inventory (with movement rows) and sends
   * the customer's receipt. Reads the order back from the DB so it serves both
   * the manual "Mark as Completed" path and the async MoMo confirmation path
   * (the stand's poll and the Paystack webhook), which used to skip all of it.
   */
  private async applyCompletion(orderId: string) {
    const db = this.supabase.getAdminClient();

    const { data: order } = await db
      .from('popup_orders')
      .select('*, popup_order_items(*, product:products(vendor))')
      .eq('id', orderId)
      .single();
    if (!order) return;

    const items: any[] = order.popup_order_items ?? [];

    await this.discountEngine
      .confirmForOrder('popup_orders', orderId)
      .catch((err) =>
        console.error(
          `Failed to confirm promo redemption for pop-up ${order.order_number}:`,
          err,
        ),
      );

    // Quantities are summed per variant first: two lines for the same variant
    // would otherwise read the same `before` and the second write would clobber
    // the first. Distinct variants touch distinct rows, so they run together —
    // this is on the response path.
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
          notes: `Pop-up order ${order.order_number} completed`,
        });
      }),
    );

    if (order.customer_email) {
      const { data: evt } = await db
        .from('popup_events')
        .select('name, location, event_date')
        .eq('id', order.event_id)
        .single();
      const itemVendors = items.map((i: any) => i.product?.vendor || '1NRI');
      const brand =
        itemVendors.length > 0 &&
        itemVendors.every((v: string) => v === 'Unlikely Alliances')
          ? 'Unlikely Alliances'
          : '1NRI';
      this.emailService
        .sendPopupOrderSummary({
          email: order.customer_email,
          customer_name: order.customer_name ?? null,
          order_number: order.order_number,
          event_name: evt?.name ?? 'Pop-up Event',
          event_location: evt?.location ?? null,
          event_date: evt?.event_date ?? null,
          items: items.map((i: any) => ({
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
          payment_method: order.payment_method,
          brand,
        })
        .catch(() => {});
    }
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

    // Convert to E.164 then to Paystack Ghana MoMo format (0XXXXXXXXX)
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
        customer_phone: e164Phone,
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

  // Poll Paystack directly to check charge status, and auto-confirm if successful
  async verifyPayment(id: string): Promise<{ status: string; confirmed: boolean }> {
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
      throw new BadRequestException('No payment reference for this order');
    }

    // Already completed — nothing to do
    if (order.status === 'completed') {
      return { status: 'completed', confirmed: true };
    }

    const paystackStatus =
      (await this.fetchChargeStatus(order.payment_reference)) ?? 'unknown';

    if (paystackStatus === 'success') {
      await this.confirmByReference(order.payment_reference);
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

  // Called by the Paystack webhook when charge.success fires, and by the stand's
  // own poll via verifyPayment. Flips the order to completed exactly once, then
  // runs the shared completion side effects (promo, stock, receipt).
  async confirmByReference(reference: string): Promise<boolean> {
    const db = this.supabase.getAdminClient();
    const { data, error } = await db
      .from('popup_orders')
      .update({ status: 'completed' })
      .eq('payment_reference', reference)
      .eq('status', 'awaiting_payment')
      .select('id')
      .maybeSingle();

    if (error) {
      console.error('Error confirming popup order by reference:', error.message);
    }

    if (data?.id) {
      await this.applyCompletion(data.id);
      return true;
    }
    return false;
  }

  /**
   * Safety net for a MoMo pop-up order whose confirmation never arrived by either
   * route: the stand's tab was closed mid-payment (killing its poll) AND the
   * Paystack webhook was never delivered. Without this the sale sits in
   * 'awaiting_payment' forever — cash taken, stock never deducted, customer never
   * sent their receipt. Runs on a schedule (see PopupReconciliationCron).
   *
   * For each awaiting order past the grace window we ask Paystack for the truth:
   *   - success                          → confirmByReference() recovers the sale
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
    const graceCutoff = new Date(now - POPUP_RECONCILE_GRACE_MS).toISOString();

    const { data: rows, error } = await db
      .from('popup_orders')
      .select('id, order_number, payment_reference, created_at')
      .eq('status', 'awaiting_payment')
      .not('payment_reference', 'is', null)
      .lt('created_at', graceCutoff)
      .order('created_at', { ascending: true })
      .limit(POPUP_RECONCILE_BATCH_SIZE);

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
          if (await this.confirmByReference(order.payment_reference)) {
            recovered += 1;
          }
          continue;
        }

        const age = now - new Date(order.created_at).getTime();
        if (age <= POPUP_RECONCILE_CANCEL_AFTER_MS) continue;

        const { data: updated } = await db
          .from('popup_orders')
          .update({ status: 'cancelled' })
          .eq('id', order.id)
          .eq('status', 'awaiting_payment') // guard: never cancel a paid order
          .select('id')
          .maybeSingle();
        if (!updated) continue;

        // No inventory to restore — stock is only deducted on completion. The
        // promo seat, though, was reserved when the order was created and has to
        // go back.
        await this.discountEngine
          .revertForOrder(
            'popup_orders',
            order.id,
            `Order ${order.order_number} never paid`,
          )
          .catch((err) =>
            console.error(
              `Failed to revert promo redemption for pop-up ${order.order_number}:`,
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

  // ─── Refund ──────────────────────────────────────────────────────────────────

  async refundOrder(id: string, dto: RefundPopupOrderDto, staffId: string) {
    if (!this.paystackSecretKey) {
      throw new InternalServerErrorException('PAYSTACK_SECRET_KEY not configured');
    }

    const db = this.supabase.getAdminClient();

    // Fetch the full order
    const { data: order, error } = await db
      .from('popup_orders')
      .select('*, popup_order_items(*)')
      .eq('id', id)
      .single();

    if (error || !order) throw new NotFoundException('Order not found');

    // Only confirmed or completed orders can be refunded
    if (order.status !== 'confirmed' && order.status !== 'completed') {
      throw new BadRequestException(
        `Only confirmed or completed orders can be refunded. Current status: "${order.status}"`,
      );
    }

    // Determine refund amount — default to full order total
    const refundAmount = dto.amount
      ? Math.round(dto.amount * 100) / 100
      : Math.round(Number(order.total) * 100) / 100;

    if (refundAmount <= 0 || refundAmount > Number(order.total)) {
      throw new BadRequestException('Refund amount must be between 0.01 and the order total');
    }

    // ── Paystack refund for MoMo payments ─────────────────────────────────────
    let paystackRefundId: string | null = null;
    let paystackResponse: any = null;

    if (order.payment_method === 'momo' && order.payment_reference) {
      const amountInPesewas = Math.round(refundAmount * 100);

      const response = await fetch('https://api.paystack.co/refund', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.paystackSecretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transaction: order.payment_reference,
          amount: amountInPesewas,
        }),
      });

      paystackResponse = (await response.json()) as any;

      if (!paystackResponse.status) {
        throw new BadRequestException(
          paystackResponse.message || 'Paystack refund request failed',
        );
      }

      paystackRefundId = paystackResponse.data?.id ?? null;
    }

    // ── Record the refund ─────────────────────────────────────────────────────
    const { data: refund, error: refundError } = await db
      .from('popup_refunds')
      .insert({
        order_id: id,
        amount: refundAmount,
        reason: dto.reason || null,
        status: 'processed',
        initiated_by: staffId,
        paystack_refund_id: paystackRefundId,
        paystack_response: paystackResponse,
        sms_sent: false,
      })
      .select()
      .single();

    if (refundError || !refund) {
      throw new InternalServerErrorException('Failed to record refund');
    }

    // ── Update order status to refunded ───────────────────────────────────────
    await db
      .from('popup_orders')
      .update({ status: 'refunded' })
      .eq('id', id);

    // A refunded order should not keep burning a promo use.
    await this.discountEngine
      .revertForOrder('popup_orders', id, `Order ${order.order_number} refunded`)
      .catch((err) =>
        console.error(
          `Failed to revert promo redemption for pop-up ${order.order_number}:`,
          err,
        ),
      );

    // Only a completed order deducted any stock in the first place.
    if (order.status === 'completed') {
      await this.restoreInventory(id, order.order_number);
    }

    // ── Send SMS confirmation to customer ─────────────────────────────────────
    if (order.customer_phone) {
      const customerName = order.customer_name ? `, ${order.customer_name}` : '';
      const message =
        `Hi${customerName}, your refund of GH₵${refundAmount.toFixed(2)} for order ` +
        `${order.order_number} has been processed. Thank you.`;

      const smsResult = await this.letsfish.sendSms(order.customer_phone, message);

      if (smsResult.success) {
        await db
          .from('popup_refunds')
          .update({ sms_sent: true })
          .eq('id', refund.id);
      }
    }

    return refund;
  }

  // ─── Customer: find existing or create new profile ───────────────────────────

  async findOrCreateCustomer(dto: CreatePopupCustomerDto): Promise<{ id: string; isNew: boolean }> {
    if (!dto.email && !dto.phone) {
      throw new BadRequestException('At least an email or phone is required to save a customer');
    }

    const db = this.supabase.getAdminClient();

    // Normalize to E.164 before saving and querying
    const phone = dto.phone ? toE164(dto.phone) : null;

    // Check if a profile already exists with this email or phone (any role)
    let existingQuery = db.from('profiles').select('id');
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

  /**
   * Puts back the stock a completed order took, with a movement row per variant.
   * Shared by the refund path and by cancelling a completed (cash) order.
   */
  private async restoreInventory(orderId: string, orderNumber: string) {
    const db = this.supabase.getAdminClient();
    const { data: items } = await db
      .from('popup_order_items')
      .select('variant_id, quantity')
      .eq('order_id', orderId);

    // Summed per variant for the same reason applyCompletion sums them: two
    // lines on one variant would otherwise read the same `before` and the second
    // write would clobber the first.
    const byVariant = new Map<string, number>();
    for (const item of items ?? []) {
      if (!item.variant_id) continue;
      byVariant.set(
        item.variant_id,
        (byVariant.get(item.variant_id) ?? 0) + item.quantity,
      );
    }

    for (const [variantId, quantity] of byVariant) {
      const { data: variant } = await db
        .from('product_variants')
        .select('inventory_quantity')
        .eq('id', variantId)
        .single();
      if (!variant) continue;

      const before = variant.inventory_quantity ?? 0;
      const after = before + quantity;

      await db
        .from('product_variants')
        .update({ inventory_quantity: after })
        .eq('id', variantId);

      await db.from('inventory_movements').insert({
        variant_id: variantId,
        quantity_change: quantity,
        quantity_before: before,
        quantity_after: after,
        movement_type: 'return',
        notes: `Refund/cancel for pop-up order ${orderNumber}`,
      });
    }
  }
}
