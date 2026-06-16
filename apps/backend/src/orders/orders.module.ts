import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { PromosModule } from '../promos/promos.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [PromosModule, SettingsModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
