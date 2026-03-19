import { Global, Module } from '@nestjs/common';
import { LetsfishService } from './letsfish.service';

@Global()
@Module({
  providers: [LetsfishService],
  exports: [LetsfishService],
})
export class LetsfishModule {}
