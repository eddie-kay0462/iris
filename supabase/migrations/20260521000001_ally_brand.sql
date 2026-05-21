-- Add brand column to allies table
alter table public.allies
  add column if not exists brand text not null default '1NRI'
  check (brand in ('1NRI', 'Unlikely Alliances'));

-- Add brand column to ally_sales (denormalized from ally at time of sale)
alter table public.ally_sales
  add column if not exists brand text not null default '1NRI';
