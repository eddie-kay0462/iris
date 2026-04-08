-- Add per-ally commission quota override (null = use global default)
ALTER TABLE allies
  ADD COLUMN IF NOT EXISTS commission_quota numeric(12,2) DEFAULT NULL;

-- Global commission settings (single-row config table)
CREATE TABLE IF NOT EXISTS commission_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  default_quota  numeric(12,2) NOT NULL DEFAULT 0,    -- 0 = no quota, commission from first sale
  default_rate   numeric(5,4)  NOT NULL DEFAULT 0.15, -- decimal e.g. 0.15 = 15%
  period         text          NOT NULL DEFAULT 'monthly' CHECK (period IN ('monthly', 'all_time')),
  updated_at     timestamptz   NOT NULL DEFAULT now()
);

-- Seed one row if the table is empty
INSERT INTO commission_settings (default_quota, default_rate, period)
SELECT 0, 0.15, 'monthly'
WHERE NOT EXISTS (SELECT 1 FROM commission_settings);

-- Allow service-role (admin server actions) to read/write
GRANT ALL ON commission_settings TO service_role;

-- Allow authenticated users (allies app) to read settings
GRANT SELECT ON commission_settings TO authenticated;
