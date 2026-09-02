-- Volume rules: the configuration behind the 'volume' discount type.
--
-- A volume rule names no anchor. It counts the individual units in the cart —
-- three of the same product counts as three — and applies the highest tier whose
-- threshold that count satisfies. Two existing columns carry the whole shape:
--   applicable_product_ids  NULL → count the whole cart
--                           set  → count only lines for those products
--   auto_apply              true  → fires on its own, carries no code
--                           false → the customer must type a code
--
-- The discount always applies to the cart subtotal; a product restriction
-- narrows what *counts*, not what is *discounted*.
--
-- Tiers are shared with pairing rules: promo_pairing_tiers.min_paired_count is
-- read as "minimum qualifying count" for a volume rule.

-- Three arms now. A volume rule that auto-applies must carry no code, because
-- the engine rejects any auto rule typed as a code.
ALTER TABLE public.promo_codes DROP CONSTRAINT IF EXISTS promo_codes_shape_check;
ALTER TABLE public.promo_codes ADD CONSTRAINT promo_codes_shape_check CHECK (
  (discount_type = 'pairing' AND anchor_product_id IS NOT NULL AND auto_apply = true)
  OR (discount_type = 'volume' AND (
        (auto_apply = true  AND code IS NULL)
     OR (auto_apply = false AND code IS NOT NULL)
  ))
  OR (discount_type NOT IN ('pairing', 'volume') AND code IS NOT NULL)
);

COMMENT ON COLUMN public.promo_codes.auto_apply IS
  'Rule fires on its own with no code typed. Always true for pairing rules; admin-chosen per volume rule.';
COMMENT ON COLUMN public.promo_codes.applicable_product_ids IS
  'product discounts: the products the discount applies to. volume rules: the products whose units are counted — NULL counts the whole cart.';

COMMENT ON COLUMN public.promo_pairing_tiers.min_paired_count IS
  'Fires when the qualifying count is at least this — paired items for a pairing rule, cart units for a volume rule. The highest satisfied tier wins.';

-- An auto volume rule matches any cart, so it cannot be prefiltered by product.
-- This keeps the per-resolve lookup off a sequential scan.
CREATE INDEX IF NOT EXISTS idx_promo_codes_volume_auto
  ON public.promo_codes (discount_type)
  WHERE discount_type = 'volume' AND auto_apply = true AND is_active = true;

ALTER TABLE public.promo_redemptions DROP CONSTRAINT IF EXISTS promo_redemptions_source_check;
ALTER TABLE public.promo_redemptions ADD CONSTRAINT promo_redemptions_source_check
  CHECK (source IN ('code', 'pairing', 'volume', 'manual'));

ALTER TABLE public.walkin_orders DROP CONSTRAINT IF EXISTS walkin_orders_discount_type_check;
ALTER TABLE public.walkin_orders ADD CONSTRAINT walkin_orders_discount_type_check
  CHECK (discount_type IN ('none', 'percentage', 'fixed', 'code', 'pairing', 'volume'));

ALTER TABLE public.popup_orders DROP CONSTRAINT IF EXISTS popup_orders_discount_type_check;
ALTER TABLE public.popup_orders ADD CONSTRAINT popup_orders_discount_type_check
  CHECK (discount_type IN ('none', 'percentage', 'fixed', 'code', 'pairing', 'volume'));

COMMENT ON COLUMN public.walkin_orders.discount_type IS
  'code / pairing / volume = resolved by the discount engine. percentage / fixed = manual staff override. See promo_redemptions for the full trail.';
COMMENT ON COLUMN public.popup_orders.discount_type IS
  'code / pairing / volume = resolved by the discount engine. percentage / fixed = manual staff override. See promo_redemptions for the full trail.';
