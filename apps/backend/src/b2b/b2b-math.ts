/**
 * The B2B order calculator. The API stores `total_cost` from this, and the
 * admin order form runs an identical copy (apps/admin/lib/b2b-math.ts) so the
 * live figures on screen match what gets saved. Change both together.
 */

export type B2bCostKind = 'per_unit' | 'per_order';

export interface B2bCostLine {
  kind: B2bCostKind;
  amount: number;
}

export interface B2bFinancials {
  /** Sum of the per-unit lines: the cost of one unit before one-off costs. */
  perUnitCost: number;
  /** Sum of the one-off, whole-order lines. */
  perOrderCost: number;
  /** Everything it costs to make one unit, one-off costs spread across the units. */
  unitCost: number;
  totalCost: number;
  revenue: number;
  grossProfit: number;
  /** Gross profit as a % of revenue. Null when there is no revenue to divide by. */
  marginPct: number | null;
  /** Gross profit as a % of cost. Null when the order costs nothing. */
  markupPct: number | null;
}

const round2 = (v: number): number => Math.round(v * 100) / 100;
const round1 = (v: number): number => Math.round(v * 10) / 10;
const money = (v: number): number => (Number.isFinite(v) ? v : 0);

export function computeB2bFinancials(input: {
  units: number;
  unitPrice: number;
  costLines: B2bCostLine[];
}): B2bFinancials {
  const units = Math.max(0, Math.floor(money(input.units)));
  const unitPrice = money(input.unitPrice);

  let perUnitCost = 0;
  let perOrderCost = 0;
  for (const line of input.costLines) {
    if (line.kind === 'per_order') perOrderCost += money(line.amount);
    else perUnitCost += money(line.amount);
  }

  // Totals are built from the unrounded parts so a spread one-off cost doesn't
  // lose or gain pesewas: 100 ÷ 3 units shows as 33.33 each but totals 100.
  const totalCost = perUnitCost * units + perOrderCost;
  const revenue = unitPrice * units;
  const grossProfit = revenue - totalCost;
  const unitCost = units > 0 ? totalCost / units : perUnitCost;

  return {
    perUnitCost: round2(perUnitCost),
    perOrderCost: round2(perOrderCost),
    unitCost: round2(unitCost),
    totalCost: round2(totalCost),
    revenue: round2(revenue),
    grossProfit: round2(grossProfit),
    marginPct: revenue > 0 ? round1((grossProfit / revenue) * 100) : null,
    markupPct: totalCost > 0 ? round1((grossProfit / totalCost) * 100) : null,
  };
}
