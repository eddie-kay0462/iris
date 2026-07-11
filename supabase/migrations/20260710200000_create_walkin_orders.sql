-- Walk-in Sales: in-person HQ orders (event-independent).
-- Mirrors pop-up sales but with no popup_event dependency. Backend uses the
-- service role (bypasses RLS); the policies below protect direct client access.

-- Walk-in orders
CREATE TABLE walkin_orders (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number        TEXT NOT NULL UNIQUE, -- WLK-YYYY-XXXX
  customer_name       TEXT,
  customer_phone      TEXT,
  customer_email      TEXT,
  customer_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  served_by           UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status              TEXT NOT NULL DEFAULT 'completed'
                        CHECK (status IN ('completed', 'awaiting_payment', 'on_hold', 'cancelled', 'refunded')),
  payment_method      TEXT CHECK (payment_method IN ('cash', 'momo', 'bank_transfer')),
  payment_reference   TEXT,
  subtotal            NUMERIC(12, 2) NOT NULL DEFAULT 0,
  discount_type       TEXT NOT NULL DEFAULT 'none' CHECK (discount_type IN ('none', 'percentage', 'fixed')),
  discount_amount     NUMERIC(12, 2) NOT NULL DEFAULT 0,
  discount_reason     TEXT,
  total               NUMERIC(12, 2) NOT NULL DEFAULT 0,
  notes               TEXT,
  brand               TEXT NOT NULL DEFAULT '1NRI',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Walk-in order items
CREATE TABLE walkin_order_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  walkin_order_id UUID NOT NULL REFERENCES walkin_orders(id) ON DELETE CASCADE,
  product_id      UUID REFERENCES products(id) ON DELETE SET NULL,
  variant_id      UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  product_name    TEXT NOT NULL,
  variant_title   TEXT,
  sku             TEXT,
  quantity        INTEGER NOT NULL DEFAULT 1,
  unit_price      NUMERIC(12, 2) NOT NULL,
  total_price     NUMERIC(12, 2) NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_walkin_order_items_order ON walkin_order_items(walkin_order_id);
CREATE INDEX idx_walkin_orders_created_at ON walkin_orders(created_at DESC);

-- Auto-update updated_at on walkin_orders
CREATE OR REPLACE FUNCTION update_walkin_orders_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_walkin_orders_updated_at
  BEFORE UPDATE ON walkin_orders
  FOR EACH ROW EXECUTE FUNCTION update_walkin_orders_updated_at();

-- RLS: only admin roles can access these tables directly
ALTER TABLE walkin_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE walkin_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin roles can read walkin_orders"
  ON walkin_orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'staff')
    )
  );

CREATE POLICY "Admin roles can manage walkin_orders"
  ON walkin_orders FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'staff')
    )
  );

CREATE POLICY "Admin roles can read walkin_order_items"
  ON walkin_order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'staff')
    )
  );

CREATE POLICY "Admin roles can manage walkin_order_items"
  ON walkin_order_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'staff')
    )
  );

-- Grant table access to PostgREST roles
GRANT ALL ON TABLE walkin_orders TO anon, authenticated, service_role;
GRANT ALL ON TABLE walkin_order_items TO anon, authenticated, service_role;

-- Extend the preorders source whitelist so out-of-stock walk-in items can reuse
-- the existing pre-order engine (notifications, FIFO restock, Road-to-HQ counting).
ALTER TABLE preorders DROP CONSTRAINT IF EXISTS preorders_source_check;
ALTER TABLE preorders ADD CONSTRAINT preorders_source_check
  CHECK (source IN ('online', 'popup', 'walkin'));
