import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OrdersService } from './orders.service';

/**
 * Reconciles never-paid pending online orders against Paystack: recovers sales
 * whose confirmation (client callback + webhook) was missed, and soft-deletes
 * dead abandoned attempts once they age out. All the logic lives in
 * OrdersService.reconcilePendingOrders — this provider is just the schedule
 * trigger plus an overlap guard.
 */
@Injectable()
export class OrdersReconciliationCron {
  private readonly logger = new Logger(OrdersReconciliationCron.name);
  private running = false;

  constructor(private readonly orders: OrdersService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handle(): Promise<void> {
    if (this.running) return; // don't let a slow run overlap the next tick
    this.running = true;
    try {
      const { recovered, cleaned } = await this.orders.reconcilePendingOrders();
      if (recovered || cleaned) {
        this.logger.log(
          `Pending-order reconciliation: ${recovered} recovered, ${cleaned} cleaned up`,
        );
      }
    } catch (err: any) {
      this.logger.error(`Pending-order reconciliation failed: ${err.message}`);
    } finally {
      this.running = false;
    }
  }
}
