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
import { WalkinSalesService } from './walkin-sales.service';
import { CreateWalkinOrderDto } from './dto/create-walkin-order.dto';
import { UpdateWalkinOrderDto } from './dto/update-walkin-order.dto';
import { QueryWalkinOrdersDto } from './dto/query-walkin-orders.dto';
import { CreateWalkinCustomerDto } from './dto/create-walkin-customer.dto';
import { CreateWalkinPreorderDto } from './dto/create-walkin-preorder.dto';
import { RefundWalkinOrderDto } from './dto/refund-walkin-order.dto';
import { ChargeWalkinOrderDto } from './dto/charge-walkin-order.dto';
import { RequirePermission } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';

@Controller('walkin-sales')
@UseGuards(PermissionsGuard)
export class WalkinSalesController {
  constructor(private walkinSalesService: WalkinSalesService) {}

  // ─── Orders ─────────────────────────────────────────────────────────────────

  @Get('orders')
  @RequirePermission('orders:read')
  findOrders(@Query() query: QueryWalkinOrdersDto) {
    return this.walkinSalesService.findOrders(query);
  }

  @Get('stats')
  @RequirePermission('orders:read')
  getStats() {
    return this.walkinSalesService.getStats();
  }

  @Get('orders/:id')
  @RequirePermission('orders:read')
  findOrder(@Param('id') id: string) {
    return this.walkinSalesService.findOrder(id);
  }

  @Post('orders')
  @RequirePermission('orders:update')
  createOrder(@Body() dto: CreateWalkinOrderDto, @CurrentUser() user: any) {
    return this.walkinSalesService.createOrder(dto, user.sub);
  }

  @Patch('orders/:id')
  @RequirePermission('orders:update')
  updateOrder(@Param('id') id: string, @Body() dto: UpdateWalkinOrderDto) {
    return this.walkinSalesService.updateOrder(id, dto);
  }

  @Post('orders/:id/refund')
  @RequirePermission('orders:refund')
  refundOrder(
    @Param('id') id: string,
    @Body() dto: RefundWalkinOrderDto,
    @CurrentUser() user: any,
  ) {
    return this.walkinSalesService.refundOrder(id, dto, user.sub);
  }

  // ─── MoMo charge (Paystack) ───────────────────────────────────────────────────

  @Post('orders/:id/charge')
  @RequirePermission('orders:update')
  chargeOrder(@Param('id') id: string, @Body() dto: ChargeWalkinOrderDto) {
    return this.walkinSalesService.chargeOrder(id, dto);
  }

  @Post('orders/:id/submit-otp')
  @RequirePermission('orders:update')
  submitOtp(@Param('id') id: string, @Body('otp') otp: string) {
    return this.walkinSalesService.submitOtp(id, otp);
  }

  @Get('orders/:id/verify-payment')
  @RequirePermission('orders:update')
  verifyPayment(@Param('id') id: string) {
    return this.walkinSalesService.verifyPayment(id);
  }

  // ─── Pre-orders ───────────────────────────────────────────────────────────────

  @Post('preorders')
  @RequirePermission('orders:update')
  createPreorder(
    @Body() dto: CreateWalkinPreorderDto,
    @CurrentUser() user: any,
  ) {
    return this.walkinSalesService.createPreorder(dto, user.sub);
  }

  // ─── Customers ────────────────────────────────────────────────────────────────

  @Get('customers')
  @RequirePermission('orders:read')
  searchCustomers(@Query('search') search: string) {
    return this.walkinSalesService.searchCustomers(search);
  }

  @Post('customers')
  @RequirePermission('orders:update')
  createCustomer(@Body() dto: CreateWalkinCustomerDto) {
    return this.walkinSalesService.createCustomer(dto);
  }
}
