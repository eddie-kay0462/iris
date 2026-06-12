import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { SupabaseModule } from './common/supabase/supabase.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { AuthModule } from './auth/auth.module';
import { ProfileModule } from './profile/profile.module';
import { SmsModule } from './sms/sms.module';
import { PaymentsModule } from './payments/payments.module';
import { TestRbacModule } from './test-rbac/test-rbac.module';
import { ProductsModule } from './products/products.module';
import { InventoryModule } from './inventory/inventory.module';
import { CollectionsModule } from './collections/collections.module';
import { OrdersModule } from './orders/orders.module';
import { SettingsModule } from './settings/settings.module';
import { NewsletterModule } from './newsletter/newsletter.module';
import { ExportModule } from './export/export.module';
import { RecommendationsModule } from './recommendations/recommendations.module';
import { ReviewsModule } from './reviews/reviews.module';
import { PopupSalesModule } from './popup-sales/popup-sales.module';
import { PreordersModule } from './preorders/preorders.module';
import { LetsfishModule } from './letsfish/letsfish.module';
import { CommunicationsModule } from './communications/communications.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { EmailModule } from './email/email.module';
import { PromosModule } from './promos/promos.module';
import { FavouritesModule } from './favourites/favourites.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Rate limiting — only enforced where ThrottlerGuard is mounted
    // (public analytics ingest routes), not globally.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    SupabaseModule,
    LetsfishModule,
    AuthModule,
    ProfileModule,
    SmsModule,
    PaymentsModule,
    TestRbacModule,
    ProductsModule,
    InventoryModule,
    CollectionsModule,
    OrdersModule,
    SettingsModule,
    NewsletterModule,
    ExportModule,
    RecommendationsModule,
    ReviewsModule,
    PopupSalesModule,
    PreordersModule,
    CommunicationsModule,
    AnalyticsModule,
    EmailModule,
    PromosModule,
    FavouritesModule,
  ],
  providers: [
    // Apply JwtAuthGuard globally — use @Public() to skip
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule { }
