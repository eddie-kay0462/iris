/**
 * The two rules that decide how a pop-up behaves: when an event is over, and
 * when a sale is finished. Both are pure so they can be tested without Supabase
 * or Nest, and both are shared rather than re-derived per call site — the last
 * round of bugs came from each place deciding for itself.
 */

/** Ghana is UTC+0, so the UTC date is the local business day. */
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export interface EventDates {
  event_date?: string | null;
  end_date?: string | null;
  /**
   * Legacy. Nothing writes this any more, but events closed by hand before the
   * switch to dates still carry it, and one of them has no event_date at all —
   * so it is still honoured on the way in.
   */
  status?: string | null;
}

/**
 * Whether a pop-up is over and should stop taking orders.
 *
 * This replaces the old `status === 'closed'` check. Staff had to remember to
 * press Close, and when they didn't a finished pop-up kept accepting sales
 * forever; press it too early and the till locked mid-event. The dates are
 * already on the event and can't be forgotten.
 *
 * An event with no date at all is treated as ongoing — refusing orders on it
 * would strand a stand that simply hasn't filled the field in.
 */
export function hasFinished(event: EventDates, now = today()): boolean {
  // An event somebody explicitly closed stays closed, whatever its dates say.
  // Without this, a legacy event with no dates would quietly start accepting
  // orders again the moment the status stopped being checked.
  if (event.status === 'closed') return true;
  const last = event.end_date ?? event.event_date;
  return !!last && last.slice(0, 10) < now;
}

/** Whether today falls inside the event's own dates. */
export function isRunningToday(event: EventDates, now = today()): boolean {
  if (!event.event_date) return false;
  const start = event.event_date.slice(0, 10);
  const end = (event.end_date ?? event.event_date).slice(0, 10);
  return start <= now && now <= end;
}

/**
 * The dates an event should be saved with, or an error message.
 *
 * A single-day pop-up ends on the day it starts, so a missing end date is filled
 * in with the start date — every event then carries both ends of its own range
 * instead of each reader having to know the fallback. An end before the start
 * is refused rather than guessed at.
 */
export function normalizeEventDates(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
): { event_date: string | null; end_date: string | null } | { error: string } {
  const start = startDate ? startDate.slice(0, 10) : null;
  const end = endDate ? endDate.slice(0, 10) : start;
  if (start && end && end < start) {
    return { error: 'A pop-up can’t end before it starts.' };
  }
  return { event_date: start, end_date: end };
}

export interface UnstructuredSwitch {
  /** The value the event is being switched to. */
  toUnstructured: boolean;
  /** Rung-up sales on the event: not aggregates, not cancelled. */
  realOrderCount: number;
  /** Whether the event already carries recorded unitemized totals. */
  hasAggregate: boolean;
}

/**
 * Why a pop-up can't be switched between structured and unstructured, or null
 * if it can.
 *
 * An event holds either rung-up sales or one lump total, never both — both at
 * once is how the same money and units get counted twice. So a switch that
 * would leave the event holding the wrong kind of record is refused, and staff
 * clear that record first.
 */
export function unstructuredSwitchError(input: UnstructuredSwitch): string | null {
  if (input.toUnstructured && input.realOrderCount > 0) {
    return 'This pop-up already has rung-up sales, so it can’t be made unstructured. Cancel or refund them first.';
  }
  if (!input.toUnstructured && input.hasAggregate) {
    return 'This pop-up has recorded totals. Remove them before switching it back to taking individual orders.';
  }
  return null;
}

export interface SettlementInput {
  payment_method?: string | null;
  payment_reference?: string | null;
  hold_duration_minutes?: number | null;
  splits?: { method: string; reference?: string | null }[];
}

/**
 * Whether the money is already in and the sale is therefore finished.
 *
 * Everything used to be created as 'active' unless it was cash, and 'active' is
 * in no revenue whitelist — so a pop-up run on transfers or hand-typed MoMo
 * references reported GH₵ 0.00 while the orders sat in a tab, waiting for
 * someone to find "Mark as Completed" in a row menu. Nobody ever did.
 *
 * Only two things are genuinely unfinished:
 *   - a held ticket, which is deliberately parked; and
 *   - a MoMo charge the customer still has to approve on their phone, which
 *     carries no reference yet because `chargeOrder` mints it afterwards.
 *
 * A reference that staff typed in means they have already seen the money land —
 * a transfer alert, or the customer's own MoMo confirmation — so that settles.
 */
export function settlesAtTheTill(input: SettlementInput): boolean {
  if (input.hold_duration_minutes) return false;

  const splits = input.splits ?? [];
  if (splits.length > 0) {
    // A split settles only if every leg has: cash in the tin, or a reference.
    return splits.every((s) => s.method === 'cash' || !!s.reference);
  }

  if (input.payment_method === 'cash') return true;
  return !!input.payment_reference;
}
