import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../common/supabase/supabase.service';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly apiKey: string;
  private readonly from: string;

  private readonly frontendUrl: string;

  constructor(
    private configService: ConfigService,
    private supabase: SupabaseService,
  ) {
    this.apiKey = this.configService.get<string>('RESEND_API_KEY', '');
    this.from = this.configService.get<string>(
      'EMAIL_FROM',
      'Orders <orders@1nri.store>',
    );
    this.frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'https://storefront.1nri.store',
    );
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async sendOrderConfirmation(order: {
    email: string;
    order_number: string;
    subtotal: number;
    shipping_cost: number;
    total: number;
    currency: string;
    brand?: string;
    order_items?: {
      product_name: string;
      variant_title?: string | null;
      quantity: number;
      total_price: number;
    }[];
  }): Promise<void> {
    const subject = `Order Confirmed — ${order.order_number}`;
    const html = this.buildOrderConfirmationHtml(order);
    await this.send(order.email, subject, html, order.order_number);
  }

  async sendStaffOrderNotification(order: {
    order_number: string;
    email: string;
    subtotal: number;
    shipping_cost: number;
    total: number;
    currency: string;
    shipping_address?: {
      fullName?: string;
      address?: string;
      address2?: string;
      city?: string;
      region?: string;
      phone?: string;
    } | null;
    order_items?: {
      product_name: string;
      variant_title?: string | null;
      quantity: number;
      unit_price: number;
      total_price: number;
    }[];
  }): Promise<void> {
    const staffEmail = this.configService.get<string>('STAFF_FULFILLMENT_EMAIL', '');
    if (!staffEmail) return;
    const subject = `New Order — ${order.order_number}`;
    const html = this.buildStaffOrderHtml(order);
    await this.send(staffEmail, subject, html, order.order_number);
  }

  async sendAllySaleConfirmation(sale: {
    email: string;
    customer_name?: string | null;
    order_number: string;
    subtotal: number;
    total: number;
    currency: string;
    brand?: string;
    items?: {
      product_name: string;
      variant_title?: string | null;
      quantity: number;
      total_price: number;
    }[];
  }): Promise<void> {
    const subject = `Purchase Confirmed — ${sale.order_number}`;
    const html = this.buildAllySaleConfirmationHtml(sale);
    await this.send(sale.email, subject, html, sale.order_number);
  }

  async sendShippingNotification(order: {
    email: string;
    order_number: string;
    tracking_number?: string | null;
    carrier?: string | null;
    brand?: string;
  }): Promise<void> {
    const subject = `Your order ${order.order_number} has shipped`;
    const html = this.buildShippingHtml(order);
    await this.send(order.email, subject, html, order.order_number);
  }

  private async send(
    to: string,
    subject: string,
    html: string,
    orderId: string,
  ): Promise<void> {
    if (!this.isConfigured()) {
      this.logger.warn(
        `RESEND_API_KEY not set — skipping email for order ${orderId}`,
      );
      return;
    }

    let success = false;
    let errorMessage: string | undefined;

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from: this.from, to, subject, html }),
      });

      const data = await response.json().catch(() => ({}));
      success = response.ok;
      if (!success) {
        errorMessage = (data as any).message || JSON.stringify(data);
        this.logger.error(
          `Resend rejected email for order ${orderId}: ${errorMessage}`,
        );
      }
    } catch (err: any) {
      errorMessage = err.message;
      this.logger.error(`Email send failed for order ${orderId}: ${err.message}`);
    }

    await this.log(to, subject, success, errorMessage);
  }

  private async log(
    recipient: string,
    subject: string,
    success: boolean,
    errorMessage?: string,
  ): Promise<void> {
    try {
      const db = this.supabase.getAdminClient();
      await db.from('communication_logs').insert({
        type: 'email',
        recipient_email: recipient,
        message: subject,
        status: success ? 'sent' : 'failed',
        provider: 'resend',
        metadata: errorMessage ? { error: errorMessage } : null,
      });
    } catch (err: any) {
      this.logger.error(`Failed to write email log: ${err.message}`);
    }
  }

  private brandHeader(brand: string): string {
    if (brand === 'Unlikely Alliances') {
      return `<p style="margin:0;font-size:20px;font-weight:700;color:#fff;font-family:Helvetica,Arial,sans-serif;letter-spacing:0.5px;">Unlikely Alliances</p>`;
    }
    return `<img src="${this.frontendUrl}/homepage_img/no-bg-1NRI.png" alt="1NRI" height="36" style="display:block;border:0;height:36px;width:auto;filter:brightness(0) invert(1);">`;
  }

  private buildOrderConfirmationHtml(order: {
    order_number: string;
    subtotal: number;
    shipping_cost: number;
    total: number;
    currency: string;
    brand?: string;
    order_items?: {
      product_name: string;
      variant_title?: string | null;
      quantity: number;
      total_price: number;
    }[];
  }): string {
    const brandName = order.brand || '1NRI';
    const symbol = order.currency === 'GHS' ? 'GH₵' : order.currency;

    const itemRows = (order.order_items || [])
      .map(
        (item) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:14px;color:#333;">
            ${item.product_name}${item.variant_title ? ` — ${item.variant_title}` : ''}${item.quantity > 1 ? ` × ${item.quantity}` : ''}
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:14px;color:#333;text-align:right;white-space:nowrap;">
            ${symbol} ${item.total_price.toLocaleString()}
          </td>
        </tr>`,
      )
      .join('');

    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Order Confirmed</title></head>
<body style="margin:0;padding:0;background:#f9f9f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e8e8e8;max-width:560px;">
        <tr><td style="background:#000;padding:24px 32px;">
          ${this.brandHeader(brandName)}
        </td></tr>
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111;">Order Confirmed!</h1>
          <p style="margin:0 0 24px;font-size:14px;color:#666;">Order <strong>${order.order_number}</strong> — Thank you for your purchase.</p>

          <table width="100%" cellpadding="0" cellspacing="0">
            ${itemRows}
          </table>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;border-top:2px solid #111;padding-top:16px;">
            <tr>
              <td style="font-size:13px;color:#999;padding:3px 0;">Subtotal</td>
              <td style="font-size:13px;color:#999;text-align:right;">${symbol} ${order.subtotal.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="font-size:13px;color:#999;padding:3px 0;">Shipping</td>
              <td style="font-size:13px;color:#999;text-align:right;">${symbol} ${(order.shipping_cost || 0).toLocaleString()}</td>
            </tr>
            <tr>
              <td style="font-size:15px;font-weight:700;color:#111;padding-top:10px;">Total</td>
              <td style="font-size:15px;font-weight:700;color:#111;text-align:right;padding-top:10px;">${symbol} ${order.total.toLocaleString()}</td>
            </tr>
          </table>

          <p style="margin:28px 0 0;font-size:13px;color:#999;">We'll send you another update when your order ships.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }

  private buildStaffOrderHtml(order: {
    order_number: string;
    email: string;
    subtotal: number;
    shipping_cost: number;
    total: number;
    currency: string;
    shipping_address?: {
      fullName?: string;
      address?: string;
      address2?: string;
      city?: string;
      region?: string;
      phone?: string;
    } | null;
    order_items?: {
      product_name: string;
      variant_title?: string | null;
      quantity: number;
      unit_price: number;
      total_price: number;
    }[];
  }): string {
    const symbol = order.currency === 'GHS' ? 'GH₵' : order.currency;
    const addr = order.shipping_address || {};

    const addressLines = [
      addr.fullName,
      addr.address,
      addr.address2,
      addr.city,
      addr.region,
    ]
      .filter(Boolean)
      .join('<br>');

    const itemRows = (order.order_items || [])
      .map(
        (item) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:14px;color:#111;">
            ${item.product_name}${item.variant_title ? ` — ${item.variant_title}` : ''}
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:14px;color:#111;text-align:center;">
            ${item.quantity}
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:14px;color:#111;text-align:right;white-space:nowrap;">
            ${symbol} ${item.total_price.toLocaleString()}
          </td>
        </tr>`,
      )
      .join('');

    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>New Order</title></head>
<body style="margin:0;padding:0;background:#f9f9f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;overflow:hidden;border:1px solid #e8e8e8;max-width:560px;">
        <tr><td style="background:#000;padding:24px 32px;display:flex;align-items:center;justify-content:space-between;">
          <p style="margin:0;font-size:22px;font-weight:700;color:#fff;letter-spacing:4px;display:inline;">IRIS</p>
          <span style="display:inline-block;margin-left:16px;background:#f59e0b;color:#000;font-size:11px;font-weight:700;letter-spacing:0.1em;padding:4px 10px;text-transform:uppercase;">New Order</span>
        </td></tr>
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 4px;font-size:20px;font-weight:700;color:#111;">New order to fulfil</h1>
          <p style="margin:0 0 28px;font-size:14px;color:#666;">Order <strong>${order.order_number}</strong></p>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr>
              <td width="50%" style="vertical-align:top;padding-right:16px;">
                <p style="margin:0 0 6px;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#999;">Customer</p>
                <p style="margin:0;font-size:14px;color:#111;">${addr.fullName || '—'}</p>
                <p style="margin:2px 0 0;font-size:14px;color:#555;">${order.email}</p>
                ${addr.phone ? `<p style="margin:2px 0 0;font-size:14px;color:#555;">${addr.phone}</p>` : ''}
              </td>
              <td width="50%" style="vertical-align:top;">
                <p style="margin:0 0 6px;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#999;">Ship to</p>
                <p style="margin:0;font-size:14px;color:#111;line-height:1.5;">${addressLines || '—'}</p>
              </td>
            </tr>
          </table>

          <p style="margin:0 0 10px;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#999;">Items to pick</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <th style="text-align:left;font-size:11px;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:0.08em;padding-bottom:8px;border-bottom:2px solid #111;">Product</th>
              <th style="text-align:center;font-size:11px;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:0.08em;padding-bottom:8px;border-bottom:2px solid #111;">Qty</th>
              <th style="text-align:right;font-size:11px;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:0.08em;padding-bottom:8px;border-bottom:2px solid #111;">Price</th>
            </tr>
            ${itemRows}
          </table>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;border-top:2px solid #111;padding-top:16px;">
            <tr>
              <td style="font-size:13px;color:#999;padding:3px 0;">Subtotal</td>
              <td style="font-size:13px;color:#999;text-align:right;">${symbol} ${order.subtotal.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="font-size:13px;color:#999;padding:3px 0;">Shipping</td>
              <td style="font-size:13px;color:#999;text-align:right;">${symbol} ${(order.shipping_cost || 0).toLocaleString()}</td>
            </tr>
            <tr>
              <td style="font-size:15px;font-weight:700;color:#111;padding-top:10px;">Total paid</td>
              <td style="font-size:15px;font-weight:700;color:#111;text-align:right;padding-top:10px;">${symbol} ${order.total.toLocaleString()}</td>
            </tr>
          </table>

          <p style="margin:28px 0 0;font-size:12px;color:#aaa;border-top:1px solid #f0f0f0;padding-top:20px;">
            Log in to the admin dashboard to update this order's status once it's packed and dispatched.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }

  private buildAllySaleConfirmationHtml(sale: {
    order_number: string;
    customer_name?: string | null;
    subtotal: number;
    total: number;
    currency: string;
    brand?: string;
    items?: {
      product_name: string;
      variant_title?: string | null;
      quantity: number;
      total_price: number;
    }[];
  }): string {
    const brandName = sale.brand || '1NRI';
    const symbol = sale.currency === 'GHS' ? 'GH₵' : sale.currency;
    const greeting = sale.customer_name ? `Hi ${sale.customer_name.split(' ')[0]},` : 'Hi,';

    const itemRows = (sale.items || [])
      .map(
        (item) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:14px;color:#333;">
            ${item.product_name}${item.variant_title ? ` — ${item.variant_title}` : ''}${item.quantity > 1 ? ` × ${item.quantity}` : ''}
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:14px;color:#333;text-align:right;white-space:nowrap;">
            ${symbol} ${item.total_price.toLocaleString()}
          </td>
        </tr>`,
      )
      .join('');

    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Purchase Confirmed</title></head>
<body style="margin:0;padding:0;background:#f9f9f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e8e8e8;max-width:560px;">
        <tr><td style="background:#000;padding:24px 32px;">
          ${this.brandHeader(brandName)}
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 4px;font-size:14px;color:#666;">${greeting}</p>
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111;">Thank you for your purchase!</h1>
          <p style="margin:0 0 24px;font-size:14px;color:#666;">Order <strong>${sale.order_number}</strong> — your payment has been received.</p>

          <table width="100%" cellpadding="0" cellspacing="0">
            ${itemRows}
          </table>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;border-top:2px solid #111;padding-top:16px;">
            <tr>
              <td style="font-size:15px;font-weight:700;color:#111;padding-top:4px;">Total Paid</td>
              <td style="font-size:15px;font-weight:700;color:#111;text-align:right;padding-top:4px;">${symbol} ${sale.total.toLocaleString()}</td>
            </tr>
          </table>

          <p style="margin:28px 0 0;font-size:13px;color:#999;">Thank you for shopping with ${brandName}.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }

  private buildShippingHtml(order: {
    order_number: string;
    tracking_number?: string | null;
    carrier?: string | null;
    brand?: string;
  }): string {
    const brandName = order.brand || '1NRI';
    const trackingBlock =
      order.tracking_number
        ? `<div style="margin:16px 0;padding:16px;background:#f9f9f9;border-radius:6px;font-size:14px;color:#333;">
             <strong>Carrier:</strong> ${order.carrier || 'N/A'}<br>
             <strong>Tracking number:</strong> ${order.tracking_number}
           </div>`
        : '';

    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Your order has shipped</title></head>
<body style="margin:0;padding:0;background:#f9f9f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e8e8e8;max-width:560px;">
        <tr><td style="background:#000;padding:24px 32px;">
          ${this.brandHeader(brandName)}
        </td></tr>
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111;">Your order is on its way!</h1>
          <p style="margin:0 0 16px;font-size:14px;color:#666;">Order <strong>${order.order_number}</strong> has shipped.</p>
          ${trackingBlock}
          <p style="margin:24px 0 0;font-size:13px;color:#999;">Thank you for shopping with ${brandName}.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }
}
