-- ================================================
-- Allies App — Supabase Migration (idempotent)
-- Safe to run multiple times.
-- ================================================

-- 1. Allies table (partner profiles)
create table if not exists public.allies (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade unique,
  full_name       text not null,
  email           text not null unique,
  phone           text,
  location        text not null,
  location_type   text not null check (location_type in ('campus', 'city')),
  commission_rate numeric(5,4) not null default 0.15,
  is_active       boolean not null default true,
  joined_at       timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

alter table public.allies enable row level security;

drop policy if exists "allies_select_authenticated" on public.allies;
create policy "allies_select_authenticated"
  on public.allies for select
  using (auth.role() = 'authenticated');

drop policy if exists "allies_update_own" on public.allies;
create policy "allies_update_own"
  on public.allies for update
  using (auth.uid() = user_id);


-- 2. Ally Sales table
create table if not exists public.ally_sales (
  id               uuid primary key default gen_random_uuid(),
  order_number     text not null unique default ('ALS-' || floor(random() * 900000 + 100000)::text),
  ally_id          uuid not null references public.allies(id) on delete restrict,
  customer_name    text,
  customer_phone   text,
  customer_email   text,
  payment_method   text not null check (payment_method in ('cash', 'momo', 'bank_transfer')),
  subtotal         numeric(12,2) not null,
  total            numeric(12,2) not null,
  commission_amount numeric(12,2) not null,
  notes            text,
  status           text not null default 'completed' check (status in ('completed', 'pending', 'refunded')),
  sale_date        timestamptz not null default now(),
  created_at       timestamptz not null default now()
);

alter table public.ally_sales enable row level security;

drop policy if exists "ally_sales_select_authenticated" on public.ally_sales;
create policy "ally_sales_select_authenticated"
  on public.ally_sales for select
  using (auth.role() = 'authenticated');

drop policy if exists "ally_sales_insert_own" on public.ally_sales;
create policy "ally_sales_insert_own"
  on public.ally_sales for insert
  with check (
    ally_id = (select id from public.allies where user_id = auth.uid())
  );

drop policy if exists "ally_sales_update_own" on public.ally_sales;
create policy "ally_sales_update_own"
  on public.ally_sales for update
  using (
    ally_id = (select id from public.allies where user_id = auth.uid())
  );


-- 3. Ally Sale Items table
create table if not exists public.ally_sale_items (
  id            uuid primary key default gen_random_uuid(),
  sale_id       uuid not null references public.ally_sales(id) on delete cascade,
  product_id    uuid references public.products(id),
  product_name  text not null,
  variant_title text,
  sku           text,
  unit_price    numeric(12,2) not null,
  quantity      integer not null default 1,
  total_price   numeric(12,2) not null
);

alter table public.ally_sale_items enable row level security;

drop policy if exists "ally_sale_items_select_authenticated" on public.ally_sale_items;
create policy "ally_sale_items_select_authenticated"
  on public.ally_sale_items for select
  using (auth.role() = 'authenticated');

drop policy if exists "ally_sale_items_insert_own" on public.ally_sale_items;
create policy "ally_sale_items_insert_own"
  on public.ally_sale_items for insert
  with check (
    sale_id in (
      select id from public.ally_sales
      where ally_id = (select id from public.allies where user_id = auth.uid())
    )
  );


-- ================================================
-- INDEXES
-- ================================================
create index if not exists idx_ally_sales_ally_id on public.ally_sales(ally_id);
create index if not exists idx_ally_sales_sale_date on public.ally_sales(sale_date desc);
create index if not exists idx_ally_sales_customer_email on public.ally_sales(customer_email);
create index if not exists idx_ally_sale_items_sale_id on public.ally_sale_items(sale_id);
create index if not exists idx_allies_user_id on public.allies(user_id);

-- ================================================
-- GRANTS — required for PostgREST / supabase-js access
-- ================================================
grant usage on schema public to anon, authenticated, service_role;
grant all on public.allies to service_role;
grant all on public.ally_sales to service_role;
grant all on public.ally_sale_items to service_role;
grant select, insert, update on public.allies to authenticated;
grant select, insert, update on public.ally_sales to authenticated;
grant select, insert on public.ally_sale_items to authenticated;


-- ================================================
-- 4. Paystack payment columns on ally_sales
-- ================================================
alter table public.ally_sales
  add column if not exists payment_reference text,
  add column if not exists paystack_customer_code text,
  add column if not exists virtual_account_number text,
  add column if not exists virtual_account_bank text;

-- Extend status check to include awaiting_payment
alter table public.ally_sales
  drop constraint if exists ally_sales_status_check;
alter table public.ally_sales
  add constraint ally_sales_status_check
    check (status in ('completed', 'pending', 'refunded', 'awaiting_payment'));


-- ================================================
-- 5. Ally sale refunds table
-- ================================================
create table if not exists public.ally_sale_refunds (
  id                  uuid primary key default gen_random_uuid(),
  sale_id             uuid not null references public.ally_sales(id) on delete cascade,
  amount              numeric(12,2) not null,
  reason              text,
  status              text not null default 'processed',
  paystack_refund_id  text,
  paystack_response   jsonb,
  initiated_by        uuid references public.allies(id),
  created_at          timestamptz not null default now()
);

alter table public.ally_sale_refunds enable row level security;

drop policy if exists "ally_sale_refunds_select" on public.ally_sale_refunds;
create policy "ally_sale_refunds_select"
  on public.ally_sale_refunds for select
  using (auth.role() = 'authenticated');

drop policy if exists "ally_sale_refunds_insert" on public.ally_sale_refunds;
create policy "ally_sale_refunds_insert"
  on public.ally_sale_refunds for insert
  with check (
    initiated_by = (select id from public.allies where user_id = auth.uid())
  );

grant all on public.ally_sale_refunds to service_role;
grant select, insert on public.ally_sale_refunds to authenticated;

create index if not exists idx_ally_sale_refunds_sale_id on public.ally_sale_refunds(sale_id);


-- ================================================
-- 6. Brand columns
-- ================================================
alter table public.allies
  add column if not exists brand text not null default '1NRI'
  check (brand in ('1NRI', 'Unlikely Alliances'));

alter table public.ally_sales
  add column if not exists brand text not null default '1NRI';


-- ================================================
-- 7. Ally Logins table (session audit log)
-- ================================================
create table if not exists public.ally_logins (
  id             uuid        default gen_random_uuid() primary key,
  ally_id        uuid        not null references public.allies(id) on delete cascade,
  logged_in_at   timestamptz not null default now(),
  logged_out_at  timestamptz,
  logout_reason  text check (logout_reason in ('manual', 'inactivity', 'force_logout', 'session_expired'))
);

create index if not exists idx_ally_logins_ally_id       on public.ally_logins (ally_id);
create index if not exists idx_ally_logins_logged_in_at  on public.ally_logins (logged_in_at desc);
create index if not exists idx_ally_logins_open_sessions on public.ally_logins (ally_id) where logged_out_at is null;

alter table public.ally_logins enable row level security;

-- No public policies — all access goes through service role key
grant all on public.ally_logins to service_role;


-- ================================================
-- NOTE: Customer search (profiles table)
-- ================================================
-- The allies app searches the profiles table to find existing customers
-- when recording a sale. The profiles RLS policy only allows users to
-- select their own profile (auth.uid() = id), which would block ally
-- searches for other customers.
--
-- Resolution: customer search is handled via a server action that uses
-- the service role key, bypassing RLS. No additional policy changes are
-- needed on the profiles table.
--
-- The ally_sales table stores customer data denormalized
-- (customer_name, customer_email, customer_phone) so customer records
-- in the customers view are always sourced from ally_sales directly,
-- not from profiles.


