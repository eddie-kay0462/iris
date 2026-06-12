create table checkout_sessions (
  id            uuid primary key default gen_random_uuid(),
  session_id    text not null,
  visitor_id    text,
  user_id       uuid references profiles(id) on delete set null,
  email         text,
  phone         text,
  customer_name text,
  -- [{ productId, variantId, productName, variantTitle, sku, quantity, unitPrice, lineTotal, imageUrl }]
  items         jsonb not null default '[]'::jsonb,
  subtotal      numeric(10,2),
  status        text not null default 'open' check (status in ('open','completed','recovered')),
  order_id      uuid,
  completed_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- One live checkout per browsing session; completed rows are kept for history.
create unique index checkout_sessions_open_session
  on checkout_sessions (session_id) where status = 'open';
create index on checkout_sessions (updated_at);
create index on checkout_sessions (email);

-- Backend service-role access only.
alter table checkout_sessions enable row level security;
