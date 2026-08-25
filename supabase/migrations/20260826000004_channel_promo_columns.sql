-- Bring the two POS channels up to parity with the storefront so a promo code
-- means the same thing whether it is typed at checkout or read off a phone at
-- the HQ counter.
--
-- Until now walkin_orders and popup_orders only carried a free-form
-- discount_type of 'none' | 'percentage' | 'fixed' resolved in the browser,
-- with no link back to the promo that produced it. Two new members record where
-- a discount came from: 'code' (a promo code was applied) and 'pairing' (an
-- automatic bundle rule fired). The old three stay as the manual staff override.

ALTER TABLE public.walkin_orders
  ADD COLUMN IF NOT EXISTS applied_promo_code_id UUID REFERENCES public.promo_codes(id) ON DELETE SET NULL;
ALTER TABLE public.popup_orders
  ADD COLUMN IF NOT EXISTS applied_promo_code_id UUID REFERENCES public.promo_codes(id) ON DELETE SET NULL;

ALTER TABLE public.walkin_orders DROP CONSTRAINT IF EXISTS walkin_orders_discount_type_check;
ALTER TABLE public.walkin_orders ADD CONSTRAINT walkin_orders_discount_type_check
  CHECK (discount_type IN ('none', 'percentage', 'fixed', 'code', 'pairing'));

ALTER TABLE public.popup_orders DROP CONSTRAINT IF EXISTS popup_orders_discount_type_check;
ALTER TABLE public.popup_orders ADD CONSTRAINT popup_orders_discount_type_check
  CHECK (discount_type IN ('none', 'percentage', 'fixed', 'code', 'pairing'));

COMMENT ON COLUMN public.walkin_orders.discount_type IS
  'code / pairing = resolved by the discount engine. percentage / fixed = manual staff override. See promo_redemptions for the full trail.';
COMMENT ON COLUMN public.popup_orders.discount_type IS
  'code / pairing = resolved by the discount engine. percentage / fixed = manual staff override. See promo_redemptions for the full trail.';

CREATE INDEX IF NOT EXISTS idx_walkin_orders_promo
  ON public.walkin_orders (applied_promo_code_id) WHERE applied_promo_code_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_popup_orders_promo
  ON public.popup_orders (applied_promo_code_id) WHERE applied_promo_code_id IS NOT NULL;
