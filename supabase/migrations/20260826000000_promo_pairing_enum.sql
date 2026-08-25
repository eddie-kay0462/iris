-- Adds the 'pairing' discount type: an anchor product whose discount level
-- depends on how many OTHER items ride along in the same cart.
--
-- This lives in its own migration on purpose. Postgres will not let a new enum
-- value be referenced in the same transaction that adds it, and `supabase db
-- push` wraps each migration file in a transaction — so the ADD VALUE must
-- commit before 20260826000001 can write a CHECK or default that uses it.

ALTER TYPE public.promo_discount_type ADD VALUE IF NOT EXISTS 'pairing';
