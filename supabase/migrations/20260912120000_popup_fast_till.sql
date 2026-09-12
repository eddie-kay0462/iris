-- Ringing up a pop-up sale was costing roughly fourteen round trips to the
-- database, most of them one after another. At venue wifi latency that is a
-- second and a half of a staff member standing there while a customer waits.
-- Two of those trips are replaced here with one call each.
--
-- 1. Order numbers were allocated by reading the 200 newest rows and taking the
--    max in JavaScript — a scan per sale, wrapped in a five-attempt retry loop
--    because two tills could read the same number. Same read-then-increment
--    race the pre-order numbers had (20260829000001), same fix, except pop-up
--    numbers restart each year (POP-2026-0001) so a plain sequence won't do.
--
-- 2. Stock was deducted with a select, an update and an insert per variant,
--    from application code. Besides the round trips that is a lost update: two
--    tills selling the last of a variant both read the same `before` and the
--    second write silently overwrites the first.

-- ─── 1. Atomic pop-up order numbers ──────────────────────────────────────────

create table if not exists public.popup_order_counters (
  year       integer primary key,
  last_value bigint  not null default 0
);

comment on table public.popup_order_counters is
  'One row per year holding the last POP-YYYY-NNNN number issued. Written only '
  'by next_popup_order_number().';

alter table public.popup_order_counters enable row level security;
grant all on table public.popup_order_counters to service_role;

-- Seed from the numbers already issued so the first allocation continues each
-- year''s series instead of colliding with history. Aggregate reconciliation
-- rows are POP-YYYY-AGG-XXXXXXXX and deliberately fail this pattern, so they
-- never enter the count.
insert into public.popup_order_counters (year, last_value)
select
  (substring(order_number from '^POP-([0-9]{4})-'))::integer,
  max((substring(order_number from '^POP-[0-9]{4}-([0-9]+)$'))::bigint)
from public.popup_orders
where order_number ~ '^POP-[0-9]{4}-[0-9]+$'
group by 1
on conflict (year) do nothing;

/**
 * Allocate the next POP-YYYY-NNNN number for a year.
 *
 * The upsert is a single atomic statement, so two tills ringing up at the same
 * moment get different numbers without any locking or retrying in the caller.
 */
create or replace function public.next_popup_order_number(p_year integer)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n bigint;
begin
  insert into public.popup_order_counters as c (year, last_value)
  values (p_year, 1)
  on conflict (year) do update set last_value = c.last_value + 1
  returning c.last_value into v_n;

  return 'POP-' || p_year::text || '-' || lpad(v_n::text, 4, '0');
end;
$$;

grant execute on function public.next_popup_order_number(integer) to service_role;

comment on function public.next_popup_order_number(integer) is
  'Allocates the next POP-YYYY-NNNN number atomically. The only sanctioned way '
  'to mint a pop-up order number.';

-- ─── 2. Atomic stock deduction ───────────────────────────────────────────────

/**
 * Deduct a completed pop-up order's stock and write the matching
 * inventory_movements rows, in one call.
 *
 * Quantities are summed per variant first: two lines for the same variant would
 * otherwise be applied twice over the same starting value. Rows are locked in
 * variant_id order so two tills holding the same pair of variants can't
 * deadlock, and the FOR UPDATE is what makes the read-modify-write safe.
 *
 * quantity_change records what actually moved rather than what was asked for,
 * so an oversell clamped at zero is recorded honestly.
 */
create or replace function public.popup_apply_stock(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r             record;
  v_before      integer;
  v_after       integer;
  v_order_number text;
begin
  select order_number into v_order_number
  from public.popup_orders
  where id = p_order_id;

  for r in
    select variant_id, sum(quantity)::integer as qty
    from public.popup_order_items
    where order_id = p_order_id
      and variant_id is not null
    group by variant_id
    order by variant_id
  loop
    select coalesce(inventory_quantity, 0) into v_before
    from public.product_variants
    where id = r.variant_id
    for update;

    if not found then
      continue;
    end if;

    v_after := greatest(0, v_before - r.qty);

    update public.product_variants
    set inventory_quantity = v_after
    where id = r.variant_id;

    insert into public.inventory_movements (
      variant_id, quantity_change, quantity_before, quantity_after,
      movement_type, reference_id, reference_type, notes
    )
    values (
      r.variant_id, -(v_before - v_after), v_before, v_after,
      'sale', p_order_id, 'popup_order',
      'Pop-up order ' || coalesce(v_order_number, '') || ' completed'
    );
  end loop;
end;
$$;

grant execute on function public.popup_apply_stock(uuid) to service_role;

comment on function public.popup_apply_stock(uuid) is
  'Deducts a completed pop-up order''s stock and logs the movements atomically.';
