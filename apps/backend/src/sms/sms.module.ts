import { Global, Module } from '@nestjs/common';
import { SmsService } from './sms.service';
import { LetsfishModule } from '../letsfish/letsfish.module';

@Global()
@Module({
  imports: [LetsfishModule],
  providers: [SmsService],
  exports: [SmsService],
})
export class SmsModule {}
