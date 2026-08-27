-- A pre-order is a GROUP of rows, one per line item, all sharing one
-- `order_number` — there is no group-level row. Every reader already assumes
-- this: `updateGroupStatus`/`findGroup` filter with `.eq('order_number', …)`
-- and never `.single()`, `orders.service.findAdmin` groups pre-orders by
-- order_number to synthesise an order, and the delivery_fee migration
-- (20260729000000) documents the convention in as many words.
--
-- The table definition never got the memo. `order_number text NOT NULL UNIQUE`
-- has been on the table since 20260409000001, so the second line item of any
-- multi-item pre-order was rejected with a unique violation. Single-item
-- pre-orders worked, which is why this stayed hidden — every pre-order in the
-- table is exactly one row. In production it surfaced as a 500 on
-- POST /api/walkin-sales/preorders, after the first item had already been
-- written, leaving an orphaned half-order behind.
--
-- Drop the uniqueness; keep an index, because order_number is a lookup key.

do $$
declare
  c text;
begin
  -- Look the constraint up rather than assuming the default name, in case the
  -- table was ever recreated by hand.
  select con.conname into c
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'preorders'
    and con.contype = 'u'
    and array_length(con.conkey, 1) = 1
    and (
      select att.attname from pg_attribute att
      where att.attrelid = con.conrelid and att.attnum = con.conkey[1]
    ) = 'order_number';
  if c is not null then
    execute format('alter table public.preorders drop constraint %I', c);
  end if;
end $$;

create index if not exists idx_preorders_order_number
  on public.preorders (order_number);

comment on column public.preorders.order_number is
  'Shared by every line item in one pre-order. Deliberately NOT unique — a pre-order is a group of rows, not a single row.';
