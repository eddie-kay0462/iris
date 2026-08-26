-- Pop-up collections: hand-over tracking for storefront pre-orders that chose
-- "collect at the pop-up" instead of delivery.
--
-- Those orders already carry shipping_method = 'popup_pickup' and a resolved
-- pickup_date, but nothing tied them to an actual popup_events row and nothing
-- recorded the hand-over. Staff working a pop-up had no list of who was coming
-- to collect what.
--
-- popup_event_id is filled in at checkout when a matching event already exists.
-- It is nullable on purpose: the pickup date is resolved from a weekday +
-- lead-time setting, so a customer can legitimately book a collection before
-- the event row for that week has been created. The admin view falls back to
-- matching pickup_date against each event's date range, which also means every
-- order placed before this migration still shows up.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS popup_event_id           UUID REFERENCES public.popup_events(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS collected_at             TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS collected_by             UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pickup_reminder_sent_at  TIMESTAMPTZ;

COMMENT ON COLUMN public.orders.popup_event_id IS
  'For shipping_method = popup_pickup: the pop-up event this order is collected at, when one existed at checkout. NULL falls back to matching pickup_date against event dates.';
COMMENT ON COLUMN public.orders.collected_at IS
  'When the customer physically collected at the pop-up stand. Set alongside status = delivered.';
COMMENT ON COLUMN public.orders.collected_by IS
  'The staff member who handed the order over.';
COMMENT ON COLUMN public.orders.pickup_reminder_sent_at IS
  'When the day-of "your collection is today" reminder went out. Also the guard that stops it sending twice.';

-- The collections list for an event, and the cron's daily sweep, both filter on
-- pickup orders by date — a partial index keeps them off the full orders table.
CREATE INDEX IF NOT EXISTS idx_orders_popup_pickup_date
  ON public.orders (pickup_date)
  WHERE shipping_method = 'popup_pickup' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_orders_popup_event
  ON public.orders (popup_event_id)
  WHERE popup_event_id IS NOT NULL;

-- Backfill: attach existing pickup orders to the event whose date range covers
-- their pickup date. Where two events overlap, the earliest-starting one wins,
-- which matches how the admin view resolves ties.
UPDATE public.orders o
SET popup_event_id = e.id
FROM (
  SELECT DISTINCT ON (ev.event_date) ev.id, ev.event_date, COALESCE(ev.end_date, ev.event_date) AS last_date
  FROM public.popup_events ev
  ORDER BY ev.event_date, ev.created_at
) e
WHERE o.shipping_method = 'popup_pickup'
  AND o.popup_event_id IS NULL
  AND o.pickup_date IS NOT NULL
  AND o.pickup_date BETWEEN e.event_date AND e.last_date;
