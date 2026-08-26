import { Module } from '@nestjs/common';
import { WalkinSalesController } from './walkin-sales.controller';
import { WalkinSalesService } from './walkin-sales.service';
import { WalkinReconciliationCron } from './walkin-reconciliation.cron';
import { SupabaseModule } from '../common/supabase/supabase.module';
import { PreordersModule } from '../preorders/preorders.module';
import { PromosModule } from '../promos/promos.module';

@Module({
  imports: [SupabaseModule, PreordersModule, PromosModule],
  controllers: [WalkinSalesController],
  providers: [WalkinSalesService, WalkinReconciliationCron],
  exports: [WalkinSalesService],
})
export class WalkinSalesModule {}
