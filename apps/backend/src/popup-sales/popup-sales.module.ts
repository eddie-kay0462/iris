import { Module } from '@nestjs/common';
import { PopupSalesController } from './popup-sales.controller';
import { PopupSalesService } from './popup-sales.service';

@Module({
  controllers: [PopupSalesController],
  providers: [PopupSalesService],
})
export class PopupSalesModule {}
