import { Module } from '@nestjs/common';
import { AlliesController } from './allies.controller';
import { AlliesService } from './allies.service';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [InventoryModule],
  controllers: [AlliesController],
  providers: [AlliesService],
})
export class AlliesModule {}
