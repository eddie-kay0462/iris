import { describe, it, expect } from 'vitest';
import { bucketOf, dayOf } from '../analytics/analytics.constants';
import {
  AGGREGATE_ITEM_NAME,
  aggregateLine,
  aggregateOrderNumber,
  aggregateTimestamp,
  countsAsOrder,
} from './aggregate-sale';

describe('aggregateLine', () => {
  it('puts all the money and all the units on one line', () => {
    expect(aggregateLine(4200, 86)).toEqual({
      quantity: 86,
      unit_price: 48.84,
      total_price: 4200,
    });
  });

  it('does not divide by zero when revenue came in with no unit count', () => {
    expect(aggregateLine(100, 0)).toEqual({
      quantity: 0,
      unit_price: 0,
      total_price: 100,
    });
  });

  it('accepts units with no revenue, for a sampling or giveaway day', () => {
    expect(aggregateLine(0, 5)).toEqual({
      quantity: 5,
      unit_price: 0,
      total_price: 0,
    });
  });

  it('rounds money to the cent', () => {
    // 1000/3 is 333.333…; the stored total stays exactly what was entered.
    const line = aggregateLine(1000, 3);
    expect(line.total_price).toBe(1000);
    expect(line.unit_price).toBe(333.33);
  });
});

describe('aggregateTimestamp', () => {
  it('anchors at noon UTC so no boundary or local-time read shifts the day', () => {
    expect(aggregateTimestamp('2025-11-03')).toBe('2025-11-03T12:00:00.000Z');
  });

  // The property that actually matters: the revenue has to land in the period the
  // pop-up happened in, not the period it was typed in.
  it('buckets into the month and day of the event, not of data entry', () => {
    const ts = aggregateTimestamp('2025-11-03');
    expect(bucketOf(ts, 'month')).toBe('2025-11');
    expect(dayOf(ts)).toBe('2025-11-03');
  });

  it('tolerates a full timestamp where a date was expected', () => {
    expect(aggregateTimestamp('2025-11-03T08:14:55.000Z')).toBe('2025-11-03T12:00:00.000Z');
  });
});

describe('aggregateOrderNumber', () => {
  const eventId = '1a2b3c4d-5e6f-7890-abcd-ef1234567890';

  it('carries the year of the event, not the year it was recorded', () => {
    expect(aggregateOrderNumber(eventId, '2025-11-03')).toBe('POP-2025-AGG-1A2B3C4D');
  });

  it('is deterministic, so re-saving reuses the number instead of burning a new one', () => {
    expect(aggregateOrderNumber(eventId, '2025-11-03')).toBe(
      aggregateOrderNumber(eventId, '2025-11-03'),
    );
  });

  /**
   * nextOrderNumber() scans POP-<year>-% and reads the third segment with
   * parseInt, keeping it only when Number.isFinite. 'AGG' must fail that guard,
   * or an aggregate would hijack the real POP sequence.
   */
  it('cannot perturb the POP sequence', () => {
    const seq = parseInt(aggregateOrderNumber(eventId, '2026-03-01').split('-')[2], 10);
    expect(Number.isFinite(seq)).toBe(false);
  });
});

describe('countsAsOrder', () => {
  it('keeps rung-up sales and drops the reconciliation row', () => {
    expect(countsAsOrder({ is_aggregate: false })).toBe(true);
    expect(countsAsOrder({ is_aggregate: true })).toBe(false);
  });

  it('treats a row predating the column as a real order', () => {
    expect(countsAsOrder({})).toBe(true);
    expect(countsAsOrder({ is_aggregate: null })).toBe(true);
  });
});

/**
 * The regression that matters most: one aggregate row must lift revenue and units
 * without touching any count or per-order average. This mirrors the split that
 * getEventAnalytics performs over the same shape of rows.
 */
describe('the revenue-in / count-out split', () => {
  const rungUp = [
    { is_aggregate: false, status: 'completed', total: 150 },
    { is_aggregate: false, status: 'completed', total: 250 },
  ];
  const aggregate = { is_aggregate: true, status: 'completed', total: 4200 };
  const all = [...rungUp, aggregate];

  const revenueOf = (rows: typeof all) => rows.reduce((s, o) => s + Number(o.total), 0);

  it('includes the unitemized total in revenue', () => {
    expect(revenueOf(all)).toBe(4600);
  });

  it('leaves it out of the order count and the average order value', () => {
    const real = all.filter(countsAsOrder);
    expect(real).toHaveLength(2);
    // 400/2, not 4600/3 — the aggregate would nearly quadruple this.
    expect(revenueOf(real) / real.length).toBe(200);
  });

  it('labels the line item so it explains itself wherever it surfaces', () => {
    expect(AGGREGATE_ITEM_NAME).toBe('Unitemized pop-up sales');
  });
});
