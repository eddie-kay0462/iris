import { Module } from '@nestjs/common';
import { PreordersService } from './preorders.service';
import { PreordersController } from './preorders.controller';
import { SupabaseModule } from '../common/supabase/supabase.module';
import { LetsfishModule } from '../letsfish/letsfish.module';

@Module({
  imports: [SupabaseModule, LetsfishModule],
  controllers: [PreordersController],
  providers: [PreordersService],
})
export class PreordersModule {}
