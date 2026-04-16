import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { PreordersService } from './preorders.service';
import { CreatePreorderDto } from './dto/create-preorder.dto';
import { CreatePopupPreorderDto } from './dto/create-popup-preorder.dto';
import { QueryPreordersDto } from './dto/query-preorders.dto';
import { RefundPreorderDto } from './dto/refund-preorder.dto';
import { RestockPreorderDto } from './dto/restock-preorder.dto';
import { RequirePermission } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';

@Controller()
@UseGuards(PermissionsGuard)
export class PreordersController {
  constructor(private readonly preordersService: PreordersService) {}

  @Post('preorders')
  create(@Body() dto: CreatePreorderDto, @CurrentUser() user: any) {
    return this.preordersService.create(dto, user.sub, user.email);
  }

  @Get('preorders/my')
  myPreorders(@CurrentUser() user: any) {
    return this.preordersService.findMyPreorders(user.sub);
  }

  @Post('admin/preorders/popup')
  @RequirePermission('popup:create')
  createPopup(@Body() dto: CreatePopupPreorderDto, @CurrentUser() user: any) {
    return this.preordersService.createPopup(dto, user.sub);
  }

  @Get('admin/preorders/stats')
  @RequirePermission('orders:read')
  getStats() {
    return this.preordersService.getStats();
  }

  @Get('admin/preorders')
  @RequirePermission('orders:read')
  findAll(@Query() query: QueryPreordersDto) {
    return this.preordersService.findAll(query);
  }

  @Get('admin/preorders/:id')
  @RequirePermission('orders:read')
  findOne(@Param('id') id: string) {
    return this.preordersService.findOne(id);
  }

  @Patch('admin/preorders/:id/cancel')
  @RequirePermission('orders:update')
  cancel(@Param('id') id: string) {
    return this.preordersService.cancel(id);
  }

  @Post('admin/preorders/restock/:variantId')
  @RequirePermission('inventory:update')
  restock(@Param('variantId') variantId: string, @Body() dto: RestockPreorderDto) {
    return this.preordersService.restock(variantId, dto);
  }

  @Post('admin/preorders/:id/refund')
  @RequirePermission('orders:refund')
  refund(@Param('id') id: string, @Body() dto: RefundPreorderDto, @CurrentUser() user: any) {
    return this.preordersService.refund(id, dto, user.sub);
  }
}
