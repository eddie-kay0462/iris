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
import { SetRevenueTargetDto } from './dto/set-revenue-target.dto';
import { RequirePermission } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';

@Controller('orders')
@UseGuards(PermissionsGuard)
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  // --- Admin routes (must come before parameterized routes) ---

  @Get('admin/stats')
  @RequirePermission('orders:read')
  getAdminStats() {
    return this.ordersService.getAdminStats();
  }

  @Get('admin/customer-stats')
  @RequirePermission('orders:read')
  getCustomerStats() {
    return this.ordersService.getCustomerStats();
  }

  @Get('admin/analytics')
  @RequirePermission('orders:read')
  getAnalytics(
    @Query() query: { from_date?: string; to_date?: string },
  ) {
    return this.ordersService.getAnalytics(query);
  }

  @Get('admin/revenue-target/:year')
  @RequirePermission('orders:read')
  getRevenueTarget(@Param('year') year: string) {
    return this.ordersService.getRevenueTarget(Number(year));
  }

  @Post('admin/revenue-target/:year')
  @RequirePermission('orders:update')
  setRevenueTarget(
    @Param('year') year: string,
    @Body() dto: SetRevenueTargetDto,
  ) {
    return this.ordersService.setRevenueTarget(Number(year), dto.target);
  }

  @Get('admin/customers')
  @RequirePermission('customers:read')
  findAdminCustomers(
    @Query() query: { search?: string; page?: string; limit?: string; min_orders?: string; max_orders?: string },
  ) {
    return this.ordersService.findAdminCustomers(query);
  }

  @Get('admin/customers/:id')
  @RequirePermission('customers:read')
  findAdminCustomer(@Param('id') id: string) {
    return this.ordersService.findAdminCustomer(id);
  }

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

  /**
   * Create an order in `pending` state BEFORE payment is initiated.
   * The frontend should call this before opening the Paystack modal so that
   * even if the success callback never fires (browser crash, network drop,
   * customer closes tab), the order still exists and the webhook can finalize
   * it. Idempotent on payment_reference.
   */
  @Post('create-pending')
  createPending(@Body() dto: CreateOrderDto, @CurrentUser() user: any) {
    return this.ordersService.createPending(dto, user.sub, user.email);
  }

  /**
   * Confirm a payment by reference. Called from the Paystack success callback
   * on the frontend. Idempotent — safe to call after the webhook has already
   * confirmed the same reference.
   */
  @Post('confirm-payment')
  confirmPayment(@Body() body: { reference: string }) {
    return this.ordersService.confirmPayment(body.reference);
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
