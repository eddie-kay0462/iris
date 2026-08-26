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
  orderConfirmation: (orderNumber: string, trackUrl?: string) =>
    `Order #${orderNumber} confirmed!${trackUrl ? ` Track your order: ${trackUrl}` : ''} We'll update you on shipping soon.`,
  walkinOrderConfirmation: (orderNumber: string) =>
    `Order #${orderNumber} confirmed! Thank you for shopping with us.`,
  preorderConfirmation: (orderNumber: string, etaText: string, trackUrl?: string) =>
    `Pre-order #${orderNumber} confirmed!${trackUrl ? ` Track: ${trackUrl}` : ''} We expect to reach out within ${etaText} once your item is ready. Thank you for pre-ordering with 1NRI.`,

  /**
   * Pop-up collection replaces the "we'll reach out in N days" line — these
   * customers are not waiting on a call, they are coming to a stand on a known
   * date. The order number is repeated in full because it is what staff ask for
   * at the stand.
   */
  pickupPreorderConfirmation: (
    orderNumber: string,
    dateLabel: string,
    location?: string | null,
  ) =>
    `Pre-order #${orderNumber} confirmed! Collect it at our pop-up on ${dateLabel}${location ? `, ${location}` : ''}. Please present your order number ${orderNumber} at the stand to collect. Thank you for pre-ordering with 1NRI.`,

  pickupReminder: (
    orderNumber: string,
    dateLabel: string,
    location?: string | null,
  ) =>
    `Reminder: your 1NRI order #${orderNumber} is ready to collect at our pop-up today, ${dateLabel}${location ? `, ${location}` : ''}. Present your order number ${orderNumber} at the stand to collect. See you there!`,

  pickupCollected: (orderNumber: string) =>
    `Order #${orderNumber} collected. Thank you for shopping with 1NRI - we hope you love it.`,
};
