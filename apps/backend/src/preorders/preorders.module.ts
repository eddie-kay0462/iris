import { Module } from '@nestjs/common';
import { PreordersService } from './preorders.service';
import { PreordersController } from './preorders.controller';
import { SupabaseModule } from '../common/supabase/supabase.module';
import { LetsfishModule } from '../letsfish/letsfish.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [SupabaseModule, LetsfishModule, SettingsModule],
  controllers: [PreordersController],
  providers: [PreordersService],
  exports: [PreordersService],
})
export class PreordersModule {}
