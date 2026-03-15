import {
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  RawBody,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { Public } from '../common/decorators/public.decorator';
import { RequirePermission } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { QueryPaymentsDto } from './dto/query-payments.dto';

@Controller()
@UseGuards(PermissionsGuard)
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  // --- Admin payments ---

  @Get('payments/admin/list')
  @RequirePermission('orders:read')
  findAdminPayments(@Query() query: QueryPaymentsDto) {
    return this.paymentsService.findAdminPayments(query);
  }

  @Get('payments/admin/stats')
  @RequirePermission('orders:read')
  getPaymentStats() {
    return this.paymentsService.getPaymentStats();
  }

  // --- Webhooks ---

  @Public()
  @Post('webhooks/paystack')
  @HttpCode(HttpStatus.OK)
  async handlePaystackWebhook(
    @Req() req: any,
    @RawBody() rawBody: Buffer,
    @Headers('x-paystack-signature') signature: string,
  ) {
    console.log('[Paystack Webhook] Received. Signature present:', !!signature);

    if (signature) {
      const valid = this.paymentsService.verifyWebhookSignature(
        rawBody.toString('utf8'),
        signature,
      );
      console.log('[Paystack Webhook] Signature valid:', valid);
      if (!valid) {
        return { ok: false, error: 'Invalid signature' };
      }
    }

    console.log('[Paystack Webhook] Event:', req.body?.event, '| Reference:', req.body?.data?.reference);
    return this.paymentsService.handleWebhook(req.body);
  }
}
