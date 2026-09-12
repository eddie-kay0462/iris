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
