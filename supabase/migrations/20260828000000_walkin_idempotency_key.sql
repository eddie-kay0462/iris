-- Walk-in sales are rung up at a counter, so the create POST must be safe to
-- retry: a lost response previously left staff staring at a failure toast for a
-- sale that had actually been recorded, and re-entering it would double-count
-- revenue and double-deduct stock.
--
-- The client sends one key per open cart. A repeat POST with the same key
-- returns the order that already exists instead of creating a second one.

alter table public.walkin_orders
  add column if not exists idempotency_key text;

-- Partial: historical rows (and any caller that omits the key) stay unconstrained.
create unique index if not exists walkin_orders_idempotency_key_uniq
  on public.walkin_orders (idempotency_key)
  where idempotency_key is not null;

comment on column public.walkin_orders.idempotency_key is
  'Client-generated key, one per counter cart. Makes POST /walkin-sales/orders retry-safe.';
