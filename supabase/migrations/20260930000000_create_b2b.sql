-- B2B: bulk orders placed by business clients, tracked alongside the D2C
-- channels (online, pop-up, walk-in).
--
-- A B2B order is not itemised against the catalogue. It is a number of units
-- sold at one price per unit, with the cost of making them built up from named
-- cost lines. It touches no stock.
--
-- Revenue and Road to HQ units count only once an order is `completed`, and
-- they are dated by `completed_at` rather than `created_at`: an order agreed in
-- March and delivered in June is June revenue. Nothing is written to a running
-- counter, so reopening or cancelling an order reverses its effect everywhere.
--
-- The backend uses the service role (bypasses RLS); the policies below protect
-- direct client access, as for walk-in orders.

-- ─── Clients ──────────────────────────────────────────────────────────────────

create table public.b2b_clients (
  id             uuid primary key default gen_random_uuid(),
  name           text not null check (length(trim(name)) > 0),
  contact_name   text,
  contact_phone  text, -- E.164, normalised by the API
  contact_email  text,
  notes          text,
  archived_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- One live client per company name, so the same business isn't entered twice.
create unique index b2b_clients_name_unique
  on public.b2b_clients (lower(trim(name)))
  where archived_at is null;

-- ─── Orders ───────────────────────────────────────────────────────────────────

create sequence if not exists public.b2b_order_number_seq as bigint start with 1;

create table public.b2b_orders (
  id                      uuid primary key default gen_random_uuid(),
  order_number            text not null unique, -- B2B-0001
  client_id               uuid not null references public.b2b_clients(id) on delete restrict,
  title                   text not null check (length(trim(title)) > 0),
  notes                   text,
  status                  text not null default 'draft'
                            check (status in ('draft', 'confirmed', 'in_production', 'completed', 'cancelled')),
  units                   integer not null check (units >= 1),
  unit_price              numeric(12, 2) not null check (unit_price >= 0),
  -- Sum of every cost line for the whole order (per-unit lines × units plus
  -- per-order lines). Computed by the API from the lines, never typed in.
  total_cost              numeric(12, 2) not null default 0 check (total_cost >= 0),
  revenue                 numeric(14, 2) generated always as (units * unit_price) stored,
  gross_profit            numeric(14, 2) generated always as (units * unit_price - total_cost) stored,
  expected_start_date     date,
  expected_delivery_date  date,
  completed_at            timestamptz,
  cancelled_at            timestamptz,
  created_by              uuid references public.profiles(id) on delete set null,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint b2b_orders_timeline_order
    check (expected_start_date is null or expected_delivery_date is null
           or expected_delivery_date >= expected_start_date),
  constraint b2b_orders_completed_at_matches_status
    check ((status = 'completed') = (completed_at is not null))
);

create index idx_b2b_orders_client on public.b2b_orders (client_id);
create index idx_b2b_orders_status on public.b2b_orders (status);
-- Every revenue query filters completed orders by completion date.
create index idx_b2b_orders_completed_at
  on public.b2b_orders (completed_at)
  where status = 'completed';

comment on column public.b2b_orders.completed_at is
  'When the order was delivered. B2B revenue and Road to HQ units are dated by this, '
  'not created_at, and count only while status = completed.';

-- ─── Cost lines ───────────────────────────────────────────────────────────────

create table public.b2b_order_cost_lines (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.b2b_orders(id) on delete cascade,
  label       text not null check (length(trim(label)) > 0),
  -- per_unit: amount is the cost of one unit (fabric, printing).
  -- per_order: amount is a one-off for the whole order (setup, delivery),
  -- spread across the units when showing the unit cost.
  kind        text not null default 'per_unit' check (kind in ('per_unit', 'per_order')),
  amount      numeric(12, 2) not null check (amount >= 0),
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create index idx_b2b_order_cost_lines_order on public.b2b_order_cost_lines (order_id, sort_order);

-- ─── updated_at ───────────────────────────────────────────────────────────────

create or replace function public.update_b2b_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_b2b_clients_updated_at
  before update on public.b2b_clients
  for each row execute function public.update_b2b_updated_at();

create trigger trg_b2b_orders_updated_at
  before update on public.b2b_orders
  for each row execute function public.update_b2b_updated_at();

-- ─── Order numbers ────────────────────────────────────────────────────────────

/** Allocate the next B2B order number atomically: B2B-0001, B2B-0002, … */
create or replace function public.next_b2b_order_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n bigint := nextval('public.b2b_order_number_seq');
begin
  -- lpad truncates past its width, so widen it once the series outgrows 4 digits.
  return 'B2B-' || lpad(v_n::text, greatest(4, length(v_n::text)), '0');
end;
$$;

grant execute on function public.next_b2b_order_number() to service_role;

-- ─── Financials, atomically ───────────────────────────────────────────────────

/**
 * Replace an order's units, price, total cost and cost lines in one
 * transaction. PostgREST has no multi-statement transactions, and a
 * delete-then-insert of the lines from the API could otherwise leave an order
 * with no lines, or with a total_cost that no longer matches them.
 *
 * p_lines: [{ "label": text, "kind": "per_unit" | "per_order", "amount": numeric }]
 * in display order. The API computes p_total_cost from the same lines.
 */
create or replace function public.set_b2b_order_financials(
  p_order_id    uuid,
  p_units       integer,
  p_unit_price  numeric,
  p_total_cost  numeric,
  p_lines       jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.b2b_orders
  set units = p_units,
      unit_price = p_unit_price,
      total_cost = p_total_cost
  where id = p_order_id;

  if not found then
    raise exception 'B2B order % not found', p_order_id using errcode = 'P0002';
  end if;

  delete from public.b2b_order_cost_lines where order_id = p_order_id;

  insert into public.b2b_order_cost_lines (order_id, label, kind, amount, sort_order)
  select p_order_id,
         trim(line->>'label'),
         coalesce(line->>'kind', 'per_unit'),
         (line->>'amount')::numeric,
         (ord - 1)::integer
  from jsonb_array_elements(coalesce(p_lines, '[]'::jsonb)) with ordinality as t(line, ord);
end;
$$;

grant execute on function public.set_b2b_order_financials(uuid, integer, numeric, numeric, jsonb)
  to service_role;

-- ─── RLS ──────────────────────────────────────────────────────────────────────

alter table public.b2b_clients enable row level security;
alter table public.b2b_orders enable row level security;
alter table public.b2b_order_cost_lines enable row level security;

create policy "Admin roles can read b2b_clients"
  on public.b2b_clients for select
  using (exists (select 1 from public.profiles
                 where profiles.id = auth.uid()
                 and profiles.role in ('admin', 'manager', 'staff')));

create policy "Managers can manage b2b_clients"
  on public.b2b_clients for all
  using (exists (select 1 from public.profiles
                 where profiles.id = auth.uid()
                 and profiles.role in ('admin', 'manager')));

create policy "Admin roles can read b2b_orders"
  on public.b2b_orders for select
  using (exists (select 1 from public.profiles
                 where profiles.id = auth.uid()
                 and profiles.role in ('admin', 'manager', 'staff')));

create policy "Managers can manage b2b_orders"
  on public.b2b_orders for all
  using (exists (select 1 from public.profiles
                 where profiles.id = auth.uid()
                 and profiles.role in ('admin', 'manager')));

create policy "Admin roles can read b2b_order_cost_lines"
  on public.b2b_order_cost_lines for select
  using (exists (select 1 from public.profiles
                 where profiles.id = auth.uid()
                 and profiles.role in ('admin', 'manager', 'staff')));

create policy "Managers can manage b2b_order_cost_lines"
  on public.b2b_order_cost_lines for all
  using (exists (select 1 from public.profiles
                 where profiles.id = auth.uid()
                 and profiles.role in ('admin', 'manager')));

grant all on table public.b2b_clients to authenticated, service_role;
grant all on table public.b2b_orders to authenticated, service_role;
grant all on table public.b2b_order_cost_lines to authenticated, service_role;
