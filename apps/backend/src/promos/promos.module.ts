import { Module } from '@nestjs/common';
import { PromosController } from './promos.controller';
import { PromosService } from './promos.service';
import { DiscountEngineService } from './discount-engine.service';

@Module({
  controllers: [PromosController],
  providers: [PromosService, DiscountEngineService],
  exports: [PromosService, DiscountEngineService],
})
export class PromosModule {}
