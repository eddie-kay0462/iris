-- A pop-up order was rung up with no protection against a repeated request.
-- Flaky venue wifi, a double-tap on the save button, or a retry after a lost
-- response all charged the customer's cart to the till twice, and the staff
-- member at the stand had no way to tell the duplicate from the real sale.
--
-- Same shape as the walk-in key (20260828000000): the stall UI mints one id per
-- cart and sends it with the create request; a second request carrying a key
-- that has already been used gets the existing order back instead of a new one.
--
-- Partial unique index rather than a UNIQUE constraint, so the many historical
-- rows with a NULL key don't collide with each other.

alter table public.popup_orders
  add column if not exists idempotency_key text;

create unique index if not exists popup_orders_idempotency_key_uniq
  on public.popup_orders (idempotency_key)
  where idempotency_key is not null;

comment on column public.popup_orders.idempotency_key is
  'Client-minted id for one cart. Guards against a retried create ringing the same sale up twice.';
