import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { SupabaseModule } from './common/supabase/supabase.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { AuthModule } from './auth/auth.module';
import { ProfileModule } from './profile/profile.module';
import { SmsModule } from './sms/sms.module';
import { PaymentsModule } from './payments/payments.module';
import { TestRbacModule } from './test-rbac/test-rbac.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SupabaseModule,
    AuthModule,
    ProfileModule,
    SmsModule,
    PaymentsModule,
    TestRbacModule,
  ],
  providers: [
    // Apply JwtAuthGuard globally — use @Public() to skip
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
