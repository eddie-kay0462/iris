import { round2 } from '../analytics/analytics.constants';

/**
 * A pop-up too busy to ring up sale by sale is recorded as one "aggregate"
 * order: the event's whole takings on a single popup_orders row, and its whole
 * unit count on a single popup_order_items row with no product attached.
 *
 * Everything in here is pure so it can be tested without Supabase or Nest —
 * the shape of this row is load-bearing for revenue reports and the public Road
 * to HQ counter, and the rules below are the parts worth pinning down.
 */

/** The line-item name. Self-labelling, because it surfaces in sales-by-product. */
export const AGGREGATE_ITEM_NAME = 'Unitemized pop-up sales';

/**
 * Noon UTC on the event's own date.
 *
 * Backdating is the whole point: the reports engine windows and buckets on
 * `created_at`, so a row stamped `now()` would file a pop-up from March into
 * this month's revenue. Ghana is UTC+0 and `dayOf`/`bucketOf` slice UTC, so
 * midnight would bucket correctly too — noon is chosen so that a `gte`/`lte`
 * boundary, or any reader that goes through local time (`getHours()`), cannot
 * slide the row into the adjacent day.
 *
 * For a multi-day pop-up this is the *start* date: it's the date the event hub
 * card leads with, so it's the one staff reconcile against. A multi-day event
 * straddling a month boundary therefore books entirely to the first month.
 */
export function aggregateTimestamp(eventDate: string): string {
  return `${eventDate.slice(0, 10)}T12:00:00.000Z`;
}

/**
 * Deterministic, so re-saving an event's totals reuses the same number instead
 * of burning a new one from the POP sequence.
 *
 * It carries the *event's* year, not the current one — a pop-up from last year
 * should not be numbered as if it happened today. It also deliberately does not
 * go through `nextOrderNumber()`: that helper scans `POP-<year>-%` and reads the
 * third segment with `parseInt`, which is `NaN` for 'AGG' and so is skipped by
 * its existing `Number.isFinite` guard. An aggregate can never perturb the real
 * sequence.
 */
export function aggregateOrderNumber(eventId: string, eventDate: string): string {
  return `POP-${eventDate.slice(0, 4)}-AGG-${eventId.slice(0, 8).toUpperCase()}`;
}

/** One aggregate order always owns exactly one of these. */
export interface AggregateLine {
  quantity: number;
  unit_price: number;
  total_price: number;
}

/**
 * The single line item: all the units, all the money.
 *
 * `unit_price` is a derived average shown only in the order detail view, so it
 * is allowed to drift from `total_price / quantity` by a cent — no metric
 * anywhere multiplies a popup item's `unit_price` by its `quantity`, they all
 * read `total_price`. Units with no revenue (sampling, giveaways) and revenue
 * with no units are both legitimate, so neither is rejected here.
 */
export function aggregateLine(revenue: number, units: number): AggregateLine {
  const total = round2(revenue);
  return {
    quantity: units,
    unit_price: units > 0 ? round2(revenue / units) : 0,
    total_price: total,
  };
}

/**
 * Whether a pop-up order row should count toward an order count, a per-order
 * average, or a customer figure. Aggregates carry real money but stand in for an
 * unknown number of real sales, so they are sums-only.
 */
export function countsAsOrder(row: { is_aggregate?: boolean | null }): boolean {
  return !row.is_aggregate;
}
