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
};
