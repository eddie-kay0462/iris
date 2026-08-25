import { Module } from '@nestjs/common';
import { PopupSalesController } from './popup-sales.controller';
import { PopupSalesService } from './popup-sales.service';
import { PromosModule } from '../promos/promos.module';

@Module({
  imports: [PromosModule],
  controllers: [PopupSalesController],
  providers: [PopupSalesService],
  exports: [PopupSalesService],
})
export class PopupSalesModule {}
