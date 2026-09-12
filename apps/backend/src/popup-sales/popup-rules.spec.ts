import { describe, it, expect } from 'vitest';
import {
  hasFinished,
  isRunningToday,
  settlesAtTheTill,
} from './popup-rules';

/**
 * This truth table is the fix for "Session Revenue shows GH₵ 0.00". Everything
 * but cash used to be created as 'active', which is in no revenue whitelist, so
 * a pop-up run on transfers or hand-typed MoMo references reported nothing.
 */
describe('settlesAtTheTill', () => {
  it('settles cash', () => {
    expect(settlesAtTheTill({ payment_method: 'cash' })).toBe(true);
  });

  it('settles a bank transfer once staff have a reference', () => {
    expect(
      settlesAtTheTill({
        payment_method: 'bank_transfer',
        payment_reference: 'TRF-99812',
      }),
    ).toBe(true);
  });

  it('settles MoMo when staff typed the customer’s own confirmation in', () => {
    expect(
      settlesAtTheTill({ payment_method: 'momo', payment_reference: '0244123456-8891' }),
    ).toBe(true);
  });

  // The one case that must stay unfinished: chargeOrder mints the reference
  // afterwards, so its absence is what marks a charge as still in flight.
  it('leaves an interactive MoMo charge waiting for the customer', () => {
    expect(settlesAtTheTill({ payment_method: 'momo' })).toBe(false);
  });

  it('leaves a bank transfer with no reference waiting', () => {
    expect(settlesAtTheTill({ payment_method: 'bank_transfer' })).toBe(false);
  });

  it('never settles a parked ticket, however it was paid', () => {
    expect(
      settlesAtTheTill({ payment_method: 'cash', hold_duration_minutes: 30 }),
    ).toBe(false);
    expect(
      settlesAtTheTill({
        hold_duration_minutes: 30,
        splits: [{ method: 'cash' }],
      }),
    ).toBe(false);
  });

  describe('splits', () => {
    it('settles when every leg is cash', () => {
      expect(
        settlesAtTheTill({ splits: [{ method: 'cash' }, { method: 'cash' }] }),
      ).toBe(true);
    });

    it('settles a mixed split when the non-cash leg carries a reference', () => {
      expect(
        settlesAtTheTill({
          splits: [{ method: 'cash' }, { method: 'momo', reference: 'PSK-1' }],
        }),
      ).toBe(true);
    });

    it('waits when any leg is still unaccounted for', () => {
      expect(
        settlesAtTheTill({
          splits: [{ method: 'cash' }, { method: 'momo' }],
        }),
      ).toBe(false);
    });

    it('ignores the top-level method, which a split has no single answer for', () => {
      // A leftover radio value used to file split sales under whichever button
      // happened to be selected; the legs are the truth.
      expect(
        settlesAtTheTill({
          payment_method: 'cash',
          splits: [{ method: 'momo' }],
        }),
      ).toBe(false);
    });
  });
});

/**
 * Replaces the Close / Activate Event buttons. Staff had to remember to press
 * Close, and a pop-up nobody closed kept accepting sales forever.
 */
describe('hasFinished', () => {
  const now = '2026-09-12';

  it('is over the day after it ends', () => {
    expect(hasFinished({ event_date: '2026-09-11' }, now)).toBe(true);
  });

  it('is not over while it is still on', () => {
    expect(hasFinished({ event_date: '2026-09-12' }, now)).toBe(false);
  });

  it('is not over before it starts', () => {
    expect(hasFinished({ event_date: '2026-09-20' }, now)).toBe(false);
  });

  it('runs to the end date of a multi-day pop-up', () => {
    const multiDay = { event_date: '2026-09-10', end_date: '2026-09-14' };
    expect(hasFinished(multiDay, now)).toBe(false);
    expect(hasFinished(multiDay, '2026-09-15')).toBe(true);
  });

  // Refusing orders on an event that simply hasn't had its date filled in would
  // strand the stand, so an undated event stays open.
  it('treats an undated event as ongoing', () => {
    expect(hasFinished({}, now)).toBe(false);
    expect(hasFinished({ event_date: null, end_date: null }, now)).toBe(false);
  });

  it('tolerates a full timestamp where a date was expected', () => {
    expect(hasFinished({ event_date: '2026-09-11T18:30:00.000Z' }, now)).toBe(true);
  });

  /**
   * The Close button is gone, but events closed by hand before the switch still
   * carry the status — and one of them has no event_date at all, so without this
   * it would quietly start accepting orders again.
   */
  it('keeps honouring an event that was explicitly closed', () => {
    expect(hasFinished({ status: 'closed', event_date: null, end_date: null }, now)).toBe(true);
    expect(hasFinished({ status: 'closed', event_date: '2026-09-20' }, now)).toBe(true);
  });

  it('does not treat draft or active as finished', () => {
    expect(hasFinished({ status: 'draft', event_date: '2026-09-12' }, now)).toBe(false);
    expect(hasFinished({ status: 'active', event_date: '2026-09-12' }, now)).toBe(false);
  });
});

describe('isRunningToday', () => {
  const now = '2026-09-12';

  it('is on for a single-day pop-up dated today', () => {
    expect(isRunningToday({ event_date: '2026-09-12' }, now)).toBe(true);
  });

  it('is on anywhere inside a multi-day range, including both ends', () => {
    const multiDay = { event_date: '2026-09-10', end_date: '2026-09-14' };
    expect(isRunningToday(multiDay, now)).toBe(true);
    expect(isRunningToday(multiDay, '2026-09-10')).toBe(true);
    expect(isRunningToday(multiDay, '2026-09-14')).toBe(true);
    expect(isRunningToday(multiDay, '2026-09-15')).toBe(false);
  });

  it('is off for past and future pop-ups, and for undated ones', () => {
    expect(isRunningToday({ event_date: '2026-09-11' }, now)).toBe(false);
    expect(isRunningToday({ event_date: '2026-09-13' }, now)).toBe(false);
    expect(isRunningToday({}, now)).toBe(false);
  });
});
