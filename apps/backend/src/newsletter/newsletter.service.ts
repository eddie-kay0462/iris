import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';

@Injectable()
export class NewsletterService {
  constructor(private supabase: SupabaseService) {}

  async subscribe(email: string) {
    const db = this.supabase.getAdminClient();

    // Upsert — if email already exists, just update subscribed_at
    const { error } = await db
      .from('newsletter_subscribers')
      .upsert(
        { email: email.toLowerCase().trim(), subscribed_at: new Date().toISOString() },
        { onConflict: 'email' },
      );

    if (error) throw error;

    return { ok: true };
  }

  async findAll(query: { page?: string; limit?: string }) {
    const db = this.supabase.getAdminClient();
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '50', 10);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, count, error } = await db
      .from('newsletter_subscribers')
      .select('*', { count: 'exact' })
      .order('subscribed_at', { ascending: false })
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
}
