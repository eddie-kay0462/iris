-- Ally stock allocations (consignment model).
--
-- Allocating stock to an ally physically moves units out of central inventory
-- (handled in the backend: product_variants.inventory_quantity is decremented
-- and an inventory_movements 'transfer' row is logged). This table tracks how
-- much each ally currently holds: total = central inventory + Σ(ally on_hand).

create table if not exists public.ally_stock_allocations (
  id                 uuid primary key default gen_random_uuid(),
  ally_id            uuid not null references public.allies(id) on delete cascade,
  variant_id         uuid not null references public.product_variants(id) on delete restrict,
  quantity_allocated integer not null default 0,   -- cumulative units ever allocated
  quantity_returned  integer not null default 0,   -- units sent back to central
  quantity_sold      integer not null default 0,   -- units sold by the ally
  on_hand            integer generated always as
                       (quantity_allocated - quantity_returned - quantity_sold) stored,
  allocated_by       uuid,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (ally_id, variant_id)
);

create index if not exists idx_ally_stock_allocations_ally on public.ally_stock_allocations (ally_id);

-- Grants BEFORE enabling RLS — service_role bypasses RLS but still needs the
-- table GRANT, or backend writes fail with "42501: permission denied".
grant all privileges on table public.ally_stock_allocations to service_role;

alter table public.ally_stock_allocations enable row level security;

create policy "Service role has full access to ally_stock_allocations"
  on public.ally_stock_allocations for all to service_role
  using (true) with check (true);

-- ── Auto-decrement on ally sale ────────────────────────────────────────────
-- When an ally sale completes, decrement the ally's on-hand for each sold
-- variant. Sale line items previously didn't record which variant was sold, so
-- add variant_id (the allies app populates it from the cart going forward).

alter table public.ally_sale_items
  add column if not exists variant_id uuid references public.product_variants(id);

-- Reduce an ally's on-hand for a single variant (only touches existing
-- allocations — selling un-allocated stock is allowed, just not tracked).
create or replace function public.consume_one_ally_allocation(
  p_ally_id uuid, p_variant_id uuid, p_qty integer
) returns void
language plpgsql security definer set search_path = public
as $$
begin
  if p_variant_id is null or p_qty is null or p_qty <= 0 then
    return;
  end if;
  update public.ally_stock_allocations
  set quantity_sold = quantity_sold + p_qty,
      updated_at    = now()
  where ally_id = p_ally_id and variant_id = p_variant_id;
end;
$$;

-- Trigger A: a sale transitions into 'completed' (items already exist).
-- Covers cash-on-receipt and Paystack/bank flows (pending → completed).
create or replace function public.consume_ally_allocations_on_sale_complete()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare r record;
begin
  -- Skip if it was already completed — don't double-count on re-saves.
  if tg_op = 'UPDATE' and old.status is not distinct from 'completed' then
    return new;
  end if;
  for r in
    select variant_id, sum(quantity)::int as qty
    from public.ally_sale_items
    where sale_id = new.id and variant_id is not null
    group by variant_id
  loop
    perform public.consume_one_ally_allocation(new.ally_id, r.variant_id, r.qty);
  end loop;
  return new;
end;
$$;

create trigger trg_consume_ally_allocations_sale
  after insert or update of status on public.ally_sales
  for each row
  when (new.status = 'completed')
  execute function public.consume_ally_allocations_on_sale_complete();

-- Trigger B: an item is inserted into an already-completed sale. Covers the
-- immediate-cash flow, where the sale row is inserted 'completed' *before* its
-- line items, so trigger A sees no items yet. The two triggers fire on disjoint
-- timings, so there's no double counting.
create or replace function public.consume_ally_allocation_on_item()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare v_ally uuid; v_status text;
begin
  select ally_id, status into v_ally, v_status
  from public.ally_sales where id = new.sale_id;
  if v_status = 'completed' then
    perform public.consume_one_ally_allocation(v_ally, new.variant_id, new.quantity);
  end if;
  return new;
end;
$$;

create trigger trg_consume_ally_allocation_item
  after insert on public.ally_sale_items
  for each row
  execute function public.consume_ally_allocation_on_item();
