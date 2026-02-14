import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import { NewsletterService } from './newsletter.service';
import { SubscribeDto } from './dto/subscribe.dto';
import { Public } from '../common/decorators/public.decorator';
import { RequirePermission } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';

@Controller('newsletter')
@UseGuards(PermissionsGuard)
export class NewsletterController {
  constructor(private newsletterService: NewsletterService) {}

  @Public()
  @Post('subscribe')
  subscribe(@Body() dto: SubscribeDto) {
    return this.newsletterService.subscribe(dto.email);
  }

  @Get('admin/list')
  @RequirePermission('settings:read')
  findAll(@Query() query: { page?: string; limit?: string }) {
    return this.newsletterService.findAll(query);
  }
}
