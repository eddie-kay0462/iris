import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AnalyticsService } from './analytics.service';

/**
 * Drives abandoned-checkout recovery: every few minutes it reconciles carts
 * that have since converted and emails one-time reminders for carts that have
 * gone idle. All the data/email work lives in AnalyticsService — this provider
 * is just the schedule trigger plus an overlap guard.
 */
@Injectable()
export class AbandonedCheckoutCron {
  private readonly logger = new Logger(AbandonedCheckoutCron.name);
  private running = false;

  constructor(private readonly analytics: AnalyticsService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handle(): Promise<void> {
    if (this.running) return; // don't let a slow run overlap the next tick
    this.running = true;
    try {
      const { reminded, recovered } = await this.analytics.runAbandonedCheckoutRecovery();
      if (reminded || recovered) {
        this.logger.log(
          `Abandoned-checkout recovery: ${reminded} reminder(s) sent, ${recovered} recovered`,
        );
      }
    } catch (err: any) {
      this.logger.error(`Abandoned-checkout recovery failed: ${err.message}`);
    } finally {
      this.running = false;
    }
  }
}
