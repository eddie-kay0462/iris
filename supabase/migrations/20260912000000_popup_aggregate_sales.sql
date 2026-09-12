-- Some pop-ups are too busy to ring up sale by sale. Afterwards all the team
-- knows is the two numbers off the stall's paper tally: how much money came in,
-- and how many units went out. Those numbers had nowhere to live, so the whole
-- pop-up was invisible — no revenue in any report, no units on the public Road
-- to HQ counter.
--
-- An "aggregate" order is how one of those pop-ups gets recorded: a single
-- reconciliation row standing in for the event, carrying the total revenue, with
-- a single line item carrying the total units and no product attached. Because
-- it is a real popup_orders row in a revenue status, every figure that *sums*
-- (revenue, units, Road to HQ) picks it up with no special handling at all.
--
-- What does need handling is the other half: anything that *counts* orders,
-- averages per order, attributes to a product or brand, or identifies a
-- customer must leave it out — one row standing in for a hundred sales would
-- wreck an order count or an average order value. That is what this flag is for.

alter table public.popup_orders
  add column if not exists is_aggregate boolean not null default false;

comment on column public.popup_orders.is_aggregate is
  'A reconciliation row standing in for a past pop-up nobody could ring up individually: '
  'one order, one line item, no product, no customer. Sums (revenue, units, Road to HQ) '
  'are meant to include it; counts, per-order averages, per-product attribution and '
  'customer metrics must exclude it.';

-- At most one aggregate per event. This is what makes the figures editable in
-- place: a re-save corrects the existing row instead of stacking a second one
-- and double-counting the pop-up's revenue.
create unique index if not exists popup_orders_one_aggregate_per_event
  on public.popup_orders (event_id)
  where is_aggregate;

-- NOT NULL DEFAULT false rather than nullable, so every count-based metric can
-- filter with a plain `.eq('is_aggregate', false)` instead of an or/is-null dance.
