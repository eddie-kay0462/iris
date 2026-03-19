import { Injectable } from '@nestjs/common';
import { LetsfishService } from '../letsfish/letsfish.service';

@Injectable()
export class SmsService {
  constructor(private letsfishService: LetsfishService) {}

  async sendSMS(to: string, message: string): Promise<{ success: boolean }> {
    return this.letsfishService.sendSms(to, message);
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
