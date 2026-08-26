import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WalkinSalesService } from './walkin-sales.service';

/**
 * Recovers MoMo walk-ins whose confirmation was missed by both the admin tab's
 * poll and the Paystack webhook, and cancels the ones that were never paid. All
 * the logic lives in WalkinSalesService.reconcileAwaitingPayments — this
 * provider is just the schedule trigger plus an overlap guard.
 */
@Injectable()
export class WalkinReconciliationCron {
  private readonly logger = new Logger(WalkinReconciliationCron.name);
  private running = false;

  constructor(private readonly walkinSales: WalkinSalesService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handle(): Promise<void> {
    if (this.running) return; // don't let a slow run overlap the next tick
    this.running = true;
    try {
      const { recovered, cancelled } =
        await this.walkinSales.reconcileAwaitingPayments();
      if (recovered || cancelled) {
        this.logger.log(
          `Walk-in payment reconciliation: ${recovered} recovered, ${cancelled} cancelled`,
        );
      }
    } catch (err: any) {
      this.logger.error(
        `Walk-in payment reconciliation failed: ${err.message}`,
      );
    } finally {
      this.running = false;
    }
  }
}
