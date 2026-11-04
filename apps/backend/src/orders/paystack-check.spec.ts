import { describe, expect, it } from 'vitest';
import { paystackCoversOrder } from './paystack-check';

const tx = (over: Partial<{ status: string | null; amount: number | null; currency: string | null }> = {}) => ({
  status: 'success',
  amount: 45000,
  currency: 'GHS',
  ...over,
});

describe('paystackCoversOrder', () => {
  it('accepts a successful GHS charge for exactly the order total', () => {
    expect(paystackCoversOrder(tx(), 450)).toBe(true);
  });

  it('accepts an overpayment', () => {
    expect(paystackCoversOrder(tx({ amount: 45100 }), 450)).toBe(true);
  });

  it('accepts a numeric-string total as Postgres numeric columns return it', () => {
    expect(paystackCoversOrder(tx(), '450.00')).toBe(true);
  });

  it('handles totals with pesewas without float drift', () => {
    // 19.99 * 100 = 1998.9999999999998 in floating point
    expect(paystackCoversOrder(tx({ amount: 1999 }), 19.99)).toBe(true);
    expect(paystackCoversOrder(tx({ amount: 1998 }), 19.99)).toBe(false);
  });

  it('rejects an underpayment, e.g. a tampered 1-pesewa popup charge', () => {
    expect(paystackCoversOrder(tx({ amount: 1 }), 450)).toBe(false);
    expect(paystackCoversOrder(tx({ amount: 44999 }), 450)).toBe(false);
  });

  it('rejects any status other than success', () => {
    for (const status of ['failed', 'abandoned', 'ongoing', 'pending', 'reversed', null]) {
      expect(paystackCoversOrder(tx({ status }), 450)).toBe(false);
    }
  });

  it('rejects a charge in another currency', () => {
    expect(paystackCoversOrder(tx({ currency: 'USD', amount: 45000 }), 450)).toBe(false);
    expect(paystackCoversOrder(tx({ currency: null }), 450)).toBe(false);
  });

  it('accepts a lowercase currency code', () => {
    expect(paystackCoversOrder(tx({ currency: 'ghs' }), 450)).toBe(true);
  });

  it('rejects a missing transaction or unusable amounts', () => {
    expect(paystackCoversOrder(null, 450)).toBe(false);
    expect(paystackCoversOrder(tx({ amount: null }), 450)).toBe(false);
    expect(paystackCoversOrder(tx(), 'not-a-number')).toBe(false);
  });
});
