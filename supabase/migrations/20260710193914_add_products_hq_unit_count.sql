-- Bundle products count for more than one unit toward the Road to HQ goal.
-- `hq_unit_count` = how many units each sold unit of this product contributes to
-- the public Road to HQ counter. Regular products stay at 1 and behave as before.
-- This multiplier is used ONLY by AnalyticsService.getRoadToHq(); all other unit,
-- sales, and inventory figures keep counting real line-item quantities.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS hq_unit_count integer NOT NULL DEFAULT 1;

ALTER TABLE public.products
  ADD CONSTRAINT products_hq_unit_count_check CHECK (hq_unit_count >= 1);
