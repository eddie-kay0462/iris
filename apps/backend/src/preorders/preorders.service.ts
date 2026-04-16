import { Injectable, BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../common/supabase/supabase.service';
import { LetsfishService } from '../letsfish/letsfish.service';
import { CreatePreorderDto } from './dto/create-preorder.dto';
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
    return `PRE-${String(next).padStart(6, '0')}`;
  }

  async create(dto: CreatePreorderDto, userId: string, email: string) {
    const db = this.supabase.getAdminClient();

    const { data: variant, error: varErr } = await db
      .from('product_variants')
      .select('id, inventory_quantity, preorder_enabled, preorder_limit, sku, products(title)')
      .eq('id', dto.item.variantId)
      .single();

    if (varErr || !variant) throw new BadRequestException('Variant not found');
    if (!variant.preorder_enabled) throw new BadRequestException('Pre-orders are not enabled for this item');

    if (variant.preorder_limit !== null) {
      const { count } = await db
        .from('preorders')
        .select('*', { count: 'exact', head: true })
        .eq('variant_id', dto.item.variantId)
        .in('status', ['pending', 'stock_held']);
      if ((count ?? 0) >= variant.preorder_limit) {
        throw new BadRequestException(`Pre-orders for this item are full (limit: ${variant.preorder_limit})`);
      }
    }

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
        unit_price: dto.item.price,
        payment_method: 'paystack',
        payment_reference: dto.paymentReference,
        payment_status: 'paid',
        status: 'pending',
        notes: dto.notes ?? null,
      })
      .select()
      .single();

    if (error || !preorder) throw new InternalServerErrorException('Failed to create preorder');
    return preorder;
  }

  async createPopup(dto: CreatePopupPreorderDto, adminId: string) {
    const db = this.supabase.getAdminClient();
    const orderNumber = await this.generateOrderNumber();
    const results = [];

    for (const item of dto.items) {
      const { data: variant, error: varErr } = await db
        .from('product_variants')
        .select('id, preorder_enabled, preorder_limit, products(title)')
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
          source: 'popup',
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
        })
        .select()
        .single();

      if (error || !preorder) throw new InternalServerErrorException(`Failed to create preorder for variant ${item.variantId}`);
      results.push(preorder);
    }

    return results;
  }

  async findMyPreorders(userId: string) {
    const db = this.supabase.getAdminClient();
    const { data, error } = await db
      .from('preorders')
      .select('*, product_variants(option1_value, option2_value, option3_value, product_images(src))')
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
