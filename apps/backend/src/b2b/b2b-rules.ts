export const B2B_STATUSES = [
  'draft',
  'confirmed',
  'in_production',
  'completed',
  'cancelled',
] as const;

export type B2bStatus = (typeof B2B_STATUSES)[number];

/** Orders still being worked on: counted as pipeline, not revenue. */
export const B2B_OPEN_STATUSES: B2bStatus[] = ['draft', 'confirmed', 'in_production'];

/**
 * Where an order may move from each status. Completing is allowed straight from
 * `confirmed` because many orders are delivered without a tracked production
 * step. A completed order reopens to `in_production`; a cancelled one is
 * restored to `draft` so it is checked again before it counts.
 */
export const B2B_STATUS_TRANSITIONS: Record<B2bStatus, B2bStatus[]> = {
  draft: ['confirmed', 'cancelled'],
  confirmed: ['draft', 'in_production', 'completed', 'cancelled'],
  in_production: ['confirmed', 'completed', 'cancelled'],
  completed: ['in_production'],
  cancelled: ['draft'],
};

export function canTransition(from: B2bStatus, to: B2bStatus): boolean {
  return B2B_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Units, price and costs are frozen once an order is completed (it is already
 * in the revenue figures) or cancelled. Reopen or restore it to change them.
 */
export function financialsLocked(status: B2bStatus): boolean {
  return status === 'completed' || status === 'cancelled';
}

/**
 * Validate a completion date. Past dates are allowed so historical orders can
 * be backdated; a future one would book revenue that hasn't happened.
 * Returns an error message, or null when the date is fine.
 */
export function completionDateError(completedAt: Date, now: Date = new Date()): string | null {
  if (Number.isNaN(completedAt.getTime())) return 'Completion date is not a valid date';
  // A date picked as "today" arrives as midnight UTC, so compare whole days.
  const endOfToday = new Date(now);
  endOfToday.setUTCHours(23, 59, 59, 999);
  if (completedAt.getTime() > endOfToday.getTime()) {
    return 'An order cannot be completed in the future';
  }
  return null;
}
