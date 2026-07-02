// Single source of truth for which statuses count as revenue across all
// analytics. Pending/unpaid online orders and open/held popup orders are
// excluded everywhere so every metric compares the same population.
export const ONLINE_REVENUE_STATUSES = ['paid', 'processing', 'shipped', 'delivered'];
export const POPUP_REVENUE_STATUSES = ['confirmed', 'completed'];
export const ALLY_REVENUE_STATUSES = ['completed'];

// Ghana is UTC+0, so UTC day bucketing matches local business days.
export const dayOf = (iso: string): string => iso.slice(0, 10);

export const round2 = (v: number): number => Math.round(v * 100) / 100;

export type Granularity = 'day' | 'week' | 'month';

export function bucketOf(dateStr: string, granularity: Granularity): string {
  const d = new Date(dateStr);
  if (granularity === 'month') {
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  }
  if (granularity === 'week') {
    const day = d.getUTCDay() || 7;
    const monday = new Date(d);
    monday.setUTCDate(d.getUTCDate() - day + 1);
    return monday.toISOString().slice(0, 10);
  }
  return dayOf(dateStr);
}

// Enumerate every bucket between from/to so series have no gaps.
export function bucketRange(from: string, to: string, granularity: Granularity): string[] {
  const buckets: string[] = [];
  const cursor = new Date(from);
  const end = new Date(to);
  cursor.setUTCHours(0, 0, 0, 0);
  let guard = 0;
  while (cursor <= end && guard < 1500) {
    buckets.push(bucketOf(cursor.toISOString(), granularity));
    if (granularity === 'month') cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    else if (granularity === 'week') cursor.setUTCDate(cursor.getUTCDate() + 7);
    else cursor.setUTCDate(cursor.getUTCDate() + 1);
    guard++;
  }
  return Array.from(new Set(buckets));
}
