-- Persist the checkout shipping tier on the order so fulfilment can prioritise
-- express deliveries. Express orders paid before 3PM GMT (Ghana time) ship the
-- same day — the staff fulfilment email highlights this.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS shipping_method text NOT NULL DEFAULT 'standard'
  CHECK (shipping_method IN ('standard', 'express'));

COMMENT ON COLUMN orders.shipping_method IS
  'Checkout shipping tier: standard or express. Express orders placed before 3PM GMT ship same day.';
