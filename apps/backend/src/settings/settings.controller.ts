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
}
