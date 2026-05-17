CREATE TYPE public.promo_discount_type AS ENUM (
  'fixed',
  'percentage',
  'free_shipping',
  'product'
);

CREATE TABLE IF NOT EXISTS public.promo_codes (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                   TEXT NOT NULL,
  description            TEXT,
  discount_type          public.promo_discount_type NOT NULL,
  discount_value         NUMERIC(10,2) NOT NULL DEFAULT 0,
  applicable_product_ids UUID[] DEFAULT NULL,
  min_order_amount       NUMERIC(10,2) DEFAULT NULL,
  max_discount_amount    NUMERIC(10,2) DEFAULT NULL,
  max_uses               INTEGER DEFAULT NULL,
  used_count             INTEGER NOT NULL DEFAULT 0,
  starts_at              TIMESTAMPTZ DEFAULT NULL,
  expires_at             TIMESTAMPTZ DEFAULT NULL,
  is_active              BOOLEAN NOT NULL DEFAULT true,
  created_by             UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT promo_codes_code_unique UNIQUE (code),
  CONSTRAINT promo_codes_discount_value_check CHECK (discount_value >= 0),
  CONSTRAINT promo_codes_used_count_check CHECK (used_count >= 0)
);

CREATE INDEX idx_promo_codes_code ON public.promo_codes (UPPER(code));
CREATE INDEX idx_promo_codes_is_active ON public.promo_codes (is_active);

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON public.promo_codes
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "admin_read" ON public.promo_codes
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'manager', 'staff')
  ));

CREATE POLICY "admin_write" ON public.promo_codes
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'manager')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'manager')
  ));

CREATE POLICY "public_read_active" ON public.promo_codes
  FOR SELECT TO anon, authenticated
  USING (is_active = true);
