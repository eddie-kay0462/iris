import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../common/supabase/supabase.service';
import { toLetsFishFormat } from '../common/utils/phone';

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

  private get baseHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': this.authHeader,
      'User-Agent': 'Mozilla/5.0 (compatible; Iris/1.0)',
    };
  }

  isConfigured(): boolean {
    return !!(this.appId && this.appSecret);
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
        headers: this.baseHeaders,
        body: JSON.stringify({
          sender_id: this.senderId,
          message,
          recipients: [toLetsFishFormat(phone)],
        }),
      });

      const text = await response.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(`LetsFish returned non-JSON (HTTP ${response.status}): ${text.substring(0, 200)}`);
      }

      success = response.ok && data.success === true;
      messageId = data.data?.[0]?.reference;
      if (!success) {
        const errObj = data.error || data;
        errorMessage = errObj.detail || errObj.message || errObj.title || JSON.stringify(errObj);
        this.logger.error(`LetsFish SMS rejected: ${errorMessage}`);
      }
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
        headers: this.baseHeaders,
        body: JSON.stringify({ otp, phone: toLetsFishFormat(phone) }),
      });

      const text = await response.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(`LetsFish returned non-JSON (HTTP ${response.status}): ${text.substring(0, 200)}`);
      }

      success = response.ok && data.success === true;
      callId = data.data?.call_id;
      if (!success) {
        const errObj = data.error || data;
        errorMessage = errObj.detail || errObj.message || errObj.title || JSON.stringify(errObj);
      }
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
