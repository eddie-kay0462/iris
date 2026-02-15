import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { OrdersService } from '../orders/orders.service';
import { SupabaseService } from '../common/supabase/supabase.service';

@Injectable()
export class PaymentsService {
  private secretKey: string;

  constructor(
    private configService: ConfigService,
    private ordersService: OrdersService,
    private supabase: SupabaseService,
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
        await this.ordersService.confirmPayment(reference);
      }
    }

    return { ok: true };
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

    return {
      totalCollected,
      totalPending,
      totalRefunded,
      transactionCount: rows.length,
    };
  }
}
