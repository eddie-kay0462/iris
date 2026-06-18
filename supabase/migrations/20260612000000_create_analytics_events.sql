create table analytics_events (
  id           uuid primary key default gen_random_uuid(),
  session_id   text not null,
  visitor_id   text,
  event_type   text not null check (event_type in
               ('page_view','product_view','add_to_cart','checkout_started','purchase')),
  path         text,
  referrer     text,
  landing_page text,
  device_type  text check (device_type in ('mobile','tablet','desktop')),
  user_id      uuid references profiles(id) on delete set null,
  product_id   uuid,
  order_id     uuid,
  value        numeric(10,2),
  metadata     jsonb,
  created_at   timestamptz not null default now()
);

create index on analytics_events (created_at);
create index on analytics_events (event_type, created_at);
create index on analytics_events (session_id, created_at);

-- No anon/authenticated policies: reads and writes go exclusively
-- through the backend service-role client.
alter table analytics_events enable row level security;
