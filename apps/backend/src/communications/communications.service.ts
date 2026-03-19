import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';
import { LetsfishService } from '../letsfish/letsfish.service';

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
}
