import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { PromosModule } from '../promos/promos.module';
import { SettingsModule } from '../settings/settings.module';
import { PreordersModule } from '../preorders/preorders.module';

@Module({
  imports: [PromosModule, SettingsModule, PreordersModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
