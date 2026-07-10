import {
  Controller,
  Get,
  Patch,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { RequirePermission } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Public } from '../common/decorators/public.decorator';

@Controller('settings')
@UseGuards(PermissionsGuard)
export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  @Get('users')
  @RequirePermission('users:read')
  findUsers(@Query() query: { search?: string; page?: string; limit?: string }) {
    return this.settingsService.findAdminUsers(query);
  }

  @Post('users')
  @RequirePermission('users:update')
  createUser(@Body() dto: CreateUserDto) {
    return this.settingsService.createUser(dto);
  }

  @Patch('users/:id/role')
  @RequirePermission('users:update')
  updateUserRole(
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.settingsService.updateUserRole(id, dto.role);
  }

  @Post('users/:id/reset-password')
  @RequirePermission('users:update')
  sendPasswordReset(@Param('id') id: string) {
    return this.settingsService.sendPasswordReset(id);
  }

  @Get('roles')
  @RequirePermission('settings:read')
  getRoles() {
    return this.settingsService.getRoles();
  }

  @Get('shipping-options')
  @Public()
  getShippingOptions() {
    return this.settingsService.getShippingOptions();
  }

  @Put('shipping-options')
  @UseGuards(PermissionsGuard)
  @RequirePermission('settings:update')
  updateShippingOptions(@Body() body: { options: any[] }) {
    return this.settingsService.updateShippingOptions(body.options);
  }

  @Get('country-shipping-rates')
  @Public()
  getCountryShippingRates() {
    return this.settingsService.getCountryShippingRates();
  }

  @Put('country-shipping-rates')
  @UseGuards(PermissionsGuard)
  @RequirePermission('settings:update')
  updateCountryShippingRates(@Body() body: { rates: any[] }) {
    return this.settingsService.updateCountryShippingRates(body.rates);
  }

  @Get('stock-hold-minutes')
  @RequirePermission('settings:read')
  getStockHoldMinutes() {
    return this.settingsService.getStockHoldMinutes();
  }

  @Put('stock-hold-minutes')
  @UseGuards(PermissionsGuard)
  @RequirePermission('settings:update')
  updateStockHoldMinutes(@Body() body: { minutes: number }) {
    return this.settingsService.updateStockHoldMinutes(body.minutes);
  }

  @Get('preorder-eta-text')
  @RequirePermission('settings:read')
  getPreorderEtaText() {
    return this.settingsService.getPreorderEtaText();
  }

  @Put('preorder-eta-text')
  @UseGuards(PermissionsGuard)
  @RequirePermission('settings:update')
  updatePreorderEtaText(@Body() body: { text: string }) {
    return this.settingsService.updatePreorderEtaText(body.text);
  }

  @Get('order-number-start')
  @RequirePermission('settings:read')
  getOrderNumberStart() {
    return this.settingsService.getOrderNumberStart();
  }

  @Put('order-number-start')
  @UseGuards(PermissionsGuard)
  @RequirePermission('settings:update')
  updateOrderNumberStart(@Body() body: { value: number }) {
    return this.settingsService.updateOrderNumberStart(body.value);
  }

  @Get('preorder-number-start')
  @RequirePermission('settings:read')
  getPreorderNumberStart() {
    return this.settingsService.getPreorderNumberStart();
  }

  @Put('preorder-number-start')
  @UseGuards(PermissionsGuard)
  @RequirePermission('settings:update')
  updatePreorderNumberStart(@Body() body: { value: number }) {
    return this.settingsService.updatePreorderNumberStart(body.value);
  }

  @Get('road-to-hq-baseline')
  @RequirePermission('settings:read')
  getRoadToHqBaseline() {
    return this.settingsService.getRoadToHqBaseline();
  }

  @Put('road-to-hq-baseline')
  @UseGuards(PermissionsGuard)
  @RequirePermission('settings:update')
  updateRoadToHqBaseline(@Body() body: { value: number }) {
    return this.settingsService.updateRoadToHqBaseline(body.value);
  }

  @Get('road-to-hq-target')
  @RequirePermission('settings:read')
  getRoadToHqTarget() {
    return this.settingsService.getRoadToHqTarget();
  }

  @Put('road-to-hq-target')
  @UseGuards(PermissionsGuard)
  @RequirePermission('settings:update')
  updateRoadToHqTarget(@Body() body: { value: number }) {
    return this.settingsService.updateRoadToHqTarget(body.value);
  }
}
