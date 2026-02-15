import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type TermiiResponse = {
  message: string;
  message_id?: string;
  code?: string;
  balance?: number;
  user?: string;
};

@Injectable()
export class SmsService {
  private apiKey: string;
  private senderId: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('SMS_PROVIDER_API_KEY', '');
    this.senderId = this.configService.get<string>('SMS_SENDER_ID', '');
  }

  async sendSMS(to: string, message: string): Promise<TermiiResponse> {
    if (!this.apiKey || !this.senderId) {
      throw new Error('SMS_PROVIDER_API_KEY and SMS_SENDER_ID must be set');
    }

    const response = await fetch('https://api.ng.termii.com/api/sms/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to,
        from: this.senderId,
        sms: message,
        type: 'plain',
        channel: 'generic',
        api_key: this.apiKey,
      }),
    });

    if (!response.ok) {
      throw new Error(`Termii error: ${response.status}`);
    }

    return (await response.json()) as TermiiResponse;
  }
}

export const SMS_TEMPLATES = {
  waitlistConfirmation: (name: string) =>
    `Hi ${name}! You're on the 1NRI Inner Circle waitlist. We'll notify you when a spot opens. Welcome to the journey.`,
  invitation: (name: string, link: string) =>
    `${name}, your Inner Circle invitation is ready! Complete enrollment here: ${link} (expires in 48hrs)`,
  subscriptionConfirmed: (name: string, tier: string) =>
    `Welcome to Inner Circle, ${name}! Your ${tier} membership is active. Start shopping at inner-circle prices now.`,
  orderConfirmation: (orderNumber: string) =>
    `Order #${orderNumber} confirmed! We'll update you on shipping soon.`,
};
