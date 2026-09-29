-- Whether a pop-up is rung up sale by sale is something the team decides up
-- front, not something to discover afterwards. Until now any finished pop-up
-- offered "Record Unitemized Totals", so nothing stopped a lump total being
-- booked on top of sales that had already been rung up — the one real way to
-- double count a pop-up's revenue and its Road to HQ units.
--
-- An *unstructured* pop-up is one where orders are never captured: all that is
-- recorded is its total revenue and units sold, as the single aggregate order
-- described in 20260912000000. A structured pop-up uses the till as normal and
-- never carries an aggregate. The API keeps the two apart; this is the flag it
-- reads.

alter table public.popup_events
  add column if not exists is_unstructured boolean not null default false;

comment on column public.popup_events.is_unstructured is
  'True when this pop-up records only its total revenue and units (one is_aggregate '
  'popup_orders row) instead of individual orders. Unstructured events take no till '
  'orders; structured events take no aggregate.';

-- Pop-ups that already had their totals recorded were unstructured in all but
-- name. Flag them so their totals stay visible and editable.
update public.popup_events
set is_unstructured = true
where id in (
  select event_id from public.popup_orders where is_aggregate
);
