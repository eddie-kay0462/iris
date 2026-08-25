-- The redemption ledger: one row per discount applied on any sales channel.
--
-- Before this table the only trace of a redemption was promo_codes.used_count,
-- an integer bumped fire-and-forget after payment. That could not answer who
-- redeemed what, on which channel, against which order, or for how much — and
-- it leaked counts on failure and never gave one back on refund.
--
-- Rows here cover code redemptions, auto-fired pairing rules, AND free-form
-- manual staff discounts (promo_code_id NULL, source 'manual'), so every cedi
-- discounted anywhere in the business is attributable.

CREATE TABLE IF NOT EXISTS public.promo_redemptions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id       UUID REFERENCES public.promo_codes(id) ON DELETE SET NULL,
  source              TEXT NOT NULL CHECK (source IN ('code', 'pairing', 'manual')),
  channel             TEXT NOT NULL CHECK (channel IN ('online', 'popup', 'walkin')),
  order_table         TEXT NOT NULL CHECK (order_table IN ('orders', 'popup_orders', 'walkin_orders')),
  order_id            UUID NOT NULL,
  order_number        TEXT,

  -- Snapshots so the log stays readable after a promo is edited or deleted.
  code_snapshot       TEXT,
  discount_type       TEXT,
  rule_snapshot       JSONB,
  breakdown           JSONB,

  subtotal            NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount     NUMERIC(12,2) NOT NULL DEFAULT 0,

  customer_email      TEXT,
  customer_phone      TEXT,
  customer_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  applied_by          UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'confirmed', 'reverted')),
  confirmed_at        TIMESTAMPTZ,
  reverted_at         TIMESTAMPTZ,
  revert_reason       TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN public.promo_redemptions.rule_snapshot IS
  'The promo as it stood at redemption, including the matched pairing tier and paired count.';
COMMENT ON COLUMN public.promo_redemptions.breakdown IS
  'Every candidate considered: the typed code, each pairing rule, any manual override, which won, and why each other lost.';
COMMENT ON COLUMN public.promo_redemptions.applied_by IS
  'Staff member who rang up the sale. NULL for storefront self-service.';
COMMENT ON COLUMN public.promo_redemptions.status IS
  'pending = order placed, not yet paid. confirmed = counted against max_uses. reverted = cancelled or refunded, use returned.';

-- One live redemption per order. Reverted rows are excluded so an order whose
-- discount is edited (pop-up) can be re-reserved without tripping the index.
CREATE UNIQUE INDEX IF NOT EXISTS idx_promo_redemptions_one_live_per_order
  ON public.promo_redemptions (order_table, order_id) WHERE status <> 'reverted';
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_promo_status
  ON public.promo_redemptions (promo_code_id, status);
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_created_at
  ON public.promo_redemptions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_channel
  ON public.promo_redemptions (channel, created_at DESC);

ALTER TABLE public.promo_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON public.promo_redemptions
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "admin_read" ON public.promo_redemptions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'manager', 'staff')
  ));

GRANT ALL ON TABLE public.promo_redemptions TO anon, authenticated, service_role;
