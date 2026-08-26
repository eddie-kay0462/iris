import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PopupCollectionsService } from './popup-collections.service';

/** Ghana is UTC+0 year-round, so the UTC hour is the local hour. */
const EARLIEST_SEND_HOUR = 7;

/**
 * Sends the "your collection is today" nudge on the morning of each pop-up.
 *
 * Runs hourly rather than once at a fixed hour so a deploy or restart during
 * the small hours cannot skip a day's reminders entirely — but it holds off
 * until 7am so nobody is woken by a text at midnight. Sending is guarded by
 * `orders.pickup_reminder_sent_at`, so once the day's batch is out the
 * remaining ticks are no-ops.
 */
@Injectable()
export class PopupPickupReminderCron {
  private readonly logger = new Logger(PopupPickupReminderCron.name);
  private running = false;

  constructor(private readonly collections: PopupCollectionsService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handle(): Promise<void> {
    if (this.running) return;
    if (new Date().getUTCHours() < EARLIEST_SEND_HOUR) return;
    this.running = true;
    try {
      const { sent } = await this.collections.sendDueReminders();
      if (sent) {
        this.logger.log(`Pop-up collection reminders sent: ${sent}`);
      }
    } catch (err: any) {
      this.logger.error(`Pop-up collection reminders failed: ${err.message}`);
    } finally {
      this.running = false;
    }
  }
}
