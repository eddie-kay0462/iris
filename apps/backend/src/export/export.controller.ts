import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ExportService } from './export.service';
import { RequirePermission } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';

@Controller('export')
@UseGuards(PermissionsGuard)
export class ExportController {
  constructor(private exportService: ExportService) {}

  @Get('orders')
  @RequirePermission('orders:read')
  async exportOrders(
    @Query() query: { status?: string; from_date?: string; to_date?: string },
    @Res() res: Response,
  ) {
    const csv = await this.exportService.exportOrders(query);
    const filename = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }

  @Get('products')
  @RequirePermission('products:read')
  async exportProducts(@Res() res: Response) {
    const csv = await this.exportService.exportProducts();
    const filename = `products-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }
}
