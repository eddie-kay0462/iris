import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';
import { LetsfishService } from '../letsfish/letsfish.service';
import { BulkSmsDto } from './dto/bulk-sms.dto';
import { RecipientPreviewDto } from './dto/recipient-preview.dto';
import { parsePhone } from '../common/utils/phone';

/** A profile row resolved into a sendable recipient. */
type Recipient = {
  name: string;
  firstName: string | null;
  /** The value as stored in profiles.phone_number, warts and all. */
  rawPhone: string;
  /** Normalized E.164, e.g. "+233241234567". */
  e164: string;
  isGhana: boolean;
  smsOptedIn: boolean;
};

type ResolvedRecipients = {
  /** Every parseable recipient, in the order profiles were fetched. */
  valid: Recipient[];
  internationalCount: number;
  /** Rows whose stored phone_number could not be parsed into a valid number. */
  invalidCount: number;
};

/** PostgREST caps a single response at 1000 rows, so profiles are paged in. */
const PROFILE_PAGE_SIZE = 1000;

@Injectable()
export class CommunicationsService {
  constructor(
    private supabase: SupabaseService,
    private letsfishService: LetsfishService,
  ) {}

  async getStatus() {
    const { configured, baseUrl, senderId } =
      await this.letsfishService.healthCheck();
    return { configured, baseUrl, senderId, provider: 'letsfish' };
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

  /**
   * Load every phone-bearing profile and classify it by country.
   *
   * Ghana detection cannot be pushed into SQL: phone_number is free text with no
   * constraint, and the live data holds E.164, local "0XXXXXXXXX", spreadsheet
   * artifacts like "'0241234567", spaced values and a double-trunk-zero form. So
   * each row is normalized with toE164(raw, 'GH') and classified in memory.
   */
  private async loadRecipients(): Promise<ResolvedRecipients> {
    const db = this.supabase.getAdminClient();

    const rows: Array<{
      first_name: string | null;
      last_name: string | null;
      phone_number: string | null;
      sms_notifications: boolean | null;
    }> = [];

    for (let from = 0; ; from += PROFILE_PAGE_SIZE) {
      const { data, error } = await db
        .from('profiles')
        .select('first_name, last_name, phone_number, sms_notifications')
        .not('phone_number', 'is', null)
        .order('first_name', { ascending: true, nullsFirst: false })
        .range(from, from + PROFILE_PAGE_SIZE - 1);

      if (error) throw error;
      rows.push(...(data || []));
      if (!data || data.length < PROFILE_PAGE_SIZE) break;
    }

    const valid: Recipient[] = [];
    let internationalCount = 0;
    let invalidCount = 0;

    for (const row of rows) {
      const rawPhone = row.phone_number as string;
      const parsed = parsePhone(rawPhone, 'GH');
      if (!parsed) {
        invalidCount++;
        continue;
      }
      const recipient: Recipient = {
        name:
          [row.first_name, row.last_name].filter(Boolean).join(' ') ||
          '(no name)',
        firstName: row.first_name,
        rawPhone,
        e164: parsed.e164,
        isGhana: parsed.country === 'GH',
        smsOptedIn: row.sms_notifications === true,
      };
      if (!recipient.isGhana) internationalCount++;
      valid.push(recipient);
    }

    return { valid, internationalCount, invalidCount };
  }

  /** Apply the recipient_filter / ghana_only controls to a resolved set. */
  private selectRecipients(
    resolved: ResolvedRecipients,
    filter: 'all' | 'sms_opted_in',
    ghanaOnly: boolean,
  ): Recipient[] {
    return resolved.valid.filter(
      (r) =>
        (!ghanaOnly || r.isGhana) &&
        (filter !== 'sms_opted_in' || r.smsOptedIn),
    );
  }

  async getPhoneCounts() {
    const resolved = await this.loadRecipients();
    const count = (filter: 'all' | 'sms_opted_in', ghanaOnly: boolean) =>
      this.selectRecipients(resolved, filter, ghanaOnly).length;

    return {
      total: count('all', false),
      sms_opted_in: count('sms_opted_in', false),
      ghana_total: count('all', true),
      ghana_sms_opted_in: count('sms_opted_in', true),
      international: resolved.internationalCount,
      invalid: resolved.invalidCount,
    };
  }

  private personalizeMessage(message: string, firstName: string | null): string {
    const name = firstName?.trim() || 'there';
    return message.replace(/\[name\]/gi, name);
  }

  async getRecipientPreview(dto: RecipientPreviewDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const from = (page - 1) * limit;

    const resolved = await this.loadRecipients();
    const selected = this.selectRecipients(
      resolved,
      dto.recipient_filter,
      dto.ghana_only === true,
    );

    const recipients = selected.slice(from, from + limit).map((r) => ({
      name: r.name,
      phone: r.e164,
      raw_phone: r.rawPhone,
      preview: this.personalizeMessage(dto.message, r.firstName),
    }));

    return {
      data: recipients,
      total: selected.length,
      page,
      limit,
      totalPages: Math.ceil(selected.length / limit),
      excluded: {
        international:
          dto.ghana_only === true ? resolved.internationalCount : 0,
        invalid: resolved.invalidCount,
      },
    };
  }

  async sendBulkSms(dto: BulkSmsDto): Promise<{
    total: number;
    succeeded: number;
    failed: number;
    skipped_international: number;
    skipped_invalid: number;
    errors: Array<{ phone: string; error: string }>;
  }> {
    const ghanaOnly = dto.ghana_only === true;
    const resolved = await this.loadRecipients();
    const selected = this.selectRecipients(
      resolved,
      dto.recipient_filter,
      ghanaOnly,
    );

    const recipients = selected.map((r) => ({
      // Always send the normalized number — a raw stored value like "'0241234567"
      // would otherwise reach the provider verbatim.
      phone: r.e164,
      message: this.personalizeMessage(dto.message, r.firstName),
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

    return {
      total: recipients.length,
      succeeded,
      failed,
      skipped_international: ghanaOnly
        ? this.selectRecipients(resolved, dto.recipient_filter, false).length -
          selected.length
        : 0,
      skipped_invalid: resolved.invalidCount,
      errors,
    };
  }
}
