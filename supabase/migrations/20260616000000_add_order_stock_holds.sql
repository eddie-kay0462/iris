ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS hold_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS hold_refreshed BOOLEAN NOT NULL DEFAULT false;

INSERT INTO public.store_settings (key, value)
VALUES ('stock_hold_minutes', '10'::jsonb)
ON CONFLICT (key) DO NOTHING;
