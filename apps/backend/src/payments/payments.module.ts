import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { OrdersModule } from '../orders/orders.module';
import { PopupSalesModule } from '../popup-sales/popup-sales.module';
import { WalkinSalesModule } from '../walkin-sales/walkin-sales.module';

@Module({
  imports: [OrdersModule, PopupSalesModule, WalkinSalesModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
