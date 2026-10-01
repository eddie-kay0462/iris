import { describe, it, expect } from 'vitest';
import { computeB2bFinancials } from './b2b-math';
import {
  canTransition,
  completionDateError,
  financialsLocked,
} from './b2b-rules';

describe('computeB2bFinancials', () => {
  it('adds up per-unit lines into a unit cost', () => {
    const f = computeB2bFinancials({
      units: 100,
      unitPrice: 150,
      costLines: [
        { kind: 'per_unit', amount: 40 },
        { kind: 'per_unit', amount: 12.5 },
      ],
    });
    expect(f.perUnitCost).toBe(52.5);
    expect(f.unitCost).toBe(52.5);
    expect(f.totalCost).toBe(5250);
    expect(f.revenue).toBe(15000);
    expect(f.grossProfit).toBe(9750);
    expect(f.marginPct).toBe(65);
    expect(f.markupPct).toBe(185.7);
  });

  it('spreads a one-off cost across the units', () => {
    const f = computeB2bFinancials({
      units: 200,
      unitPrice: 100,
      costLines: [
        { kind: 'per_unit', amount: 50 },
        { kind: 'per_order', amount: 500 },
      ],
    });
    expect(f.perOrderCost).toBe(500);
    expect(f.unitCost).toBe(52.5);
    expect(f.totalCost).toBe(10500);
    expect(f.grossProfit).toBe(9500);
  });

  it('keeps the total exact when a spread cost does not divide evenly', () => {
    const f = computeB2bFinancials({
      units: 3,
      unitPrice: 50,
      costLines: [{ kind: 'per_order', amount: 100 }],
    });
    expect(f.unitCost).toBe(33.33);
    expect(f.totalCost).toBe(100);
    expect(f.grossProfit).toBe(50);
  });

  it('reports a loss when the price is below cost', () => {
    const f = computeB2bFinancials({
      units: 10,
      unitPrice: 20,
      costLines: [{ kind: 'per_unit', amount: 25 }],
    });
    expect(f.grossProfit).toBe(-50);
    expect(f.marginPct).toBe(-25);
  });

  it('has no margin without revenue and no markup without cost', () => {
    const free = computeB2bFinancials({ units: 10, unitPrice: 0, costLines: [{ kind: 'per_unit', amount: 5 }] });
    expect(free.marginPct).toBeNull();
    const costless = computeB2bFinancials({ units: 10, unitPrice: 5, costLines: [] });
    expect(costless.markupPct).toBeNull();
    expect(costless.marginPct).toBe(100);
  });

  it('shows the per-unit cost while units are still empty', () => {
    const f = computeB2bFinancials({ units: 0, unitPrice: 10, costLines: [{ kind: 'per_unit', amount: 4 }] });
    expect(f.unitCost).toBe(4);
    expect(f.totalCost).toBe(0);
  });

  it('treats blank or garbage numbers as zero', () => {
    const f = computeB2bFinancials({
      units: Number.NaN,
      unitPrice: Number.NaN,
      costLines: [{ kind: 'per_unit', amount: Number.NaN }],
    });
    expect(f.totalCost).toBe(0);
    expect(f.revenue).toBe(0);
  });
});

describe('B2B status rules', () => {
  it('lets an order go from draft through to completed', () => {
    expect(canTransition('draft', 'confirmed')).toBe(true);
    expect(canTransition('confirmed', 'in_production')).toBe(true);
    expect(canTransition('in_production', 'completed')).toBe(true);
    expect(canTransition('confirmed', 'completed')).toBe(true);
  });

  it('does not complete a draft or a cancelled order directly', () => {
    expect(canTransition('draft', 'completed')).toBe(false);
    expect(canTransition('cancelled', 'completed')).toBe(false);
  });

  it('reopens a completed order and restores a cancelled one', () => {
    expect(canTransition('completed', 'in_production')).toBe(true);
    expect(canTransition('completed', 'cancelled')).toBe(false);
    expect(canTransition('cancelled', 'draft')).toBe(true);
  });

  it('locks financials only once an order is completed or cancelled', () => {
    expect(financialsLocked('in_production')).toBe(false);
    expect(financialsLocked('completed')).toBe(true);
    expect(financialsLocked('cancelled')).toBe(true);
  });

  it('allows backdating a completion but not a future date', () => {
    const now = new Date('2026-09-30T10:00:00Z');
    expect(completionDateError(new Date('2026-03-01'), now)).toBeNull();
    expect(completionDateError(new Date('2026-09-30'), now)).toBeNull();
    expect(completionDateError(new Date('2026-10-01'), now)).not.toBeNull();
    expect(completionDateError(new Date('nope'), now)).not.toBeNull();
  });
});
