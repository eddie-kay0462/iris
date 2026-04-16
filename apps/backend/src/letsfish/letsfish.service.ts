import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../common/supabase/supabase.service';

@Injectable()
export class LetsfishService {
  private readonly logger = new Logger(LetsfishService.name);
  private readonly appId: string;
  private readonly appSecret: string;
  private readonly baseUrl: string;
  private readonly senderId: string;

  constructor(
    private configService: ConfigService,
    private supabase: SupabaseService,
  ) {
    this.appId = this.configService.get<string>('LETSFISH_APP_ID', '');
    this.appSecret = this.configService.get<string>('LETSFISH_APP_SECRET', '');
    this.baseUrl = this.configService.get<string>(
      'LETSFISH_BASE_URL',
      'https://api.letsfish.africa/v1',
    );
    this.senderId = this.configService.get<string>('LETSFISH_SENDER_ID', 'Iris');
  }

  private get authHeader(): string {
    return `Bearer ${this.appId}.${this.appSecret}`;
  }

  isConfigured(): boolean {
    return !!(this.appId && this.appSecret);
  }

  // LetsFish expects international format without +: 233241234567
  private normalizePhone(phone: string): string {
    // Remove spaces and strip leading +
    let p = phone.trim().replace(/\s+/g, '').replace(/^\+/, '');

    // Ghanaian local format: starts with 0, exactly 10 digits (0 + 9-digit subscriber)
    // e.g. 0241234567 → 233241234567
    if (/^0\d{9}$/.test(p)) {
      p = '233' + p.slice(1);
    }

    return p;
  }

  async sendSms(phone: string, message: string): Promise<{ success: boolean; messageId?: string }> {
    if (!this.isConfigured()) {
      throw new Error('LetsFish credentials (LETSFISH_APP_ID, LETSFISH_APP_SECRET) are not configured');
    }

    let success = false;
    let messageId: string | undefined;
    let errorMessage: string | undefined;

    try {
      const response = await fetch(`${this.baseUrl}/sms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: this.authHeader,
        },
        body: JSON.stringify({
          sender_id: this.senderId,
          message,
          recipients: [this.normalizePhone(phone)],
        }),
      });

      const data = (await response.json()) as any;
      success = response.ok && data.success === true;
      messageId = data.data?.[0]?.reference;
      if (!success)
        errorMessage =
          data.message || data.error || JSON.stringify(data) || `HTTP ${response.status}`;
      if (!success) this.logger.error(`LetsFish SMS rejected: ${errorMessage}`);
    } catch (err: any) {
      errorMessage = err.message;
      this.logger.error(`LetsFish SMS error: ${err.message}`);
    }

    await this.logMessage('sms', phone, message, success, errorMessage);
    return { success, messageId };
  }

  async makeOtpCall(phone: string, otp: string): Promise<{ success: boolean; callId?: string }> {
    if (!this.isConfigured()) {
      throw new Error('LetsFish credentials (LETSFISH_APP_ID, LETSFISH_APP_SECRET) are not configured');
    }

    let success = false;
    let callId: string | undefined;
    let errorMessage: string | undefined;

    try {
      const response = await fetch(`${this.baseUrl}/voice-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: this.authHeader,
        },
        body: JSON.stringify({ otp, phone: this.normalizePhone(phone) }),
      });

      const data = (await response.json()) as any;
      success = response.ok && data.success === true;
      callId = data.data?.call_id;
      if (!success) errorMessage = data.message || `HTTP ${response.status}`;
    } catch (err: any) {
      errorMessage = err.message;
      this.logger.error(`LetsFish Voice OTP error: ${err.message}`);
    }

    await this.logMessage('voice_otp', phone, 'Voice OTP call', success, errorMessage);
    return { success, callId };
  }

  async healthCheck(): Promise<{ configured: boolean; baseUrl: string }> {
    return {
      configured: this.isConfigured(),
      baseUrl: this.baseUrl,
    };
  }

  private async logMessage(
    type: 'sms' | 'voice_otp',
    phone: string,
    message: string,
    success: boolean,
    errorMessage?: string,
  ): Promise<void> {
    try {
      const db = this.supabase.getAdminClient();
      await db.from('communication_logs').insert({
        type,
        recipient_phone: phone,
        message,
        status: success ? 'sent' : 'failed',
        provider: 'letsfish',
        metadata: errorMessage ? { error: errorMessage } : null,
      });
    } catch (err: any) {
      this.logger.error(`Failed to write communication log: ${err.message}`);
    }
  }
}
