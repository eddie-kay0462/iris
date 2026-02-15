import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';

@Injectable()
export class ExportService {
  constructor(private supabase: SupabaseService) {}

  async exportOrders(query: { status?: string; from_date?: string; to_date?: string }): Promise<string> {
    const db = this.supabase.getAdminClient();

    let q = db
      .from('orders')
      .select('order_number, email, status, subtotal, discount, shipping_cost, tax, total, currency, payment_provider, payment_reference, payment_status, tracking_number, carrier, created_at')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (query.status) q = q.eq('status', query.status);
    if (query.from_date) q = q.gte('created_at', query.from_date);
    if (query.to_date) q = q.lte('created_at', query.to_date);

    const { data, error } = await q;
    if (error) throw error;

    const rows = data || [];
    if (rows.length === 0) return 'No data to export';

    const headers = Object.keys(rows[0]);
    const csvRows = [
      headers.join(','),
      ...rows.map((row) =>
        headers.map((h) => {
          const val = (row as any)[h];
          if (val === null || val === undefined) return '';
          const str = String(val);
          return str.includes(',') || str.includes('"') || str.includes('\n')
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        }).join(','),
      ),
    ];

    return csvRows.join('\n');
  }

  async exportProducts(): Promise<string> {
    const db = this.supabase.getAdminClient();

    const { data, error } = await db
      .from('products')
      .select('title, handle, base_price, compare_at_price, status, published, gender, product_type, vendor, tags, created_at')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const rows = data || [];
    if (rows.length === 0) return 'No data to export';

    const headers = Object.keys(rows[0]);
    const csvRows = [
      headers.join(','),
      ...rows.map((row) =>
        headers.map((h) => {
          const val = (row as any)[h];
          if (val === null || val === undefined) return '';
          const str = Array.isArray(val) ? val.join('; ') : String(val);
          return str.includes(',') || str.includes('"') || str.includes('\n')
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        }).join(','),
      ),
    ];

    return csvRows.join('\n');
  }
}
