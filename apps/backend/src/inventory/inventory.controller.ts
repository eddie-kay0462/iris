import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { QueryInventoryDto } from './dto/query-inventory.dto';
import { QueryMovementsDto } from './dto/query-movements.dto';
import { RequirePermission } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class BulkAdjustDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdjustStockDto)
  adjustments: AdjustStockDto[];
}

@Controller('inventory')
@UseGuards(PermissionsGuard)
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @Get()
  @RequirePermission('inventory:read')
  findAll(@Query() query: QueryInventoryDto) {
    return this.inventoryService.findAll(query);
  }

  @Get('stats')
  @RequirePermission('inventory:read')
  getStats() {
    return this.inventoryService.getStats();
  }

  @Get('low-stock')
  @RequirePermission('inventory:read')
  getLowStock() {
    return this.inventoryService.getLowStock();
  }

  @Post('adjust')
  @RequirePermission('inventory:update')
  adjustStock(@Body() dto: AdjustStockDto, @CurrentUser() user: any) {
    return this.inventoryService.adjustStock(dto, user.sub);
  }

  @Post('bulk-adjust')
  @RequirePermission('inventory:update')
  bulkAdjust(@Body() dto: BulkAdjustDto, @CurrentUser() user: any) {
    return this.inventoryService.bulkAdjust(dto.adjustments, user.sub);
  }

  @Get('movements')
  @RequirePermission('inventory:read')
  getMovements(@Query() query: QueryMovementsDto) {
    return this.inventoryService.getMovements(query);
  }
}
