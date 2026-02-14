import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { RequirePermission } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';

@Controller('orders')
@UseGuards(PermissionsGuard)
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  // --- Admin routes (must come before parameterized routes) ---

  @Get('admin/list')
  @RequirePermission('orders:read')
  findAdmin(@Query() query: QueryOrdersDto) {
    return this.ordersService.findAdmin(query);
  }

  @Get('admin/:id')
  @RequirePermission('orders:read')
  findAdminOrder(@Param('id') id: string) {
    return this.ordersService.findAdminOrder(id);
  }

  @Patch('admin/:id/status')
  @RequirePermission('orders:update')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() user: any,
  ) {
    return this.ordersService.updateStatus(id, dto, user.sub);
  }

  // --- Customer routes ---

  @Post()
  create(@Body() dto: CreateOrderDto, @CurrentUser() user: any) {
    return this.ordersService.create(dto, user.sub, user.email);
  }

  @Get('my')
  findMyOrders(
    @CurrentUser() user: any,
    @Query() query: QueryOrdersDto,
  ) {
    return this.ordersService.findMyOrders(user.sub, query);
  }

  @Get('my/:id')
  findMyOrder(@Param('id') id: string, @CurrentUser() user: any) {
    return this.ordersService.findMyOrder(user.sub, id);
  }

  @Post(':id/cancel')
  cancelOrder(@Param('id') id: string, @CurrentUser() user: any) {
    return this.ordersService.cancelOrder(id, user.sub);
  }
}
