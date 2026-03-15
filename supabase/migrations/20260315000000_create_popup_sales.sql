-- Pop-up Sales: events, orders, and order items

-- Enum for event status
CREATE TYPE popup_event_status AS ENUM ('draft', 'active', 'closed');

-- Enum for order status
CREATE TYPE popup_order_status AS ENUM ('active', 'awaiting_payment', 'confirmed', 'completed', 'on_hold', 'cancelled');

-- Enum for payment method
CREATE TYPE popup_payment_method AS ENUM ('cash', 'momo', 'bank_transfer');

-- Pop-up events (sessions)
CREATE TABLE popup_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  description   TEXT,
  location      TEXT,
  event_date    DATE,
  status        popup_event_status NOT NULL DEFAULT 'draft',
  created_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pop-up orders
CREATE TABLE popup_orders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id          UUID NOT NULL REFERENCES popup_events(id) ON DELETE CASCADE,
  order_number      TEXT NOT NULL UNIQUE, -- POP-YYYY-XXXX
  customer_name     TEXT,
  customer_phone    TEXT,
  served_by         UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status            popup_order_status NOT NULL DEFAULT 'active',
  payment_method    popup_payment_method,
  payment_reference TEXT,
  subtotal          NUMERIC(10, 2) NOT NULL DEFAULT 0,
  total             NUMERIC(10, 2) NOT NULL DEFAULT 0,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pop-up order items
CREATE TABLE popup_order_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID NOT NULL REFERENCES popup_orders(id) ON DELETE CASCADE,
  product_id    UUID REFERENCES products(id) ON DELETE SET NULL,
  variant_id    UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  product_name  TEXT NOT NULL,
  variant_title TEXT,
  sku           TEXT,
  quantity      INTEGER NOT NULL DEFAULT 1,
  unit_price    NUMERIC(10, 2) NOT NULL,
  total_price   NUMERIC(10, 2) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-update updated_at on popup_events
CREATE OR REPLACE FUNCTION update_popup_events_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_popup_events_updated_at
  BEFORE UPDATE ON popup_events
  FOR EACH ROW EXECUTE FUNCTION update_popup_events_updated_at();

-- Auto-update updated_at on popup_orders
CREATE OR REPLACE FUNCTION update_popup_orders_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_popup_orders_updated_at
  BEFORE UPDATE ON popup_orders
  FOR EACH ROW EXECUTE FUNCTION update_popup_orders_updated_at();

-- RLS: only admin roles can access these tables
ALTER TABLE popup_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE popup_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE popup_order_items ENABLE ROW LEVEL SECURITY;

-- Backend uses service role (bypasses RLS), these policies protect direct client access
CREATE POLICY "Admin roles can read popup_events"
  ON popup_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'staff')
    )
  );

CREATE POLICY "Admin roles can manage popup_events"
  ON popup_events FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admin roles can read popup_orders"
  ON popup_orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'staff')
    )
  );

CREATE POLICY "Admin roles can manage popup_orders"
  ON popup_orders FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'staff')
    )
  );

CREATE POLICY "Admin roles can read popup_order_items"
  ON popup_order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'staff')
    )
  );

CREATE POLICY "Admin roles can manage popup_order_items"
  ON popup_order_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'staff')
    )
  );

-- Grant table access to PostgREST roles
GRANT ALL ON TABLE popup_events TO anon, authenticated, service_role;
GRANT ALL ON TABLE popup_orders TO anon, authenticated, service_role;
GRANT ALL ON TABLE popup_order_items TO anon, authenticated, service_role;
