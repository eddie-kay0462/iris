-- Link online pre-orders back to the order they were paid through.
--
-- Pre-orders now ride the normal checkout flow: a single `orders` row acts as the
-- payment + shipping container, while out-of-stock-but-preorderable lines are
-- recorded in `preorders`. This column ties those pre-order rows to their order so
-- payment confirmation, shipping details, and admin views can join the two.
-- Nullable: popup pre-orders and legacy online pre-orders keep order_id = NULL.

ALTER TABLE preorders
  ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_preorders_order_id ON preorders(order_id);
