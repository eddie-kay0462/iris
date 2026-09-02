import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PopupSalesService } from './popup-sales.service';

/**
 * Recovers MoMo pop-up orders whose confirmation was missed by both the stand's
 * poll and the Paystack webhook, and cancels the ones that were never paid. All
 * the logic lives in PopupSalesService.reconcileAwaitingPayments — this provider
 * is just the schedule trigger plus an overlap guard. Mirrors
 * WalkinReconciliationCron.
 */
@Injectable()
export class PopupReconciliationCron {
  private readonly logger = new Logger(PopupReconciliationCron.name);
  private running = false;

  constructor(private readonly popupSales: PopupSalesService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handle(): Promise<void> {
    if (this.running) return; // don't let a slow run overlap the next tick
    this.running = true;
    try {
      const { recovered, cancelled } =
        await this.popupSales.reconcileAwaitingPayments();
      if (recovered || cancelled) {
        this.logger.log(
          `Pop-up payment reconciliation: ${recovered} recovered, ${cancelled} cancelled`,
        );
      }
    } catch (err: any) {
      this.logger.error(`Pop-up payment reconciliation failed: ${err.message}`);
    } finally {
      this.running = false;
    }
  }
}
