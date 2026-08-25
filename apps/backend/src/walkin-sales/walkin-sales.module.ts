import { Module } from '@nestjs/common';
import { WalkinSalesController } from './walkin-sales.controller';
import { WalkinSalesService } from './walkin-sales.service';
import { SupabaseModule } from '../common/supabase/supabase.module';
import { PreordersModule } from '../preorders/preorders.module';
import { PromosModule } from '../promos/promos.module';

@Module({
  imports: [SupabaseModule, PreordersModule, PromosModule],
  controllers: [WalkinSalesController],
  providers: [WalkinSalesService],
  exports: [WalkinSalesService],
})
export class WalkinSalesModule {}
