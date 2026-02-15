import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RequirePermission } from '../common/decorators/permissions.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';

@Controller('test/rbac')
export class TestRbacController {
  @Get('auth-only')
  authOnly(@CurrentUser() user: any) {
    return { message: 'Authenticated', user };
  }

  @Get('admin-only')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager', 'staff')
  adminOnly(@CurrentUser() user: any) {
    return { message: 'Admin access granted', role: user.role };
  }

  @Get('manager-only')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  managerOnly(@CurrentUser() user: any) {
    return { message: 'Manager access granted', role: user.role };
  }

  @Get('products-create')
  @UseGuards(PermissionsGuard)
  @RequirePermission('products:create')
  productsCreate(@CurrentUser() user: any) {
    return { message: 'products:create permission granted', role: user.role };
  }

  @Get('orders-refund')
  @UseGuards(PermissionsGuard)
  @RequirePermission('orders:refund')
  ordersRefund(@CurrentUser() user: any) {
    return { message: 'orders:refund permission granted', role: user.role };
  }
}
