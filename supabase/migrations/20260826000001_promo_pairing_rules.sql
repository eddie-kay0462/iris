-- Pairing rules: the configuration behind the 'pairing' discount type.
--
-- A pairing rule names one anchor product. When that product is in a cart, the
-- rule counts the OTHER items alongside it and applies the highest tier whose
-- threshold that count satisfies. Two knobs are chosen per rule:
--   pairing_basis = 'units'    → sum the quantity of every non-anchor line
--                   'products' → count distinct non-anchor products
--   applies_to    = 'anchor'   → discount the anchor's line total
--                   'cart'     → discount the whole subtotal
--
-- Pairing rules auto-apply, so they carry no customer-facing code. `channels`
-- gates every promo (code or rule) to the sales channels it may be used on.

ALTER TABLE public.promo_codes
  ADD COLUMN IF NOT EXISTS auto_apply        BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS anchor_product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS pairing_basis     TEXT CHECK (pairing_basis IN ('units', 'products')),
  ADD COLUMN IF NOT EXISTS applies_to        TEXT CHECK (applies_to IN ('anchor', 'cart')),
  ADD COLUMN IF NOT EXISTS channels          TEXT[] NOT NULL DEFAULT ARRAY['online', 'popup', 'walkin'];

COMMENT ON COLUMN public.promo_codes.auto_apply IS
  'Rule fires on its own with no code typed. True for every pairing rule.';
COMMENT ON COLUMN public.promo_codes.anchor_product_id IS
  'Pairing rules only: the product that must be present for the rule to fire.';
COMMENT ON COLUMN public.promo_codes.pairing_basis IS
  'Pairing rules only: units = sum of non-anchor quantities, products = distinct non-anchor products.';
COMMENT ON COLUMN public.promo_codes.applies_to IS
  'Pairing rules only: anchor = discount the anchor line, cart = discount the whole subtotal.';
COMMENT ON COLUMN public.promo_codes.channels IS
  'Sales channels this promo may be applied on: online, popup, walkin.';

-- Auto-applied rules have no code, so `code` can no longer be NOT NULL. Swap the
-- table constraint for a partial unique index, which also makes the uniqueness
-- case-insensitive to match how the code is looked up.
ALTER TABLE public.promo_codes ALTER COLUMN code DROP NOT NULL;
ALTER TABLE public.promo_codes DROP CONSTRAINT IF EXISTS promo_codes_code_unique;
CREATE UNIQUE INDEX IF NOT EXISTS promo_codes_code_unique
  ON public.promo_codes (UPPER(code)) WHERE code IS NOT NULL;

-- A code-bearing promo must have a code; a pairing rule must have an anchor.
ALTER TABLE public.promo_codes DROP CONSTRAINT IF EXISTS promo_codes_shape_check;
ALTER TABLE public.promo_codes ADD CONSTRAINT promo_codes_shape_check CHECK (
  (discount_type = 'pairing' AND anchor_product_id IS NOT NULL AND auto_apply = true)
  OR (discount_type <> 'pairing' AND code IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS public.promo_pairing_tiers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id       UUID NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  min_paired_count    INTEGER NOT NULL CHECK (min_paired_count >= 1),
  value_type          TEXT NOT NULL CHECK (value_type IN ('percentage', 'fixed')),
  value               NUMERIC(10,2) NOT NULL CHECK (value >= 0),
  max_discount_amount NUMERIC(10,2),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT promo_pairing_tiers_threshold_unique UNIQUE (promo_code_id, min_paired_count)
);

COMMENT ON COLUMN public.promo_pairing_tiers.min_paired_count IS
  'Fires when the paired count is at least this. The highest satisfied tier wins.';

CREATE INDEX IF NOT EXISTS idx_promo_pairing_tiers_promo
  ON public.promo_pairing_tiers (promo_code_id, min_paired_count DESC);
CREATE INDEX IF NOT EXISTS idx_promo_codes_anchor_product
  ON public.promo_codes (anchor_product_id) WHERE anchor_product_id IS NOT NULL;

ALTER TABLE public.promo_pairing_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON public.promo_pairing_tiers
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "admin_read" ON public.promo_pairing_tiers
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'manager', 'staff')
  ));

CREATE POLICY "admin_write" ON public.promo_pairing_tiers
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'manager')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'manager')
  ));

GRANT ALL ON TABLE public.promo_pairing_tiers TO anon, authenticated, service_role;

-- The existing public_read_active policy handed every active promo — its rules,
-- caps and limits — to any anonymous client. Validation has always been a
-- backend call, so nothing reads this from the browser; narrow it so pairing
-- rules and auto-apply rules are not browsable either.
DROP POLICY IF EXISTS "public_read_active" ON public.promo_codes;
CREATE POLICY "public_read_active" ON public.promo_codes
  FOR SELECT TO anon, authenticated
  USING (is_active = true AND code IS NOT NULL AND auto_apply = false);
