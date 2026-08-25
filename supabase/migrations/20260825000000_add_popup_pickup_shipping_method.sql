-- Free collection at the next pop-up, offered at checkout for pre-order carts.
-- Pre-orders need a few days' preparation, so the option rolls to the following
-- week's pop-up once this week's lead-time window has closed.
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_shipping_method_check;
ALTER TABLE orders
  ADD CONSTRAINT orders_shipping_method_check
  CHECK (shipping_method IN ('standard', 'express', 'popup_pickup'));

ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_date date;

COMMENT ON COLUMN orders.shipping_method IS
  'Checkout fulfilment tier: standard, express, or popup_pickup. Express orders placed before 3PM GMT ship same day. popup_pickup is always free and is collected in person at the pop-up in pickup_date.';

COMMENT ON COLUMN orders.pickup_date IS
  'For shipping_method = popup_pickup: the pop-up date the customer collects at, resolved server-side at order creation.';
