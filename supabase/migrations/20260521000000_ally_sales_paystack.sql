-- Add Paystack payment tracking columns to ally_sales
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


-- Ally sale refunds table
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
