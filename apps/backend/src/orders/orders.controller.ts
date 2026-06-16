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
import { OptionalCurrentUser } from '../common/decorators/optional-current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
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
    @Query() query: { search?: string; page?: string; limit?: string; min_orders?: string; max_orders?: string; include_all_roles?: string },
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

  @Public()
  @Post()
  create(@Body() dto: CreateOrderDto, @OptionalCurrentUser() user: any) {
    return this.ordersService.create(dto, user?.sub ?? null, user?.email ?? null);
  }

  /**
   * Create an order in `pending` state BEFORE payment is initiated.
   * Open to guests (@Public) — userId and email are null for unauthenticated callers;
   * dto.guestEmail is used as the contact email in that case.
   */
  @Public()
  @Post('create-pending')
  createPending(@Body() dto: CreateOrderDto, @OptionalCurrentUser() user: any) {
    return this.ordersService.createPending(dto, user?.sub ?? null, user?.email ?? null);
  }

  /**
   * Confirm a payment by reference. Called from the Paystack success callback
   * on the frontend. Idempotent — safe to call after the webhook has already
   * confirmed the same reference.
   */
  @Public()
  @Post('confirm-payment')
  confirmPayment(@Body() body: { reference: string }) {
    return this.ordersService.confirmPayment(body.reference);
  }

  /**
   * Releases a pending order's stock hold immediately, e.g. when the customer
   * closes the Paystack modal without paying. The order stays pending under
   * the same reference so a retry triggers the one-time hold refresh.
   */
  @Public()
  @Post('release-hold')
  releaseHold(@Body() body: { reference: string }) {
    return this.ordersService.releaseHold(body.reference);
  }

  /**
   * Retrieve a guest order by order number + one-time guest token.
   * The token is returned when a guest order is created and stored client-side
   * in sessionStorage. It acts as a lightweight secret to prevent enumeration.
   */
  @Public()
  @Get('guest/:orderNumber')
  findGuestOrder(
    @Param('orderNumber') orderNumber: string,
    @Query('token') token: string,
  ) {
    return this.ordersService.findGuestOrder(orderNumber, token);
  }

  @Get('my')
  findMyOrders(
    @CurrentUser() user: any,
    @Query() query: QueryOrdersDto,
  ) {
    return this.ordersService.findMyOrders(user.sub, query);
  }

  @Get('my/by-number/:orderNumber')
  findMyOrderByNumber(
    @Param('orderNumber') orderNumber: string,
    @CurrentUser() user: any,
  ) {
    return this.ordersService.findMyOrderByNumber(user.sub, orderNumber);
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
