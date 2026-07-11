import { Injectable, BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../common/supabase/supabase.service';
import { LetsfishService } from '../letsfish/letsfish.service';
import { EmailService } from '../email/email.service';
import { SettingsService } from '../settings/settings.service';
import { SMS_TEMPLATES } from '../sms/sms.service';
import { toE164 } from '../common/utils/phone';
import { CreatePreorderDto, PreorderItemDto } from './dto/create-preorder.dto';
import { CreatePopupPreorderDto } from './dto/create-popup-preorder.dto';
import { QueryPreordersDto } from './dto/query-preorders.dto';
import { RefundPreorderDto } from './dto/refund-preorder.dto';
import { RestockPreorderDto } from './dto/restock-preorder.dto';

@Injectable()
export class PreordersService {
  private readonly paystackSecretKey: string;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly configService: ConfigService,
    private readonly letsfish: LetsfishService,
    private readonly emailService: EmailService,
    private readonly settingsService: SettingsService,
  ) {
    this.paystackSecretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY', '');
  }

  private async generateOrderNumber(): Promise<string> {
    const db = this.supabase.getAdminClient();
    const { data } = await db
      .from('preorders')
      .select('order_number')
      .order('created_at', { ascending: false })
      .limit(1);
    let next = 1;
    if (data && data.length > 0) {
      const match = data[0].order_number.match(/PRE-(\d+)/);
      if (match) next = parseInt(match[1], 10) + 1;
    }
    // Floor at the configured start so preorder numbers match the clean
    // high-number scheme used for online orders.
    const start = await this.settingsService.getPreorderNumberStart();
    next = Math.max(next, start);
    return `PRE-${String(next).padStart(6, '0')}`;
  }

  private async checkEligibility(
    item: PreorderItemDto,
    customer: { userId: string | null; email: string | null },
  ): Promise<{ variant: any; expectedPrice: number }> {
    const db = this.supabase.getAdminClient();

    const { data: variant, error: varErr } = await db
      .from('product_variants')
      .select('id, inventory_quantity, preorder_enabled, preorder_limit, sku, price, products(title, status, deleted_at)')
      .eq('id', item.variantId)
      .single();

    if (varErr || !variant) throw new BadRequestException('Variant not found');
    const product = (variant.products as any) || {};
    if (product.status !== 'active' || product.deleted_at) {
      throw new BadRequestException('This item is no longer available');
    }
    if (!variant.preorder_enabled) throw new BadRequestException('Pre-orders are not enabled for this item');

    const expectedPrice = Number(variant.price);
    if (Math.abs(expectedPrice - Number(item.price)) > 0.01) {
      throw new BadRequestException('Price mismatch. Please refresh and try again.');
    }

    if (variant.preorder_limit !== null) {
      const { count } = await db
        .from('preorders')
        .select('*', { count: 'exact', head: true })
        .eq('variant_id', item.variantId)
        .in('status', ['pending', 'stock_held']);
      if ((count ?? 0) + item.quantity > variant.preorder_limit) {
        throw new BadRequestException(`Pre-orders for this item are full (limit: ${variant.preorder_limit})`);
      }
    }

    // One active pre-order per customer per variant. Keyed on user_id for
    // signed-in shoppers, else on customer_email so guest pre-orders are
    // still de-duplicated.
    if (customer.userId || customer.email) {
      let q = db
        .from('preorders')
        .select('*', { count: 'exact', head: true })
        .eq('variant_id', item.variantId)
        .in('status', ['pending', 'stock_held']);
      q = customer.userId
        ? q.eq('user_id', customer.userId)
        : q.ilike('customer_email', customer.email!);
      const { count: customerCount } = await q;
      if ((customerCount ?? 0) > 0) {
        throw new BadRequestException('You already have an active pre-order for this item.');
      }
    }

    return { variant, expectedPrice };
  }

  async checkEligibilityPublic(item: PreorderItemDto, userId: string): Promise<{ eligible: true }> {
    await this.checkEligibility(item, { userId, email: null });
    return { eligible: true };
  }

  /**
   * Validate a batch of pre-order lines coming through the normal checkout flow
   * (out-of-stock-but-preorderable items). Runs the same eligibility rules as a
   * standalone pre-order — enforcing limits, price match, and the one-active-per
   * -customer guard — WITHOUT inserting anything, so the caller can validate up
   * front and avoid creating an orphan order if a line is ineligible.
   */
  async validatePreorderItems(
    items: { variantId: string; productTitle?: string; variantTitle?: string | null; quantity: number; price: number }[],
    customer: { userId: string | null; email: string | null },
  ): Promise<
    { variantId: string; productName: string; variantTitle: string | null; quantity: number; unitPrice: number }[]
  > {
    const validated: { variantId: string; productName: string; variantTitle: string | null; quantity: number; unitPrice: number }[] = [];
    for (const item of items) {
      const { variant, expectedPrice } = await this.checkEligibility(
        {
          variantId: item.variantId,
          quantity: item.quantity,
          price: item.price,
          productTitle: item.productTitle,
          variantTitle: item.variantTitle ?? undefined,
        } as PreorderItemDto,
        customer,
      );
      validated.push({
        variantId: item.variantId,
        productName: (variant.products as any)?.title ?? item.productTitle ?? 'Item',
        variantTitle: item.variantTitle ?? null,
        quantity: item.quantity,
        unitPrice: expectedPrice,
      });
    }
    return validated;
  }

  /**
   * Insert pre-order rows for the pre-order portion of a checkout, linked back to
   * the paid order that acts as their payment + shipping container. Customer name
   * and phone are copied from the order's shipping address so the restock →
   * allocate SMS flow can reach the shopper (works for guests too).
   */
  async insertPreordersForOrder(
    order: { id: string; payment_reference: string | null; email: string; user_id: string | null; shipping_address: any },
    lines: { variantId: string; productName: string; variantTitle: string | null; quantity: number; unitPrice: number }[],
  ): Promise<any[]> {
    const db = this.supabase.getAdminClient();
    const addr = (order.shipping_address as any) || {};
    const customerName = addr.fullName ?? null;
    const customerPhone = addr.phone ? (toE164(addr.phone) ?? addr.phone) : null;

    const created: any[] = [];
    for (const line of lines) {
      const orderNumber = await this.generateOrderNumber();
      const { data: preorder, error } = await db
        .from('preorders')
        .insert({
          order_number: orderNumber,
          source: 'online',
          order_id: order.id,
          user_id: order.user_id,
          customer_email: order.email,
          customer_name: customerName,
          customer_phone: customerPhone,
          variant_id: line.variantId,
          product_name: line.productName,
          variant_title: line.variantTitle,
          quantity: line.quantity,
          unit_price: line.unitPrice,
          payment_method: 'paystack',
          payment_reference: order.payment_reference,
          // 'awaiting' until the shared payment is confirmed. The preorders
          // payment_status CHECK constraint only allows awaiting/paid/refunded.
          payment_status: 'awaiting',
          status: 'pending',
        })
        .select()
        .single();
      if (error || !preorder) throw new InternalServerErrorException('Failed to record pre-order');
      created.push(preorder);
    }
    return created;
  }

  /**
   * Mark this order's linked pre-orders as paid and fire their confirmation
   * notifications. Called from OrdersService.confirmPayment once the shared
   * payment is confirmed. Only flips rows still `pending` so it's idempotent
   * across the frontend success callback + Paystack webhook.
   */
  async markOrderPreordersPaid(orderId: string): Promise<void> {
    const db = this.supabase.getAdminClient();
    const { data: linked } = await db
      .from('preorders')
      .select('*')
      .eq('order_id', orderId)
      .eq('payment_status', 'awaiting');

    for (const preorder of linked || []) {
      await db
        .from('preorders')
        .update({ payment_status: 'paid', updated_at: new Date().toISOString() })
        .eq('id', preorder.id);
      this.sendPreorderNotifications({ ...preorder, payment_status: 'paid' }).catch(() => {});
    }
  }

  async create(dto: CreatePreorderDto, userId: string, email: string) {
    const db = this.supabase.getAdminClient();

    const { variant, expectedPrice } = await this.checkEligibility(dto.item, { userId, email });

    const { data: existingRef } = await db
      .from('preorders')
      .select('id')
      .eq('payment_reference', dto.paymentReference)
      .maybeSingle();
    if (existingRef) throw new BadRequestException('Payment reference already used');

    const orderNumber = await this.generateOrderNumber();
    const productTitle = (variant.products as any)?.title ?? dto.item.productTitle;

    const { data: preorder, error } = await db
      .from('preorders')
      .insert({
        order_number: orderNumber,
        source: 'online',
        user_id: userId,
        customer_email: email,
        variant_id: dto.item.variantId,
        product_name: productTitle,
        variant_title: dto.item.variantTitle ?? null,
        quantity: dto.item.quantity,
        unit_price: expectedPrice,
        payment_method: 'paystack',
        payment_reference: dto.paymentReference,
        payment_status: 'paid',
        status: 'pending',
        notes: dto.notes ?? null,
      })
      .select()
      .single();

    if (error || !preorder) throw new InternalServerErrorException('Failed to create preorder');

    this.sendPreorderNotifications(preorder, dto.notify).catch(() => {});

    return preorder;
  }

  async sendPreorderNotifications(
    preorder: { id: string; order_number: string; customer_email: string | null; customer_name?: string | null; customer_phone?: string | null; user_id: string | null; product_name: string; variant_title: string | null; quantity: number; unit_price: number; payment_method: string; payment_status: string },
    notify?: { email?: boolean; sms?: boolean },
  ): Promise<void> {
    const etaText = await this.settingsService.getPreorderEtaText();
    const db = this.supabase.getAdminClient();

    if (notify?.email !== false && preorder.customer_email) {
      const items = [
        {
          product_name: preorder.product_name,
          variant_title: preorder.variant_title,
          quantity: preorder.quantity,
          price: preorder.unit_price,
        },
      ];
      await this.emailService.sendPreorderConfirmation({
        email: preorder.customer_email,
        customer_name: preorder.customer_name ?? null,
        order_number: preorder.order_number,
        items,
        payment_method: preorder.payment_method,
        payment_status: preorder.payment_status,
        etaText,
      });

      // Fulfilment notification to orders@1nri.store — fire and forget so a
      // staff-mail failure never blocks the customer confirmation.
      this.emailService
        .sendStaffPreorderNotification({
          order_number: preorder.order_number,
          email: preorder.customer_email,
          customer_name: preorder.customer_name ?? null,
          customer_phone: preorder.customer_phone ?? null,
          payment_status: preorder.payment_status,
          etaText,
          items: [
            {
              product_name: preorder.product_name,
              variant_title: preorder.variant_title,
              quantity: preorder.quantity,
              unit_price: preorder.unit_price,
            },
          ],
        })
        .catch(() => {});
    }

    // Resolve the customer's phone: prefer the number captured at checkout,
    // then fall back to the account profile (mirrors sendConfirmation).
    if (notify?.sms !== false) {
      let phone = preorder.customer_phone ?? null;
      if (!phone && preorder.user_id) {
        const { data: profile } = await db
          .from('profiles')
          .select('phone_number')
          .eq('id', preorder.user_id)
          .single();
        phone = profile?.phone_number ?? null;
      }
      if (phone) {
        await this.letsfish.sendSms(
          phone,
          SMS_TEMPLATES.preorderConfirmation(preorder.order_number, etaText),
        );
      }
    }
  }

  async createPopup(
    dto: CreatePopupPreorderDto,
    adminId: string,
    source: 'popup' | 'walkin' = 'popup',
  ) {
    const db = this.supabase.getAdminClient();

    if (dto.event_id) {
      const { data: event, error: eventError } = await db
        .from('popup_events')
        .select('id, status')
        .eq('id', dto.event_id)
        .single();
      if (eventError || !event) throw new BadRequestException('Event not found');
      if (event.status === 'closed') throw new BadRequestException('This event is closed and cannot accept new orders');
    }

    const orderNumber = await this.generateOrderNumber();
    const results = [];
    const preorderVendors: string[] = [];

    for (const item of dto.items) {
      const { data: variant, error: varErr } = await db
        .from('product_variants')
        .select('id, preorder_enabled, preorder_limit, products(title, vendor)')
        .eq('id', item.variantId)
        .single();

      if (varErr || !variant) throw new BadRequestException(`Variant ${item.variantId} not found`);
      if (!variant.preorder_enabled) {
        const title = (variant.products as any)?.title ?? item.variantId;
        throw new BadRequestException(`Pre-orders are not enabled for ${title}`);
      }

      if (variant.preorder_limit !== null) {
        const { count } = await db
          .from('preorders')
          .select('*', { count: 'exact', head: true })
          .eq('variant_id', item.variantId)
          .in('status', ['pending', 'stock_held']);
        if ((count ?? 0) + item.quantity > variant.preorder_limit) {
          throw new BadRequestException(
            `Pre-orders for this item are full (limit: ${variant.preorder_limit}, current: ${count})`,
          );
        }
      }

      const productTitle = (variant.products as any)?.title ?? item.productTitle;
      const { data: preorder, error } = await db
        .from('preorders')
        .insert({
          order_number: orderNumber,
          source,
          customer_name: dto.customer_name ?? null,
          customer_email: dto.customer_email ?? null,
          customer_phone: dto.customer_phone,
          variant_id: item.variantId,
          product_name: productTitle,
          variant_title: item.variantTitle ?? null,
          quantity: item.quantity,
          unit_price: item.price,
          payment_method: dto.payment_method ?? 'pending',
          payment_reference: dto.payment_reference ?? null,
          payment_status: dto.payment_method && dto.payment_method !== 'pending' ? 'paid' : 'awaiting',
          status: 'pending',
          notes: dto.notes ?? null,
          popup_event_id: dto.event_id ?? null,
        })
        .select()
        .single();

      if (error || !preorder) throw new InternalServerErrorException(`Failed to create preorder for variant ${item.variantId}`);
      results.push(preorder);
    }

    if (dto.customer_email && results.length > 0) {
      const isPaid = !!(dto.payment_method && dto.payment_method !== 'pending');
      const etaText = await this.settingsService.getPreorderEtaText();
      this.emailService.sendPopupPreorderConfirmation({
        email: dto.customer_email,
        customer_name: dto.customer_name ?? null,
        order_number: orderNumber,
        items: dto.items.map((i) => ({
          product_name: i.productTitle,
          variant_title: i.variantTitle ?? null,
          quantity: i.quantity,
          price: i.price,
        })),
        payment_method: dto.payment_method ?? null,
        payment_status: isPaid ? 'paid' : 'awaiting',
        etaText,
      }).catch(() => {});
    }

    return results;
  }

  async findMyPreorders(userId: string) {
    const db = this.supabase.getAdminClient();
    const { data, error } = await db
      .from('preorders')
      .select('*, product_variants(option1_value, option2_value, option3_value, product_images!product_images_variant_id_fkey(src))')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  async findAll(query: QueryPreordersDto) {
    const db = this.supabase.getAdminClient();
    const page = parseInt(query.page ?? '1', 10);
    const limit = parseInt(query.limit ?? '30', 10);
    const from = (page - 1) * limit;

    let q = db
      .from('preorders')
      .select('*, product_variants(sku, option1_value, option2_value, option3_value)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1);

    if (query.status) q = q.eq('status', query.status);
    if (query.variant_id) q = q.eq('variant_id', query.variant_id);
    if (query.event_id) q = q.eq('popup_event_id', query.event_id);
    if (query.source) q = q.eq('source', query.source);

    const { data, count, error } = await q;
    if (error) throw error;

    return {
      data: data ?? [],
      total: count ?? 0,
      page,
      limit,
      totalPages: Math.ceil((count ?? 0) / limit),
    };
  }

  async getStats() {
    const db = this.supabase.getAdminClient();
    const { data, error } = await db.from('preorders').select('status, unit_price, quantity');
    if (error) throw error;

    const rows = data ?? [];
    return {
      pending: rows.filter((r) => r.status === 'pending').length,
      stock_held: rows.filter((r) => r.status === 'stock_held').length,
      fulfilled: rows.filter((r) => r.status === 'fulfilled').length,
      cancelled: rows.filter((r) => r.status === 'cancelled').length,
      refunded: rows.filter((r) => r.status === 'refunded').length,
      totalValue: rows
        .filter((r) => !['cancelled', 'refunded'].includes(r.status))
        .reduce((s, r) => s + Number(r.unit_price) * r.quantity, 0),
    };
  }

  async findOne(id: string) {
    const db = this.supabase.getAdminClient();
    const { data, error } = await db.from('preorders').select('*').eq('id', id).single();
    if (error || !data) throw new NotFoundException('Preorder not found');
    return data;
  }

  async sendConfirmation(id: string, channels: ('email' | 'sms')[]): Promise<{ sent: ('email' | 'sms')[] }> {
    const preorder = await this.findOne(id);
    const etaText = await this.settingsService.getPreorderEtaText();
    const sent: ('email' | 'sms')[] = [];

    if (channels.includes('email')) {
      const email = preorder.customer_email;
      if (!email) throw new BadRequestException('This pre-order has no email on file');
      await this.emailService.sendPreorderConfirmation({
        email,
        customer_name: preorder.customer_name,
        order_number: preorder.order_number,
        items: [
          {
            product_name: preorder.product_name,
            variant_title: preorder.variant_title,
            quantity: preorder.quantity,
            price: preorder.unit_price,
          },
        ],
        payment_method: preorder.payment_method,
        payment_status: preorder.payment_status,
        etaText,
      });
      sent.push('email');
    }

    if (channels.includes('sms')) {
      let phone = preorder.customer_phone as string | null;
      if (!phone && preorder.user_id) {
        const db = this.supabase.getAdminClient();
        const { data: profile } = await db
          .from('profiles')
          .select('phone_number')
          .eq('id', preorder.user_id)
          .single();
        phone = profile?.phone_number ?? null;
      }
      if (!phone) throw new BadRequestException('This pre-order has no phone number on file');
      await this.letsfish.sendSms(phone, SMS_TEMPLATES.preorderConfirmation(preorder.order_number, etaText));
      sent.push('sms');
    }

    return { sent };
  }

  async cancel(id: string) {
    const db = this.supabase.getAdminClient();
    const { data: preorder, error } = await db.from('preorders').select('*').eq('id', id).single();
    if (error || !preorder) throw new NotFoundException('Preorder not found');
    if (['cancelled', 'fulfilled', 'refunded'].includes(preorder.status)) {
      throw new BadRequestException(`Cannot cancel a preorder with status "${preorder.status}"`);
    }
    await db
      .from('preorders')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', id);
    return this.findOne(id);
  }

  async fulfill(id: string) {
    const db = this.supabase.getAdminClient();
    const { data: preorder, error } = await db.from('preorders').select('*').eq('id', id).single();
    if (error || !preorder) throw new NotFoundException('Preorder not found');
    if (preorder.status !== 'stock_held') {
      throw new BadRequestException(
        `Only stock-held preorders can be fulfilled (current status "${preorder.status}")`,
      );
    }
    await db
      .from('preorders')
      .update({ status: 'fulfilled', updated_at: new Date().toISOString() })
      .eq('id', id);
    return this.findOne(id);
  }

  async restock(variantId: string, dto: RestockPreorderDto) {
    const db = this.supabase.getAdminClient();

    const { data: variant, error: varErr } = await db
      .from('product_variants')
      .select('id, inventory_quantity, sku')
      .eq('id', variantId)
      .single();
    if (varErr || !variant) throw new NotFoundException('Variant not found');

    const currentQty = variant.inventory_quantity ?? 0;
    const newQty = currentQty + dto.quantity;

    await db
      .from('product_variants')
      .update({ inventory_quantity: newQty, updated_at: new Date().toISOString() })
      .eq('id', variantId);

    await db.from('inventory_movements').insert({
      variant_id: variantId,
      quantity_change: dto.quantity,
      quantity_before: currentQty,
      quantity_after: newQty,
      movement_type: 'restock',
      notes: `Restock for preorders (${dto.quantity} units added)`,
    });

    // FIFO: allocate to oldest pending preorders first
    const { data: pending } = await db
      .from('preorders')
      .select('id, quantity, customer_phone, customer_email, customer_name, product_name, order_number')
      .eq('variant_id', variantId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    let remaining = newQty;
    let priority = 1;
    const held: typeof pending = [];

    for (const p of pending ?? []) {
      if (remaining < p.quantity) break;
      remaining -= p.quantity;
      held.push(p);
      await db.from('preorders').update({
        status: 'stock_held',
        priority,
        notified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', p.id);
      priority++;
    }

    await db.from('product_variants').update({ inventory_quantity: remaining }).eq('id', variantId);

    // Send SMS to allocated customers
    for (const p of held) {
      if (!p.customer_phone) continue;
      const name = p.customer_name ? `, ${p.customer_name.split(' ')[0]}` : '';
      const message =
        `Great news${name}! Your pre-order (${p.order_number}) for ` +
        `"${p.product_name}" is confirmed and ready. Our team will be in touch. Thank you for pre-ordering with 1NRI.`;
      await this.letsfish.sendSms(p.customer_phone, message);
    }

    return {
      variant_id: variantId,
      quantity_added: dto.quantity,
      preorders_held: held.length,
      remaining_stock: remaining,
    };
  }

  async refund(id: string, dto: RefundPreorderDto, staffId: string) {
    if (!this.paystackSecretKey) {
      throw new InternalServerErrorException('PAYSTACK_SECRET_KEY not configured');
    }

    const db = this.supabase.getAdminClient();
    const { data: preorder, error } = await db.from('preorders').select('*').eq('id', id).single();
    if (error || !preorder) throw new NotFoundException('Preorder not found');

    if (!['pending', 'stock_held'].includes(preorder.status)) {
      throw new BadRequestException(
        `Only pending or stock_held preorders can be refunded. Current: "${preorder.status}"`,
      );
    }

    const refundAmount = dto.amount
      ? Math.round(dto.amount * 100) / 100
      : Math.round(Number(preorder.unit_price) * preorder.quantity * 100) / 100;

    if (refundAmount <= 0) throw new BadRequestException('Refund amount must be positive');

    let paystackRefundId: string | null = null;
    let paystackResponse: any = null;

    if (preorder.payment_status === 'paid' && preorder.payment_reference) {
      const response = await fetch('https://api.paystack.co/refund', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.paystackSecretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transaction: preorder.payment_reference,
          amount: Math.round(refundAmount * 100),
        }),
      });
      paystackResponse = await response.json();
      if (!paystackResponse.status) {
        throw new BadRequestException(paystackResponse.message ?? 'Paystack refund request failed');
      }
      paystackRefundId = paystackResponse.data?.id ?? null;
    }

    const { data: refund, error: refundError } = await db
      .from('preorder_refunds')
      .insert({
        preorder_id: id,
        amount: refundAmount,
        reason: dto.reason ?? null,
        status: 'processed',
        initiated_by: staffId,
        paystack_refund_id: paystackRefundId,
        paystack_response: paystackResponse,
        sms_sent: false,
      })
      .select()
      .single();

    if (refundError || !refund) throw new InternalServerErrorException('Failed to record refund');

    await db
      .from('preorders')
      .update({ status: 'refunded', payment_status: 'refunded', updated_at: new Date().toISOString() })
      .eq('id', id);

    // Restore inventory if stock was held
    if (preorder.status === 'stock_held') {
      const { data: variant } = await db
        .from('product_variants')
        .select('inventory_quantity')
        .eq('id', preorder.variant_id)
        .single();
      if (variant) {
        const restoredQty = (variant.inventory_quantity ?? 0) + preorder.quantity;
        await db.from('product_variants').update({ inventory_quantity: restoredQty }).eq('id', preorder.variant_id);
        await db.from('inventory_movements').insert({
          variant_id: preorder.variant_id,
          quantity_change: preorder.quantity,
          quantity_before: variant.inventory_quantity ?? 0,
          quantity_after: restoredQty,
          movement_type: 'return',
          notes: `Refunded preorder ${preorder.order_number}`,
        });
      }
    }

    // SMS notification
    if (preorder.customer_phone) {
      const name = preorder.customer_name ? `, ${preorder.customer_name.split(' ')[0]}` : '';
      const message =
        `Hi${name}, your pre-order refund of GH₵${refundAmount.toFixed(2)} ` +
        `for order ${preorder.order_number} has been processed. Thank you.`;
      const smsResult = await this.letsfish.sendSms(preorder.customer_phone, message);
      if (smsResult.success) {
        await db.from('preorder_refunds').update({ sms_sent: true }).eq('id', refund.id);
      }
    }

    return refund;
  }
}
