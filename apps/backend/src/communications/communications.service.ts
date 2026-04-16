import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';
import { LetsfishService } from '../letsfish/letsfish.service';
import { BulkSmsDto } from './dto/bulk-sms.dto';
import { RecipientPreviewDto } from './dto/recipient-preview.dto';

@Injectable()
export class CommunicationsService {
  constructor(
    private supabase: SupabaseService,
    private letsfishService: LetsfishService,
  ) {}

  async getStatus() {
    const { configured, baseUrl } = await this.letsfishService.healthCheck();
    return { configured, baseUrl, provider: 'letsfish' };
  }

  async getLogs(page = 1, limit = 50) {
    const db = this.supabase.getAdminClient();
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, count, error } = await db
      .from('communication_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    return {
      data: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  }

  async sendTestSms(phone: string, message: string) {
    return this.letsfishService.sendSms(phone, message);
  }

  async sendTestCall(phone: string, otp: string) {
    return this.letsfishService.makeOtpCall(phone, otp);
  }

  async getPhoneCounts() {
    const db = this.supabase.getAdminClient();
    const [allResult, optedResult] = await Promise.all([
      db
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .not('phone_number', 'is', null),
      db
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .not('phone_number', 'is', null)
        .eq('sms_notifications', true),
    ]);
    return { total: allResult.count || 0, sms_opted_in: optedResult.count || 0 };
  }

  private personalizeMessage(message: string, firstName: string | null): string {
    const name = firstName?.trim() || 'there';
    return message.replace(/\[name\]/gi, name);
  }

  async getRecipientPreview(dto: RecipientPreviewDto) {
    const db = this.supabase.getAdminClient();
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = db
      .from('profiles')
      .select('first_name, last_name, phone_number', { count: 'exact' })
      .not('phone_number', 'is', null)
      .order('first_name', { ascending: true, nullsFirst: false })
      .range(from, to);

    if (dto.recipient_filter === 'sms_opted_in') {
      query = query.eq('sms_notifications', true);
    }

    const { data, count, error } = await query;
    if (error) throw error;

    const recipients = (data || []).map((r) => ({
      name: [r.first_name, r.last_name].filter(Boolean).join(' ') || '(no name)',
      phone: r.phone_number as string,
      preview: this.personalizeMessage(dto.message, r.first_name),
    }));

    return {
      data: recipients,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  }

  async sendBulkSms(dto: BulkSmsDto): Promise<{
    total: number;
    succeeded: number;
    failed: number;
    errors: Array<{ phone: string; error: string }>;
  }> {
    const db = this.supabase.getAdminClient();
    let query = db
      .from('profiles')
      .select('phone_number, first_name')
      .not('phone_number', 'is', null);
    if (dto.recipient_filter === 'sms_opted_in') {
      query = query.eq('sms_notifications', true);
    }
    const { data, error } = await query;
    if (error) throw error;

    const recipients = (data || []).map((r) => ({
      phone: r.phone_number as string,
      message: this.personalizeMessage(dto.message, r.first_name),
    }));

    let succeeded = 0;
    let failed = 0;
    const errors: Array<{ phone: string; error: string }> = [];

    const BATCH_SIZE = 5;
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async ({ phone, message }) => {
          try {
            const result = await this.letsfishService.sendSms(phone, message);
            if (result.success) {
              succeeded++;
            } else {
              failed++;
              errors.push({ phone, error: 'Send failed' });
            }
          } catch (err: any) {
            failed++;
            errors.push({ phone, error: err.message });
          }
        }),
      );
      if (i + BATCH_SIZE < recipients.length) {
        await new Promise((r) => setTimeout(r, 200));
      }
    }
    return { total: recipients.length, succeeded, failed, errors };
  }
}
