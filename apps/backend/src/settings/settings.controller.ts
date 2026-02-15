import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { RequirePermission } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';

@Controller('settings')
@UseGuards(PermissionsGuard)
export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  @Get('users')
  @RequirePermission('users:read')
  findUsers(@Query() query: { search?: string; page?: string; limit?: string }) {
    return this.settingsService.findAdminUsers(query);
  }

  @Patch('users/:id/role')
  @RequirePermission('users:update')
  updateUserRole(
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.settingsService.updateUserRole(id, dto.role);
  }

  @Get('roles')
  @RequirePermission('settings:read')
  getRoles() {
    return this.settingsService.getRoles();
  }
}
