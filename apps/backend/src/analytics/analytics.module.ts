import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { AbandonedCheckoutCron } from './abandoned-checkout.cron';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [SettingsModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AbandonedCheckoutCron],
})
export class AnalyticsModule {}
