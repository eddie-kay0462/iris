CREATE TABLE IF NOT EXISTS public.store_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.store_settings (key, value)
VALUES (
  'shipping_options',
  '[
    {"id": "standard", "label": "No rush shipping", "estimate": "5-7 business days", "price": 40},
    {"id": "express",  "label": "Express",           "estimate": "2-3 business days",  "price": 68}
  ]'::jsonb
)
ON CONFLICT (key) DO NOTHING;
