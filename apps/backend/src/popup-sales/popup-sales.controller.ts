import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PopupSalesService } from './popup-sales.service';
import { PopupCollectionsService } from './popup-collections.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { CreatePopupOrderDto } from './dto/create-popup-order.dto';
import { UpdatePopupOrderDto } from './dto/update-popup-order.dto';
import { QueryPopupOrdersDto } from './dto/query-popup-orders.dto';
import { ChargePopupOrderDto } from './dto/charge-popup-order.dto';
import { CreatePopupCustomerDto } from './dto/create-popup-customer.dto';
import { RefundPopupOrderDto } from './dto/refund-popup-order.dto';
import { SaveEventAggregateDto } from './dto/save-event-aggregate.dto';
import { RequirePermission } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';

@Controller('popup-sales')
@UseGuards(PermissionsGuard)
export class PopupSalesController {
  constructor(
    private popupSalesService: PopupSalesService,
    private collectionsService: PopupCollectionsService,
  ) {}

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

  // ─── Unitemized totals ─────────────────────────────────────────────────────
  //
  // For a pop-up too busy to ring up sale by sale. `popup:update` rather than
  // `popup:manage` deliberately: the staff who worked the stand are the ones with
  // the paper tally, and they do not hold `popup:manage`.
  //
  // PUT because it is idempotent by event — there is at most one aggregate per
  // pop-up, so saving twice corrects the figures instead of double-counting them.

  @Put('events/:id/aggregate')
  @RequirePermission('popup:update')
  saveEventAggregate(
    @Param('id') id: string,
    @Body() dto: SaveEventAggregateDto,
    @CurrentUser() user: any,
  ) {
    return this.popupSalesService.saveEventAggregate(id, dto, user.sub);
  }

  @Delete('events/:id/aggregate')
  @RequirePermission('popup:update')
  deleteEventAggregate(@Param('id') id: string) {
    return this.popupSalesService.deleteEventAggregate(id);
  }

  // ─── Stats ──────────────────────────────────────────────────────────────────

  @Get('events/:id/stats')
  @RequirePermission('popup:read')
  getEventStats(@Param('id') id: string) {
    return this.popupSalesService.getEventStats(id);
  }

  @Get('events/:id/analytics')
  @RequirePermission('popup:read')
  getEventAnalytics(@Param('id') id: string) {
    return this.popupSalesService.getEventAnalytics(id);
  }
  // ─── Online pre-orders collected at this pop-up ─────────────────────────────
  //
  // These are `orders` rows, not `popup_orders` — paid for on the storefront
  // days earlier and only handed over at the stand.

  @Get('events/:id/collections')
  @RequirePermission('popup:read')
  listCollections(@Param('id') id: string) {
    return this.collectionsService.listForEvent(id);
  }

  @Post('collections/:orderId/collect')
  @RequirePermission('popup:update')
  markCollected(@Param('orderId') orderId: string, @CurrentUser() user: any) {
    return this.collectionsService.markCollected(orderId, user.sub);
  }

  @Post('collections/:orderId/undo')
  @RequirePermission('popup:update')
  undoCollected(@Param('orderId') orderId: string, @CurrentUser() user: any) {
    return this.collectionsService.undoCollected(orderId, user.sub);
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

  @Get('orders/:id/verify-payment')
  @RequirePermission('popup:update')
  verifyPayment(@Param('id') id: string) {
    return this.popupSalesService.verifyPayment(id);
  }

  @Post('orders/:id/refund')
  @RequirePermission('popup:manage')
  refundOrder(
    @Param('id') id: string,
    @Body() dto: RefundPopupOrderDto,
    @CurrentUser() user: any,
  ) {
    return this.popupSalesService.refundOrder(id, dto, user.sub);
  }

  // ─── Customers ───────────────────────────────────────────────────────────────

  @Post('customers')
  @RequirePermission('popup:create')
  findOrCreateCustomer(@Body() dto: CreatePopupCustomerDto) {
    return this.popupSalesService.findOrCreateCustomer(dto);
  }
}
