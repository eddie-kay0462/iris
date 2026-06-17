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
  orderConfirmation: (orderNumber: string) =>
    `Order #${orderNumber} confirmed! We'll update you on shipping soon.`,
  preorderConfirmation: (orderNumber: string, etaText: string) =>
    `Pre-order #${orderNumber} confirmed! We expect to reach out within ${etaText} once your item is ready. Thank you for pre-ordering with 1NRI.`,
};
