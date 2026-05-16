ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS applied_promo_code_id UUID REFERENCES public.promo_codes(id) ON DELETE SET NULL;
