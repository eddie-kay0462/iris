import { BadRequestException, Injectable } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';
import { fetchAll, num } from '../analytics/reports/report-context';
import { B2B_OPEN_STATUSES, B2B_STATUSES } from '../b2b/b2b-rules';

/**
 * One CSV cell. Free text (client names, titles, cost labels) that starts with
 * = + - @ would run as a formula when the file is opened in a spreadsheet, so
 * it is prefixed with an apostrophe. Numbers are left as they are.
 */
function csvCell(val: unknown): string {
  if (val === null || val === undefined) return '';
  let str = String(val);
  if (typeof val === 'string' && /^[=+\-@\t\r]/.test(str)) str = `'${str}`;
  return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

@Injectable()
export class ExportService {
  constructor(private supabase: SupabaseService) {}

  /**
   * Every B2B order with its client, pricing, costs and timeline. `status` is a
   * single status or 'open' (not yet completed or cancelled).
   */
  async exportB2bOrders(query: { status?: string }): Promise<string> {
    const { status } = query;
    if (status && status !== 'open' && !(B2B_STATUSES as readonly string[]).includes(status)) {
      throw new BadRequestException(`Unknown status "${status}"`);
    }
    const db = this.supabase.getAdminClient();

    const rows = await fetchAll<any>((a, b) => {
      let q = db
        .from('b2b_orders')
        .select(
          'order_number, title, status, units, unit_price, total_cost, revenue, gross_profit, ' +
            'expected_start_date, expected_delivery_date, completed_at, cancelled_at, created_at, notes, ' +
            'client:b2b_clients(name, contact_name, contact_phone, contact_email), ' +
            'cost_lines:b2b_order_cost_lines(label, kind, amount, sort_order)',
        )
        .order('created_at', { ascending: false })
        .range(a, b);
      if (status === 'open') q = q.in('status', B2B_OPEN_STATUSES);
      else if (status) q = q.eq('status', status);
      return q;
    });

    const headers = [
      'order_number', 'title', 'client', 'contact_name', 'contact_phone', 'contact_email', 'status',
      'units', 'unit_price', 'unit_cost', 'total_cost', 'revenue', 'gross_profit', 'margin_pct',
      'per_unit_costs', 'per_order_costs', 'expected_start_date', 'expected_delivery_date',
      'completed_at', 'cancelled_at', 'created_at', 'notes',
    ];

    const costList = (lines: any[], kind: string) =>
      lines
        .filter((l) => l.kind === kind)
        .sort((x, y) => x.sort_order - y.sort_order)
        .map((l) => `${l.label}: ${num(l.amount).toFixed(2)}`)
        .join('; ');

    const body = rows.map((o) => {
      const client = Array.isArray(o.client) ? o.client[0] : o.client;
      const lines = o.cost_lines ?? [];
      const revenue = num(o.revenue);
      const record: Record<string, unknown> = {
        ...o,
        client: client?.name,
        contact_name: client?.contact_name,
        contact_phone: client?.contact_phone,
        contact_email: client?.contact_email,
        unit_cost: o.units > 0 ? (num(o.total_cost) / o.units).toFixed(2) : '',
        margin_pct: revenue > 0 ? ((num(o.gross_profit) / revenue) * 100).toFixed(1) : '',
        per_unit_costs: costList(lines, 'per_unit'),
        per_order_costs: costList(lines, 'per_order'),
      };
      return headers.map((h) => csvCell(record[h])).join(',');
    });

    return [headers.join(','), ...body].join('\n');
  }

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
      .select('title, handle, base_price, status, published, gender, product_type, vendor, tags, created_at')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[exportProducts] Supabase error:', error);
      throw error;
    }

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
