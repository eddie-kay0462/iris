import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import { CommunicationsService } from './communications.service';
import { RequirePermission } from '../common/decorators/permissions.decorator';

@Controller('communications')
export class CommunicationsController {
  constructor(private communicationsService: CommunicationsService) {}

  @Get('status')
  @RequirePermission('settings:read')
  async getStatus() {
    return this.communicationsService.getStatus();
  }

  @Get('logs')
  @RequirePermission('settings:read')
  async getLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.communicationsService.getLogs(
      parseInt(page || '1', 10),
      parseInt(limit || '50', 10),
    );
  }

  @Post('test-sms')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('settings:update')
  async testSms(@Body() body: { phone: string; message: string }) {
    return this.communicationsService.sendTestSms(body.phone, body.message);
  }

  @Post('test-call')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('settings:update')
  async testCall(@Body() body: { phone: string; otp: string }) {
    return this.communicationsService.sendTestCall(body.phone, body.otp);
  }
}
