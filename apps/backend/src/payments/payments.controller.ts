import {
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  RawBody,
  Req,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { Public } from '../common/decorators/public.decorator';

@Controller('webhooks')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Public()
  @Post('paystack')
  @HttpCode(HttpStatus.OK)
  async handlePaystackWebhook(
    @Req() req: any,
    @Headers('x-paystack-signature') signature: string,
  ) {
    // For webhook signature verification we need the raw body
    // In production, configure raw body parsing for this route
    const body =
      typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

    if (signature) {
      const valid = this.paymentsService.verifyWebhookSignature(
        body,
        signature,
      );
      if (!valid) {
        return { ok: false, error: 'Invalid signature' };
      }
    }

    return this.paymentsService.handleWebhook(req.body);
  }
}
