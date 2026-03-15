import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PopupSalesService } from './popup-sales.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { CreatePopupOrderDto } from './dto/create-popup-order.dto';
import { UpdatePopupOrderDto } from './dto/update-popup-order.dto';
import { QueryPopupOrdersDto } from './dto/query-popup-orders.dto';
import { ChargePopupOrderDto } from './dto/charge-popup-order.dto';
import { RequirePermission } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';

@Controller('popup-sales')
@UseGuards(PermissionsGuard)
export class PopupSalesController {
  constructor(private popupSalesService: PopupSalesService) {}

  // ─── Events ────────────────────────────────────────────────────────────────

  @Get('events')
  @RequirePermission('popup:read')
  findAllEvents() {
    return this.popupSalesService.findAllEvents();
  }

  @Post('events')
  @RequirePermission('popup:manage')
  createEvent(@Body() dto: CreateEventDto, @CurrentUser() user: any) {
    return this.popupSalesService.createEvent(dto, user.sub);
  }

  @Patch('events/:id')
  @RequirePermission('popup:manage')
  updateEvent(@Param('id') id: string, @Body() dto: UpdateEventDto) {
    return this.popupSalesService.updateEvent(id, dto);
  }

  // ─── Stats ──────────────────────────────────────────────────────────────────

  @Get('events/:id/stats')
  @RequirePermission('popup:read')
  getEventStats(@Param('id') id: string) {
    return this.popupSalesService.getEventStats(id);
  }

  // ─── Orders ─────────────────────────────────────────────────────────────────

  @Get('events/:id/orders')
  @RequirePermission('popup:read')
  findOrders(@Param('id') id: string, @Query() query: QueryPopupOrdersDto) {
    return this.popupSalesService.findOrders(id, query);
  }

  @Post('events/:id/orders')
  @RequirePermission('popup:create')
  createOrder(
    @Param('id') id: string,
    @Body() dto: CreatePopupOrderDto,
    @CurrentUser() user: any,
  ) {
    return this.popupSalesService.createOrder(id, dto, user.sub);
  }

  @Get('orders/:id')
  @RequirePermission('popup:read')
  findOrder(@Param('id') id: string) {
    return this.popupSalesService.findOrder(id);
  }

  @Patch('orders/:id')
  @RequirePermission('popup:update')
  updateOrder(@Param('id') id: string, @Body() dto: UpdatePopupOrderDto) {
    return this.popupSalesService.updateOrder(id, dto);
  }

  @Post('orders/:id/charge')
  @RequirePermission('popup:update')
  chargeOrder(@Param('id') id: string, @Body() dto: ChargePopupOrderDto) {
    return this.popupSalesService.chargeOrder(id, dto);
  }

  @Post('orders/:id/submit-otp')
  @RequirePermission('popup:update')
  submitOtp(@Param('id') id: string, @Body('otp') otp: string) {
    return this.popupSalesService.submitOtp(id, otp);
  }
}
