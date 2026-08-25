import { Module } from '@nestjs/common';
import { PopupSalesController } from './popup-sales.controller';
import { PopupSalesService } from './popup-sales.service';
import { PromosModule } from '../promos/promos.module';
import { SettingsModule } from '../settings/settings.module';
import { PopupCollectionsService } from './popup-collections.service';
import { PopupPickupReminderCron } from './popup-pickup-reminder.cron';

@Module({
  imports: [PromosModule, SettingsModule],
  controllers: [PopupSalesController],
  providers: [PopupSalesService, PopupCollectionsService, PopupPickupReminderCron],
  exports: [PopupSalesService, PopupCollectionsService],
})
export class PopupSalesModule {}
