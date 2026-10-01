import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { B2bService } from './b2b.service';
import {
  CreateB2bClientDto,
  QueryB2bClientsDto,
  UpdateB2bClientDto,
} from './dto/client.dto';
import {
  B2bSummaryQueryDto,
  CreateB2bOrderDto,
  QueryB2bOrdersDto,
  UpdateB2bOrderDto,
  UpdateB2bOrderStatusDto,
} from './dto/order.dto';
import { RequirePermission } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';

// Staff can see B2B (b2b:read); only managers and admins change it (b2b:manage).
@Controller('b2b')
@UseGuards(PermissionsGuard)
export class B2bController {
  constructor(private b2bService: B2bService) {}

  @Get('summary')
  @RequirePermission('b2b:read')
  getSummary(@Query() query: B2bSummaryQueryDto) {
    return this.b2bService.getSummary(query);
  }

  // ─── Clients ────────────────────────────────────────────────────────────────

  @Get('clients')
  @RequirePermission('b2b:read')
  listClients(@Query() query: QueryB2bClientsDto) {
    return this.b2bService.listClients(query);
  }

  @Get('clients/:id')
  @RequirePermission('b2b:read')
  getClient(@Param('id', ParseUUIDPipe) id: string) {
    return this.b2bService.getClient(id);
  }

  @Post('clients')
  @RequirePermission('b2b:manage')
  createClient(@Body() dto: CreateB2bClientDto, @CurrentUser() user: any) {
    return this.b2bService.createClient(dto, user.sub);
  }

  @Patch('clients/:id')
  @RequirePermission('b2b:manage')
  updateClient(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateB2bClientDto,
    @CurrentUser() user: any,
  ) {
    return this.b2bService.updateClient(id, dto, user.sub);
  }

  // ─── Orders ─────────────────────────────────────────────────────────────────

  @Get('orders')
  @RequirePermission('b2b:read')
  listOrders(@Query() query: QueryB2bOrdersDto) {
    return this.b2bService.listOrders(query);
  }

  @Get('orders/:id')
  @RequirePermission('b2b:read')
  getOrder(@Param('id', ParseUUIDPipe) id: string) {
    return this.b2bService.getOrder(id);
  }

  @Post('orders')
  @RequirePermission('b2b:manage')
  createOrder(@Body() dto: CreateB2bOrderDto, @CurrentUser() user: any) {
    return this.b2bService.createOrder(dto, user.sub);
  }

  @Patch('orders/:id')
  @RequirePermission('b2b:manage')
  updateOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateB2bOrderDto,
    @CurrentUser() user: any,
  ) {
    return this.b2bService.updateOrder(id, dto, user.sub);
  }

  @Post('orders/:id/status')
  @RequirePermission('b2b:manage')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateB2bOrderStatusDto,
    @CurrentUser() user: any,
  ) {
    return this.b2bService.updateStatus(id, dto, user.sub);
  }
}
