import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';

@Injectable()
export class PaymentsService {
  private secretKey: string;

  constructor(private configService: ConfigService) {
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
    // Stub — will be expanded when order flow is built
    console.log('Paystack webhook event:', event?.event);
    return { ok: true };
  }
}
