import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AlliesService } from './allies.service';
import { AllocateStockDto, ReturnStockDto } from './dto/allocate-stock.dto';
import { QueryAllySalesDto } from './dto/query-sales.dto';
import { RequirePermission } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';

@Controller('allies/admin')
@UseGuards(PermissionsGuard)
export class AlliesController {
  constructor(private alliesService: AlliesService) {}

  @Get(':id/allocations')
  @RequirePermission('inventory:read')
  getAllocations(@Param('id') id: string) {
    return this.alliesService.getAllocations(id);
  }

  @Post(':id/allocations')
  @RequirePermission('inventory:update')
  allocate(
    @Param('id') id: string,
    @Body() dto: AllocateStockDto,
    @CurrentUser() user: any,
  ) {
    return this.alliesService.allocate(id, dto, user.sub);
  }

  @Post(':id/allocations/return')
  @RequirePermission('inventory:update')
  returnStock(
    @Param('id') id: string,
    @Body() dto: ReturnStockDto,
    @CurrentUser() user: any,
  ) {
    return this.alliesService.returnStock(id, dto, user.sub);
  }

  @Get(':id/sales')
  @RequirePermission('orders:read')
  getSales(@Param('id') id: string, @Query() query: QueryAllySalesDto) {
    return this.alliesService.getSales(id, query);
  }
}
