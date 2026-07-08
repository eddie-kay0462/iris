import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { OrdersService } from '../orders/orders.service';
import { SupabaseService } from '../common/supabase/supabase.service';
import { PopupSalesService } from '../popup-sales/popup-sales.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class PaymentsService {
  private secretKey: string;

  constructor(
    private configService: ConfigService,
    private ordersService: OrdersService,
    private supabase: SupabaseService,
    private popupSalesService: PopupSalesService,
    private emailService: EmailService,
  ) {
    this.secretKey = this.configService.get<string>(
      'PAYSTACK_SECRET_KEY',
      '',
    );
  }

  verifyWebhookSignature(body: string, signature: string): boolean {
    if (!this.secretKey) {
      throw new Error('PAYSTACK_SECRET_KEY not configured');
    }
    const hash = createHmac('sha512', this.secretKey)
      .update(body)
      .digest('hex');
    return hash === signature;
  }

  async handleWebhook(event: any): Promise<{ ok: boolean }> {
    const eventType = event?.event;
    console.log('Paystack webhook event:', eventType);

    if (eventType === 'charge.success') {
      const reference = event?.data?.reference;
      if (reference) {
        // Try popup order first
        const confirmedPopup = await this.popupSalesService.confirmByReference(reference);
        if (!confirmedPopup) {
          // Try ally sale by payment_reference (MoMo) or customer_code (virtual account)
          const confirmedAlly = await this.confirmAllySaleByReference(
            reference,
            event?.data?.customer?.customer_code,
          );
          if (!confirmedAlly) {
            await this.ordersService.confirmPayment(reference);
          }
        }
      }
    }

    return { ok: true };
  }

  private async confirmAllySaleByReference(
    reference: string,
    customerCode?: string,
  ): Promise<boolean> {
    const db = this.supabase.getAdminClient();

    // Match by MoMo payment_reference
    const { data: byRef } = await db
      .from('ally_sales')
      .update({ status: 'completed', payment_reference: reference })
      .eq('payment_reference', reference)
      .eq('status', 'awaiting_payment')
      .select('id, customer_email, customer_name, order_number, subtotal, total, brand')
      .maybeSingle();

    if (byRef) {
      void this.sendAllySaleEmail(byRef);
      return true;
    }

    // Match by virtual account customer_code
    if (customerCode) {
      const { data: byCustomer } = await db
        .from('ally_sales')
        .update({ status: 'completed', payment_reference: reference })
        .eq('paystack_customer_code', customerCode)
        .eq('status', 'awaiting_payment')
        .select('id, customer_email, customer_name, order_number, subtotal, total, brand')
        .maybeSingle();

      if (byCustomer) {
        void this.sendAllySaleEmail(byCustomer);
        return true;
      }
    }

    return false;
  }

  private async sendAllySaleEmail(sale: {
    id: string;
    customer_email: string | null;
    customer_name: string | null;
    order_number: string;
    subtotal: number;
    total: number;
    brand: string;
  }): Promise<void> {
    if (!sale.customer_email) return;
    const db = this.supabase.getAdminClient();
    const { data: items } = await db
      .from('ally_sale_items')
      .select('product_name, variant_title, quantity, total_price')
      .eq('sale_id', sale.id);

    await this.emailService.sendAllySaleConfirmation({
      email: sale.customer_email,
      customer_name: sale.customer_name,
      order_number: sale.order_number,
      subtotal: Number(sale.subtotal),
      total: Number(sale.total),
      currency: 'GHS',
      brand: sale.brand,
      items: (items || []).map((i) => ({
        product_name: i.product_name,
        variant_title: i.variant_title ?? null,
        quantity: i.quantity,
        total_price: Number(i.total_price),
      })),
    });
  }

  async findAdminPayments(query: {
    search?: string;
    status?: string;
    page?: string;
    limit?: string;
  }) {
    const db = this.supabase.getAdminClient();
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '20', 10);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let q = db
      .from('orders')
      .select(
        'id, order_number, email, total, currency, payment_provider, payment_reference, payment_status, status, created_at',
        { count: 'exact' },
      )
      .is('deleted_at', null)
      .not('payment_reference', 'is', null);

    if (query.status) {
      q = q.eq('payment_status', query.status);
    }
    if (query.search) {
      q = q.or(
        `order_number.ilike.%${query.search}%,email.ilike.%${query.search}%,payment_reference.ilike.%${query.search}%`,
      );
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

  async getPaymentStats() {
    const db = this.supabase.getAdminClient();

    const { data: all } = await db
      .from('orders')
      .select('total, payment_status, currency')
      .is('deleted_at', null)
      .not('payment_reference', 'is', null);

    const rows = all || [];

    const totalCollected = rows
      .filter((r) => r.payment_status === 'paid')
      .reduce((sum, r) => sum + Number(r.total), 0);

    const totalPending = rows
      .filter((r) => r.payment_status === 'pending')
      .reduce((sum, r) => sum + Number(r.total), 0);

    const totalRefunded = rows
      .filter((r) => r.payment_status === 'refunded')
      .reduce((sum, r) => sum + Number(r.total), 0);

    // Value of pre-orders still awaiting fulfillment (both online and popup).
    // This is money owed to the customer as product — surfaced as its own card
    // so the pending picture isn't limited to unpaid order balances.
    const { data: preorders } = await db
      .from('preorders')
      .select('status, unit_price, quantity');

    const preordersPending = (preorders || [])
      .filter((r) => r.status === 'pending' || r.status === 'stock_held')
      .reduce((sum, r) => sum + Number(r.unit_price) * r.quantity, 0);

    return {
      totalCollected,
      totalPending,
      totalRefunded,
      preordersPending,
      transactionCount: rows.length,
    };
  }
}
