import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { OrdersService } from '../orders/orders.service';

@Injectable()
export class PaymentsService {
  private secretKey: string;

  constructor(
    private configService: ConfigService,
    private ordersService: OrdersService,
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
}
