-- Pop-up Sales: extra fields for discount, hold, customer email, and split payments

-- ─── Extra columns on popup_orders ───────────────────────────────────────────

ALTER TABLE popup_orders
  ADD COLUMN IF NOT EXISTS customer_email      TEXT,
  ADD COLUMN IF NOT EXISTS discount_type       TEXT CHECK (discount_type IN ('none', 'percentage', 'fixed')) DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS discount_amount     NUMERIC(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_reason     TEXT,
  ADD COLUMN IF NOT EXISTS hold_duration_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS hold_note           TEXT;

-- ─── Split payments table ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS popup_split_payments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          UUID NOT NULL REFERENCES popup_orders(id) ON DELETE CASCADE,
  method            popup_payment_method NOT NULL,
  amount            NUMERIC(10, 2) NOT NULL,
  network           TEXT,                   -- mtn | telecel | airteltigo
  phone             TEXT,
  reference         TEXT,
  bank_name         TEXT,
  sent_to_paystack  BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE popup_split_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin roles can read popup_split_payments"
  ON popup_split_payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'staff')
    )
  );

CREATE POLICY "Admin roles can manage popup_split_payments"
  ON popup_split_payments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'staff')
    )
  );

GRANT ALL ON TABLE popup_split_payments TO anon, authenticated, service_role;
