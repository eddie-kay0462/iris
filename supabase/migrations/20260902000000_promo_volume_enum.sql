-- Adds the 'volume' discount type: a tiered discount driven purely by how many
-- individual items are in the cart, with no anchor product. Three of the same
-- product counts as three.
--
-- This lives in its own migration on purpose. Postgres will not let a new enum
-- value be referenced in the same transaction that adds it, and `supabase db
-- push` wraps each migration file in a transaction — so the ADD VALUE must
-- commit before 20260902000001 can write a CHECK that uses it.

ALTER TYPE public.promo_discount_type ADD VALUE IF NOT EXISTS 'volume';
